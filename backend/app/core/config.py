from functools import lru_cache
try:
    from pydantic_settings import BaseSettings, SettingsConfigDict  # Pydantic v2 package
    _USE_SETTINGS_CONFIG = True
except ImportError:  # fallback if package not yet installed
    from pydantic import BaseSettings  # type: ignore
    SettingsConfigDict = None  # type: ignore
    _USE_SETTINGS_CONFIG = False

class Settings(BaseSettings):
    api_name: str = "Parking Predictive Marketplace API"
    api_version: str = "0.1.0"
    model_path: str = "backend/model/xgb_model_reduced.pkl"  # relative to project root
    jwt_secret: str = "dev_secret_change"  # replace with env var in production
    jwt_algo: str = "HS256"
    # Database & Kafka (set via .env)
    database_url: str | None = None  # e.g. postgres pooling URL from Supabase
    database_url_direct: str | None = None  # optional: direct (non-pooling) URL to bypass PgBouncer
    pg_force_simple: bool = False  # if true, attempt to force simple query mode (no prepares)
    db_resolve_hostname: bool = False  # if true, resolve DB hostname to IP before connect
    db_disable_ssl_verify: bool = False  # if true, disable SSL hostname verification (use with care)
    kafka_bootstrap_servers: str | None = None  # e.g. localhost:9092 or cloud brokers
    kafka_client_id: str = "parking-api"
    
    if _USE_SETTINGS_CONFIG:
        # Prefer backend/.env but allow project root .env as fallback
        model_config = SettingsConfigDict(
            env_file=("backend/.env", ".env"),
            extra="ignore",
            protected_namespaces=(),
        )
    else:
        class Config:
            env_file = "backend/.env"
            # Silence 'model_' protected namespace warnings in Pydantic v2 for fields like model_path
            protected_namespaces = ()

@lru_cache
def get_settings() -> Settings:
    return Settings()
