import uuid

import pytest
from sqlalchemy import text

from tests.db.factories import ARGON2_HASH, expect_violation, make_user


async def test_connection(session):
    assert (await session.execute(text("SELECT 1"))).scalar_one() == 1


async def test_orm_insert_populates_defaults_and_tz_aware_timestamps(session):
    user = make_user()
    session.add(user)
    await session.commit()
    assert isinstance(user.id, uuid.UUID)
    assert user.status == "active"
    assert user.failed_login_attempts == 0
    assert user.password_hash is None
    assert user.email_verified_at is None
    assert user.created_at.tzinfo is not None
    assert user.updated_at.tzinfo is not None


async def test_database_level_defaults_without_orm(session):
    row = (
        await session.execute(
            text(
                "INSERT INTO users (email, full_name) VALUES ('raw@example.com', 'Raw') "
                "RETURNING id, status, failed_login_attempts, created_at, updated_at"
            )
        )
    ).one()
    assert isinstance(row.id, uuid.UUID)
    assert (row.status, row.failed_login_attempts) == ("active", 0)
    assert row.created_at.tzinfo is not None
    await session.rollback()


async def test_duplicate_email_rejected(session):
    session.add(make_user("dup@example.com"))
    await session.commit()
    session.add(make_user("dup@example.com"))
    await expect_violation(session, "uq_users_email")


async def test_email_case_variant_cannot_bypass_uniqueness(session):
    session.add(make_user("dup@example.com"))
    await session.commit()
    session.add(make_user("DUP@example.com"))  # un-normalised -> rejected by the format check
    await expect_violation(session, "ck_users_email_format")


@pytest.mark.parametrize(
    ("overrides", "constraint"),
    [
        ({"status": "banned"}, "ck_users_status_valid"),
        ({"failed_login_attempts": -1}, "ck_users_failed_attempts_nonnegative"),
        ({"full_name": "   "}, "ck_users_full_name_not_blank"),
        ({"email": "no-at-sign"}, "ck_users_email_format"),
        ({"email": " padded@example.com"}, "ck_users_email_format"),
        ({"password_hash": "hunter2"}, "ck_users_password_hash_argon2id"),
        (
            {"password_hash": "$argon2i$v=19$m=1,t=1,p=1$c2FsdA$aGFzaA"},
            "ck_users_password_hash_argon2id",
        ),
        ({"password_hash": "$2b$12$abcdefghijklmnopqrstuv"}, "ck_users_password_hash_argon2id"),
    ],
    ids=[
        "bad-status",
        "negative-attempts",
        "blank-name",
        "no-at",
        "padded-email",
        "plaintext-password",
        "argon2i-not-id",
        "bcrypt-hash",
    ],
)
async def test_check_constraints_reject_invalid_rows(session, overrides, constraint):
    session.add(make_user(**overrides))
    await expect_violation(session, constraint)


async def test_valid_argon2id_hash_and_null_hash_accepted(session):
    session.add_all([make_user(password_hash=ARGON2_HASH), make_user(password_hash=None)])
    await session.commit()


async def test_updated_at_changes_on_update_and_created_at_does_not(session):
    user = make_user()
    session.add(user)
    await session.commit()
    created, first_updated = user.created_at, user.updated_at
    user.full_name = "Renamed"
    await session.commit()
    assert user.updated_at > first_updated
    assert user.created_at == created
