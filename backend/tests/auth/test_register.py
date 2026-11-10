import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db.session import create_engine, create_session_factory
from app.users.models import Role, User


@pytest.fixture
async def auth_session():
    engine = create_engine(get_settings())
    try:
        async with create_session_factory(engine)() as session:
            yield session
    finally:
        await engine.dispose()


@pytest.mark.parametrize(
    "email",
    [
        "candidate@example.com",
        "  Candidate@Example.com  ",
    ],
)
async def test_register_creates_candidate_user(client, auth_session, email):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "StrongPassword123!",
            "full_name": "Test Candidate",
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert data["email"] == "candidate@example.com"
    assert data["full_name"] == "Test Candidate"
    assert "password" not in data
    assert "password_hash" not in data

    user = (
        await auth_session.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(User.email == "candidate@example.com")
        )
    ).scalar_one()

    assert user.password_hash is not None
    assert user.password_hash.startswith("$argon2id$")

    candidate_role = (
        await auth_session.execute(select(Role).where(Role.name == "candidate"))
    ).scalar_one()

    assert candidate_role in user.roles


async def test_register_rejects_duplicate_email(client):
    payload = {
        "email": "duplicate@example.com",
        "password": "StrongPassword123!",
        "full_name": "First Candidate",
    }

    first = await client.post("/api/v1/auth/register", json=payload)
    second = await client.post("/api/v1/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "email_taken"


async def test_register_rejects_role_escalation(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "attacker@example.com",
            "password": "StrongPassword123!",
            "full_name": "Attacker",
            "role": "admin",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize(
    "payload",
    [
        {
            "email": "invalid-email",
            "password": "StrongPassword123!",
            "full_name": "Test Candidate",
        },
        {
            "email": "candidate@example.com",
            "password": "short",
            "full_name": "Test Candidate",
        },
        {
            "email": "candidate@example.com",
            "password": "StrongPassword123!",
            "full_name": "   ",
        },
    ],
)
async def test_register_rejects_invalid_input(client, payload):
    response = await client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
