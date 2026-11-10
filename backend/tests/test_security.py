import uuid
from datetime import timedelta

import jwt
import pytest

from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.exceptions import InvalidTokenError, TokenExpiredError
from app.core.security import (
    ACCESS_TOKEN_TYPE,
    JWT_ALGORITHM,
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    needs_rehash,
    new_opaque_token,
    verify_password,
)


@pytest.mark.asyncio
async def test_password_hash_is_not_plaintext():
    password = "StrongPassword123!"

    password_hash = await hash_password(password)

    assert password_hash != password
    assert password_hash.startswith("$argon2id$")
    assert password not in password_hash


@pytest.mark.asyncio
async def test_password_verification_success():
    password = "StrongPassword123!"
    password_hash = await hash_password(password)

    assert await verify_password(password_hash, password)


@pytest.mark.asyncio
async def test_password_verification_rejects_wrong_password():
    password_hash = await hash_password("StrongPassword123!")

    assert not await verify_password(password_hash, "WrongPassword123!")


@pytest.mark.asyncio
async def test_password_verification_rejects_missing_hash():
    assert not await verify_password(None, "SomePassword123!")


@pytest.mark.asyncio
async def test_password_verification_rejects_malformed_hash():
    assert not await verify_password("not-a-valid-argon2-hash", "SomePassword123!")


@pytest.mark.asyncio
async def test_password_hash_uses_argon2id():
    password_hash = await hash_password("StrongPassword123!")

    assert "$argon2id$" in password_hash


def test_needs_rehash_returns_false_for_current_hash():
    from app.core.security import _current_hasher

    password_hash = _current_hasher().hash("StrongPassword123!")

    assert not needs_rehash(password_hash)


def test_opaque_token_is_random_and_stored_as_hash():
    raw_token, token_digest = new_opaque_token()

    assert raw_token
    assert len(raw_token) > 30
    assert len(token_digest) == 64
    assert token_digest == hash_token(raw_token)
    assert raw_token != token_digest


def test_opaque_tokens_are_unique():
    first_token, first_hash = new_opaque_token()
    second_token, second_hash = new_opaque_token()

    assert first_token != second_token
    assert first_hash != second_hash


def test_hash_token_is_deterministic():
    raw_token = "example-refresh-token"

    assert hash_token(raw_token) == hash_token(raw_token)


def test_access_token_creation_and_decoding():
    settings = get_settings()
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()

    token, expires_in = create_access_token(
        user_id=user_id,
        session_id=session_id,
        settings=settings,
    )

    claims = decode_access_token(token, settings)

    assert claims.user_id == user_id
    assert claims.session_id == session_id
    assert expires_in == settings.access_token_ttl_minutes * 60


def test_access_token_uses_expected_algorithm():
    settings = get_settings()

    token, _ = create_access_token(
        user_id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        settings=settings,
    )

    header = jwt.get_unverified_header(token)

    assert header["alg"] == JWT_ALGORITHM
    assert header["alg"] == "HS256"


def test_access_token_contains_required_claims():
    settings = get_settings()

    token, _ = create_access_token(
        user_id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        settings=settings,
    )

    payload = jwt.decode(
        token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[JWT_ALGORITHM],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )

    assert payload["typ"] == ACCESS_TOKEN_TYPE
    assert payload["iss"] == settings.jwt_issuer
    assert payload["aud"] == settings.jwt_audience
    assert "sub" in payload
    assert "sid" in payload
    assert "iat" in payload
    assert "exp" in payload


def test_expired_access_token_is_rejected():
    settings = get_settings()
    now = utcnow()

    token, _ = create_access_token(
        user_id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        settings=settings,
        now=now - timedelta(minutes=settings.access_token_ttl_minutes + 5),
    )

    with pytest.raises(TokenExpiredError):
        decode_access_token(token, settings)


def test_tampered_access_token_is_rejected():
    settings = get_settings()

    token, _ = create_access_token(
        user_id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        settings=settings,
    )

    tampered_token = token[:-5] + "abcde"

    with pytest.raises(InvalidTokenError):
        decode_access_token(tampered_token, settings)


def test_access_token_signed_with_wrong_secret_is_rejected():
    settings = get_settings()

    other_settings = settings.model_copy(
        update={
            "jwt_secret_key": type(settings.jwt_secret_key)("x" * 64),
        }
    )

    token, _ = create_access_token(
        user_id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        settings=other_settings,
    )

    with pytest.raises(InvalidTokenError):
        decode_access_token(token, settings)


def test_access_token_with_wrong_type_is_rejected():
    settings = get_settings()
    now = utcnow()

    payload = {
        "sub": str(uuid.uuid4()),
        "sid": str(uuid.uuid4()),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "exp": now + timedelta(minutes=10),
        "typ": "refresh",
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(InvalidTokenError):
        decode_access_token(token, settings)


def test_access_token_with_invalid_uuid_is_rejected():
    settings = get_settings()
    now = utcnow()

    payload = {
        "sub": "not-a-uuid",
        "sid": str(uuid.uuid4()),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "exp": now + timedelta(minutes=10),
        "typ": ACCESS_TOKEN_TYPE,
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(InvalidTokenError):
        decode_access_token(token, settings)
