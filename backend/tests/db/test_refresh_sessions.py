import secrets
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import selectinload

from app.auth.models import RefreshSession, RevokeReason
from app.users.models import User
from tests.db.factories import expect_violation, make_refresh_session, make_user, token_hash


@pytest.fixture
async def user(session):
    u = make_user()
    session.add(u)
    await session.commit()
    return u


async def test_valid_session_defaults(session, user):
    rs = make_refresh_session(user.id, user_agent="pytest", ip_address="203.0.113.7")
    session.add(rs)
    await session.commit()
    assert isinstance(rs.id, uuid.UUID)
    assert rs.revoked_at is None
    assert rs.last_used_at.tzinfo is not None
    assert rs.created_at.tzinfo is not None
    assert str(rs.ip_address) == "203.0.113.7"


async def test_ipv6_address_roundtrip(session, user):
    session.add(make_refresh_session(user.id, ip_address="2001:db8::1"))
    await session.commit()
    stored = (await session.execute(select(RefreshSession.ip_address))).scalar_one()
    assert str(stored) == "2001:db8::1"


async def test_invalid_ip_address_rejected(session, user):
    session.add(make_refresh_session(user.id, ip_address="not-an-ip"))
    with pytest.raises(DBAPIError):  # driver-level encoding error, not an IntegrityError
        await session.flush()
    await session.rollback()


@pytest.mark.parametrize(
    "bad_hash",
    [
        secrets.token_urlsafe(32),  # a raw refresh token (43 chars, base64url)
        token_hash().upper(),  # uppercase hex
        token_hash()[:-1],  # 63 chars
        "g" * 64,  # right length, not hex
    ],
    ids=["raw-token", "uppercase", "too-short", "non-hex"],
)
async def test_token_hash_must_be_a_sha256_hex_digest(session, user, bad_hash):
    session.add(make_refresh_session(user.id, token_hash=bad_hash))
    await expect_violation(session, "ck_refresh_sessions_token_hash_format")


async def test_overlong_token_hash_rejected_by_column_length(session, user):
    session.add(make_refresh_session(user.id, token_hash=token_hash() + "0"))
    with pytest.raises(DBAPIError, match="value too long"):
        await session.flush()
    await session.rollback()


async def test_duplicate_token_hash_rejected(session, user):
    h = token_hash()
    session.add(make_refresh_session(user.id, token_hash=h))
    await session.commit()
    session.add(make_refresh_session(user.id, token_hash=h))
    await expect_violation(session, "uq_refresh_sessions_token_hash")


async def test_unknown_user_rejected(session):
    session.add(make_refresh_session(uuid.uuid4()))
    await expect_violation(session, "fk_refresh_sessions_user_id_users")


async def test_revocation_fields_must_be_set_together(session, user):
    uid = user.id  # rollback() expires loaded objects
    now = datetime.now(UTC)
    session.add(make_refresh_session(uid, revoked_at=now))
    await expect_violation(session, "ck_refresh_sessions_revocation_consistent")
    session.add(make_refresh_session(uid, revoked_reason=RevokeReason.LOGOUT.value))
    await expect_violation(session, "ck_refresh_sessions_revocation_consistent")


async def test_valid_revocation_accepted_for_every_reason(session, user):
    now = datetime.now(UTC)
    for reason in RevokeReason:
        session.add(make_refresh_session(user.id, revoked_at=now, revoked_reason=reason.value))
    await session.commit()


async def test_invalid_revoke_reason_rejected(session, user):
    session.add(
        make_refresh_session(user.id, revoked_at=datetime.now(UTC), revoked_reason="because")
    )
    await expect_violation(session, "ck_refresh_sessions_revoked_reason_valid")


async def test_expiry_cannot_exceed_absolute_expiry(session, user):
    now = datetime.now(UTC)
    session.add(
        make_refresh_session(
            user.id,
            expires_at=now + timedelta(days=31),
            absolute_expires_at=now + timedelta(days=30),
        )
    )
    await expect_violation(session, "ck_refresh_sessions_expiry_within_absolute")


async def test_rotation_fields_must_be_set_together_and_differ(session, user):
    uid = user.id  # rollback() expires loaded objects
    now = datetime.now(UTC)
    session.add(make_refresh_session(uid, previous_token_hash=token_hash()))
    await expect_violation(session, "ck_refresh_sessions_rotation_consistent")
    session.add(make_refresh_session(uid, rotated_at=now))
    await expect_violation(session, "ck_refresh_sessions_rotation_consistent")
    same = token_hash()
    session.add(
        make_refresh_session(uid, token_hash=same, previous_token_hash=same, rotated_at=now)
    )
    await expect_violation(session, "ck_refresh_sessions_previous_differs")
    session.add(make_refresh_session(uid, previous_token_hash="oops", rotated_at=now))
    await expect_violation(session, "ck_refresh_sessions_previous_token_hash_format")


async def test_valid_rotated_session_accepted(session, user):
    session.add(
        make_refresh_session(
            user.id, previous_token_hash=token_hash(), rotated_at=datetime.now(UTC)
        )
    )
    await session.commit()


async def test_deleting_user_cascades_to_sessions(session, user):
    session.add_all([make_refresh_session(user.id), make_refresh_session(user.id)])
    await session.commit()
    await session.execute(delete(User).where(User.id == user.id))
    await session.commit()
    assert (await session.execute(text("SELECT count(*) FROM refresh_sessions"))).scalar_one() == 0


async def test_session_user_relationship_loads(session, user):
    session.add(make_refresh_session(user.id))
    await session.commit()
    session.expunge_all()
    rs = (
        await session.execute(select(RefreshSession).options(selectinload(RefreshSession.user)))
    ).scalar_one()
    assert rs.user.id == user.id
    assert rs.user.email == user.email
