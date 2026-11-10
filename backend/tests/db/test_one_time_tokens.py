import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.auth.models import OneTimeToken, TokenPurpose
from tests.db.factories import expect_violation, make_user, token_hash


@pytest.mark.asyncio
async def test_one_time_token_can_be_created(session):
    user = make_user()
    session.add(user)
    await session.flush()

    now = datetime.now(UTC)
    digest = token_hash()

    token = OneTimeToken(
        user_id=user.id,
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash=digest,
        expires_at=now + timedelta(minutes=30),
    )

    session.add(token)
    await session.commit()

    result = await session.execute(select(OneTimeToken).where(OneTimeToken.token_hash == digest))
    saved_token = result.scalar_one()

    assert saved_token.user_id == user.id
    assert saved_token.purpose == TokenPurpose.PASSWORD_RESET.value
    assert saved_token.token_hash == digest
    assert saved_token.used_at is None
    assert saved_token.expires_at is not None


@pytest.mark.asyncio
async def test_one_time_token_rejects_invalid_hash_format(session):
    user = make_user()
    session.add(user)
    await session.flush()

    token = OneTimeToken(
        user_id=user.id,
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash="not-a-valid-sha256-hash",
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )

    session.add(token)

    await expect_violation(
        session,
        "ck_one_time_tokens_token_hash_format",
    )


@pytest.mark.asyncio
async def test_one_time_token_rejects_uppercase_hash(session):
    user = make_user()
    session.add(user)
    await session.flush()

    token = OneTimeToken(
        user_id=user.id,
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash="A" * 64,
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )

    session.add(token)

    await expect_violation(
        session,
        "ck_one_time_tokens_token_hash_format",
    )


@pytest.mark.asyncio
async def test_one_time_token_rejects_invalid_purpose(session):
    user = make_user()
    session.add(user)
    await session.flush()

    token = OneTimeToken(
        user_id=user.id,
        purpose="invalid_purpose",
        token_hash=token_hash(),
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )

    session.add(token)

    await expect_violation(
        session,
        "ck_one_time_tokens_purpose_valid",
    )


@pytest.mark.asyncio
async def test_one_time_token_hash_must_be_unique(session):
    user = make_user()
    session.add(user)
    await session.flush()

    digest = token_hash()
    expiry = datetime.now(UTC) + timedelta(minutes=30)

    first_token = OneTimeToken(
        user_id=user.id,
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash=digest,
        expires_at=expiry,
    )

    second_token = OneTimeToken(
        user_id=user.id,
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash=digest,
        expires_at=expiry,
    )

    session.add_all([first_token, second_token])

    await expect_violation(
        session,
        "uq_one_time_tokens_token_hash",
    )


@pytest.mark.asyncio
async def test_one_time_token_requires_existing_user(session):
    token = OneTimeToken(
        user_id=uuid.uuid4(),
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash=token_hash(),
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )

    session.add(token)

    await expect_violation(
        session,
        "fk_one_time_tokens_user_id_users",
    )


@pytest.mark.asyncio
async def test_deleting_user_cascades_to_one_time_tokens(session):
    user = make_user()
    session.add(user)
    await session.flush()

    token = OneTimeToken(
        user_id=user.id,
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash=token_hash(),
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )

    session.add(token)
    await session.commit()

    await session.delete(user)
    await session.commit()

    result = await session.execute(
        select(func.count()).select_from(OneTimeToken).where(OneTimeToken.user_id == user.id)
    )

    assert result.scalar_one() == 0


@pytest.mark.asyncio
async def test_used_one_time_token_can_be_stored(session):
    user = make_user()
    session.add(user)
    await session.flush()

    now = datetime.now(UTC)

    token = OneTimeToken(
        user_id=user.id,
        purpose=TokenPurpose.PASSWORD_RESET.value,
        token_hash=token_hash(),
        expires_at=now + timedelta(minutes=30),
        used_at=now,
    )

    session.add(token)
    await session.commit()

    result = await session.execute(select(OneTimeToken).where(OneTimeToken.user_id == user.id))
    saved_token = result.scalar_one()

    assert saved_token.used_at is not None
    assert saved_token.used_at.tzinfo is not None
