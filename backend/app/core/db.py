from __future__ import annotations
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import ssl
import socket

_settings = get_settings()

# Expect DATABASE_URL in form: postgresql://user:pass@host:port/db
# For async usage with SQLAlchemy, convert to asyncpg URL if needed
# postgres:// -> postgresql+asyncpg://
def _to_async_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

def _need_ssl(url: str) -> bool:
    try:
        u = urlparse(url)
        q = parse_qs(u.query or "")
        if q.get("ssl", ["false"])[:1][0].lower() in ("true", "1", "require"):
            return True
        if q.get("sslmode", [""])[:1][0].lower() in ("require", "verify-ca", "verify-full"):
            return True
        if (u.hostname or "").endswith("supabase.co"):
            # Supabase requires SSL by default
            return True
    except Exception:
        pass
    return False

def _sanitize_url(url: str) -> str:
    """Remove query params that asyncpg does not accept directly (e.g. sslmode) since
    asyncpg.connect() will raise 'unexpected keyword argument sslmode'. We map sslmode to ssl usage.
    """
    try:
        parsed = urlparse(url)
        q = parse_qs(parsed.query)
        # Drop sslmode / ssl params (we drive SSL via connect_args)
        q.pop("sslmode", None)
        q.pop("ssl", None)
        new_query = urlencode([(k, v0) for k, vals in q.items() for v0 in vals]) if q else ""
        sanitized = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
        return sanitized
    except Exception:
        return url

def _replace_host(url: str, new_host: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc
        userinfo = ""
        hostport = netloc
        if "@" in netloc:
            userinfo, hostport = netloc.split("@", 1)
        host = hostport
        port = ""
        if ":" in hostport:
            host, port = hostport.rsplit(":", 1)
        new_hostport = f"{new_host}:{port}" if port else new_host
        new_netloc = f"{userinfo}@{new_hostport}" if userinfo else new_hostport
        return urlunparse((parsed.scheme, new_netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
    except Exception:
        return url

_DATABASE_URL = _settings.database_url_direct or _settings.database_url
if _settings.database_url_direct:
    try:
        print("[db] Using direct database URL (bypassing PgBouncer)")
    except Exception:
        pass
engine = None
SessionLocal: sessionmaker[AsyncSession] | None = None

def _add_ps_cache_disable(url: str) -> str:
    """Append parameters to disable prepared statements under PgBouncer.
    For asyncpg, the critical flag is statement_cache_size=0. We also include
    prepared_statement_cache_size=0 for SQLAlchemy dialects that read it.
    """
    try:
        parsed = urlparse(url)
        q = parse_qs(parsed.query)
        # Ensure both keys are present in URL so either layer can pick them up
        if "statement_cache_size" not in q:
            q["statement_cache_size"] = ["0"]
        if "prepared_statement_cache_size" not in q:
            q["prepared_statement_cache_size"] = ["0"]
        new_query = urlencode([(k, v0) for k, vals in q.items() for v0 in vals]) if q else ""
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
    except Exception:
        return url

if _DATABASE_URL:
    raw_url = _sanitize_url(_DATABASE_URL)
    raw_url = _add_ps_cache_disable(raw_url)
    # Optional: resolve hostname to IPv4 address to bypass local DNS issues
    try:
        parsed_for_host = urlparse(raw_url)
        db_host = parsed_for_host.hostname or ""
        db_port = parsed_for_host.port or 5432
        print(f"[db] target host: {db_host}")
        if any(x in db_host for x in ("pooler", "pgbouncer", "pooling")):
            print("[db] Detected pooling/PgBouncer host. If you see DuplicatePreparedStatementError, set DATABASE_URL_DIRECT to bypass.")
        if getattr(_settings, "db_resolve_hostname", False) and db_host:
            infos = socket.getaddrinfo(db_host, db_port, family=socket.AF_INET, type=socket.SOCK_STREAM)
            if infos:
                ip = infos[0][4][0]
                print(f"[db] resolved {db_host} -> {ip}")
                raw_url = _replace_host(raw_url, ip)
    except Exception as _ex:
        print("[db] hostname resolution skipped/failed:", _ex)
    async_url = _to_async_url(raw_url)
    # Log which host we're connecting to and detect PgBouncer-like hosts
    try:
        _parsed = urlparse(_DATABASE_URL)
        _host = _parsed.hostname or ""
        print(f"[db] target host: {_host}")
        if any(x in _host for x in ("pooler", "pgbouncer", "pooling")):
            print("[db] Detected pooling/PgBouncer host. If you see DuplicatePreparedStatementError, set DATABASE_URL_DIRECT to bypass.")
    except Exception:
        pass
    connect_args: dict = {}
    if _need_ssl(_DATABASE_URL):
        ctx = ssl.create_default_context()
        if getattr(_settings, "db_disable_ssl_verify", False):
            try:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                print("[db] SSL verification disabled (development)")
            except Exception:
                pass
        connect_args["ssl"] = ctx
    # Disable asyncpg statement cache explicitly to support PgBouncer transaction/statement modes
    connect_args["statement_cache_size"] = 0  # asyncpg driver cache
    # Also set dialect-preferred prepared statement cache to 0 via URL; connect_args may ignore this
    connect_args.setdefault("prepared_statement_cache_size", 0)
    # Log connect_args of interest
    try:
        print(f"[db] connect_args: statement_cache_size={connect_args.get('statement_cache_size')} prepared_statement_cache_size={connect_args.get('prepared_statement_cache_size')}")
    except Exception:
        pass
    # Debug print of final URL parameters (safe: no password output) for verification
    try:
        parsed_dbg = urlparse(async_url)
        print(f"[db] async URL query params: {parsed_dbg.query}")
    except Exception:
        pass
    try:
        # Use NullPool when behind PgBouncer to avoid double-pooling and reduce prepared statement reuse risk
        from sqlalchemy.pool import NullPool
        engine = create_async_engine(
            async_url,
            future=True,
            echo=False,
            pool_pre_ping=True,
            poolclass=NullPool,
            connect_args=connect_args,
        )
        SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False, autocommit=False)
    except Exception as e:
        print("[db] Engine creation failed:", e)
        engine = None
        SessionLocal = None

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if SessionLocal is None:
        raise RuntimeError("Database not configured. Set database_url in .env")
    async with SessionLocal() as session:
        yield session
