"""Password hashing (Argon2id), JWT access tokens and opaque-token helpers.

All cryptography comes from argon2-cffi, PyJWT and the standard library; nothing is hand-rolled.
"""

import asyncio
import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.clock import utcnow
from app.core.config import Settings, get_settings
from app.core.exceptions import InvalidTokenError, TokenExpiredError

JWT_ALGORITHM = "HS256"  # pinned: never read from the token header or from configuration
ACCESS_TOKEN_TYPE = "access"  # noqa: S105 (token type label, not a secret)
_REQUIRED_CLAIMS = ["exp", "iat", "iss", "aud", "sub", "sid", "typ"]

# --------------------------------------------------------------------------- passwords


@lru_cache
def _hasher(time_cost: int, memory_cost_kib: int, parallelism: int) -> PasswordHasher:
    return PasswordHasher(
        time_cost=time_cost, memory_cost=memory_cost_kib, parallelism=parallelism, type=Type.ID
    )


def _current_hasher() -> PasswordHasher:
    s = get_settings()
    return _hasher(s.argon2_time_cost, s.argon2_memory_cost_kib, s.argon2_parallelism)


@lru_cache
def _dummy_hash(time_cost: int, memory_cost_kib: int, parallelism: int) -> str:
    return _hasher(time_cost, memory_cost_kib, parallelism).hash("dummy-password-for-timing")


def _hash_sync(password: str) -> str:
    return _current_hasher().hash(password)


def _verify_sync(password_hash: str, password: str) -> bool:
    try:
        return _current_hasher().verify(password_hash, password)
    except (VerificationError, InvalidHashError):  # mismatch or malformed stored hash
        return False


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(_hash_sync, password)  # CPU-heavy: keep off the event loop


async def verify_password(password_hash: str | None, password: str) -> bool:
    """Verify a password. With no stored hash, burn equivalent time and return False."""
    if password_hash is None:
        await verify_dummy(password)
        return False
    return await asyncio.to_thread(_verify_sync, password_hash, password)


async def verify_dummy(password: str) -> None:
    """Equalise timing for unknown accounts so response time doesn't reveal existence."""
    s = get_settings()
    dummy = _dummy_hash(s.argon2_time_cost, s.argon2_memory_cost_kib, s.argon2_parallelism)
    await asyncio.to_thread(_verify_sync, dummy, password)


def needs_rehash(password_hash: str) -> bool:
    return _current_hasher().check_needs_rehash(password_hash)


# --------------------------------------------------------------------------- opaque tokens


def new_opaque_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hex). Only the digest is ever stored."""
    raw = secrets.token_urlsafe(32)  # 256 bits from the OS CSPRNG
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


# --------------------------------------------------------------------------- JWT access tokens


@dataclass(frozen=True)
class AccessClaims:
    user_id: uuid.UUID
    session_id: uuid.UUID


def create_access_token(
    *, user_id: uuid.UUID, session_id: uuid.UUID, settings: Settings, now: datetime | None = None
) -> tuple[str, int]:
    """Return (jwt, expires_in_seconds). Claims carry identifiers only, never secrets or PII."""
    now = now or utcnow()
    ttl = timedelta(minutes=settings.access_token_ttl_minutes)
    claims = {
        "sub": str(user_id),
        "sid": str(session_id),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "exp": now + ttl,
        "typ": ACCESS_TOKEN_TYPE,
    }
    token = jwt.encode(claims, settings.jwt_secret_key.get_secret_value(), algorithm=JWT_ALGORITHM)
    return token, int(ttl.total_seconds())


def decode_access_token(token: str, settings: Settings) -> AccessClaims:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=[JWT_ALGORITHM],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": _REQUIRED_CLAIMS},
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError from exc
    except jwt.PyJWTError as exc:
        raise InvalidTokenError from exc
    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        raise InvalidTokenError
    try:
        return AccessClaims(uuid.UUID(payload["sub"]), uuid.UUID(payload["sid"]))
    except (ValueError, TypeError) as exc:
        raise InvalidTokenError from exc
