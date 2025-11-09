from __future__ import annotations
import sys
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import ssl
import socket

# Ensure correct event loop policy EARLY before psycopg engine creation
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore[attr-defined]
    except Exception:
        pass

_settings = get_settings()

# Expect DATABASE_URL in form: postgresql://user:pass@host:port/db
# Use psycopg3 async driver to avoid PgBouncer prepared statement issues
def _to_async_url(url: str) -> str:
    if url.startswith("postgresql+psycopg://"):
        return url
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
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

def _ensure_sslmode(url: str) -> str:
    """Ensure sslmode=require is present in URL when SSL is needed (psycopg/libpq style)."""
    try:
        parsed = urlparse(url)
        q = parse_qs(parsed.query)
        if "sslmode" not in q:
            q["sslmode"] = ["require"]
        new_query = urlencode([(k, v0) for k, vals in q.items() for v0 in vals]) if q else ""
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
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
    # Not needed for psycopg; keep as no-op
    return url

if _DATABASE_URL:
    raw_url = _DATABASE_URL
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
    # Ensure SSL when required for Supabase (psycopg uses libpq sslmode)
    if _need_ssl(_DATABASE_URL):
        raw_url = _ensure_sslmode(raw_url)
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
    # Disable automatic server-side prepared statements (PgBouncer transaction pooling compatibility)
    connect_args: dict = {"prepare_threshold": None}
    print(f"[db] connect_args: (psycopg) {connect_args}")
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
