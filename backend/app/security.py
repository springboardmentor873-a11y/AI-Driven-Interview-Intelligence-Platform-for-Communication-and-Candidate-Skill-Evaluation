from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from .config import settings

ALGO = "HS256"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def _make_token(sub: str, token_type: str, delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": sub, "type": token_type, "iat": now, "exp": now + delta}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGO)


def create_access_token(user_id: int) -> str:
    return _make_token(str(user_id), "access", timedelta(minutes=settings.ACCESS_TOKEN_MINUTES))


def create_refresh_token(user_id: int) -> str:
    return _make_token(str(user_id), "refresh", timedelta(days=settings.REFRESH_TOKEN_DAYS))


def decode_token(token: str, expected_type: str) -> int:
    """Returns user id or raises jwt.PyJWTError."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("wrong token type")
    return int(payload["sub"])


def create_state_token() -> str:
    """Short-lived signed token used as the OAuth `state` (CSRF protection)."""
    return _make_token("0", "oauth_state", timedelta(minutes=10))
