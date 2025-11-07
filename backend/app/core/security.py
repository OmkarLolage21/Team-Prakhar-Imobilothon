import datetime as dt
from typing import Optional
import jwt
from .config import get_settings

settings = get_settings()

def create_jwt(subject: str, role: str = "driver", expires_minutes: int = 60) -> str:
    now = dt.datetime.utcnow()
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + dt.timedelta(minutes=expires_minutes)).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algo)
    return token

def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algo])
    except Exception:
        return None
