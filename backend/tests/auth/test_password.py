from urllib.parse import parse_qs, urlparse

import pytest

from app.auth import service
from app.core.config import get_settings
from app.db.session import create_engine, create_session_factory

PASSWORD = "StrongPassword123!"
NEW_PASSWORD = "NewStrongPassword456!"


class CapturingEmailSender:
    """Test email sender that captures reset URLs without sending emails."""

    def __init__(self):
        self.reset_url = None
        self.recipient = None

    async def send_password_reset(self, to_email: str, reset_url: str):
        self.recipient = to_email
        self.reset_url = reset_url


@pytest.fixture
async def password_client(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "password@example.com",
            "password": PASSWORD,
            "full_name": "Password Test User",
        },
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "password@example.com",
            "password": PASSWORD,
        },
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {access_token}"

    return client


async def generate_reset_token(email="reset@example.com"):
    """Generate a real reset token through the password-reset service."""

    settings = get_settings()
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    email_sender = CapturingEmailSender()

    try:
        await service.request_password_reset(
            session_factory,
            settings,
            email_sender,
            email,
        )
    finally:
        await engine.dispose()

    assert email_sender.reset_url is not None
    assert email_sender.recipient == email

    parsed_url = urlparse(email_sender.reset_url)
    token = parse_qs(parsed_url.query).get("token", [None])[0]

    assert token is not None
    return token


@pytest.fixture
async def reset_token(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "reset@example.com",
            "password": PASSWORD,
            "full_name": "Reset Test User",
        },
    )

    return await generate_reset_token()


# --------------------------------------------------
# PASSWORD CHANGE TESTS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_password_change_success(password_client):
    response = await password_client.post(
        "/api/v1/auth/password/change",
        json={
            "current_password": PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_password_change_rejects_wrong_current_password(
    password_client,
):
    response = await password_client.post(
        "/api/v1/auth/password/change",
        json={
            "current_password": "WrongPassword123!",
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "wrong_password"


@pytest.mark.asyncio
async def test_password_change_rejects_same_password(password_client):
    response = await password_client.post(
        "/api/v1/auth/password/change",
        json={
            "current_password": PASSWORD,
            "new_password": PASSWORD,
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "password_unchanged"


@pytest.mark.asyncio
async def test_new_password_works_and_old_password_fails(password_client):
    change_response = await password_client.post(
        "/api/v1/auth/password/change",
        json={
            "current_password": PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert change_response.status_code == 204

    old_login = await password_client.post(
        "/api/v1/auth/login",
        json={
            "email": "password@example.com",
            "password": PASSWORD,
        },
    )

    assert old_login.status_code == 401

    new_login = await password_client.post(
        "/api/v1/auth/login",
        json={
            "email": "password@example.com",
            "password": NEW_PASSWORD,
        },
    )

    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_password_change_revokes_other_sessions(password_client):
    client = password_client

    # Save the access token for the first session.
    first_access_token = client.headers["Authorization"].split(" ", 1)[1]

    # Save the first session's refresh cookie.
    first_refresh_token = client.cookies.get("refresh_token")
    assert first_refresh_token

    # Create a second session by logging in again.
    second_login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "password@example.com",
            "password": PASSWORD,
        },
    )

    assert second_login.status_code == 200

    second_refresh_token = client.cookies.get("refresh_token")
    assert second_refresh_token
    assert second_refresh_token != first_refresh_token

    # Change the password using the first session.
    client.headers["Authorization"] = f"Bearer {first_access_token}"

    change_response = await client.post(
        "/api/v1/auth/password/change",
        json={
            "current_password": PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert change_response.status_code == 204

    # The second session must now be revoked.
    client.cookies.clear()
    client.cookies.set(
        "refresh_token",
        second_refresh_token,
        path="/api/v1/auth",
    )

    refresh_response = await client.post("/api/v1/auth/refresh")

    assert refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_password_change_requires_authentication(client):
    response = await client.post(
        "/api/v1/auth/password/change",
        json={
            "current_password": PASSWORD,
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 401


# --------------------------------------------------
# PASSWORD RESET REQUEST TESTS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_forgot_password_returns_generic_response(client):
    response = await client.post(
        "/api/v1/auth/password/forgot",
        json={"email": "unknown@example.com"},
    )

    assert response.status_code == 202

    assert response.json()["message"] == (
        "If an account exists for this email, a password reset request has been recorded."
    )


@pytest.mark.asyncio
async def test_reset_token_is_generated_for_existing_user(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "reset@example.com",
            "password": PASSWORD,
            "full_name": "Reset Test User",
        },
    )

    token = await generate_reset_token()

    assert token
    assert len(token) >= 20


# --------------------------------------------------
# PASSWORD RESET CONFIRMATION TESTS
# --------------------------------------------------


@pytest.mark.asyncio
async def test_password_reset_success(client, reset_token):
    response = await client.post(
        "/api/v1/auth/password/reset",
        json={
            "token": reset_token,
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 204

    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "reset@example.com",
            "password": NEW_PASSWORD,
        },
    )

    assert login_response.status_code == 200


@pytest.mark.asyncio
async def test_password_reset_rejects_invalid_token(client):
    response = await client.post(
        "/api/v1/auth/password/reset",
        json={
            "token": "invalid-reset-token-123456789",
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_reset_token"


@pytest.mark.asyncio
async def test_password_reset_token_cannot_be_reused(client, reset_token):
    first_response = await client.post(
        "/api/v1/auth/password/reset",
        json={
            "token": reset_token,
            "new_password": NEW_PASSWORD,
        },
    )

    assert first_response.status_code == 204

    second_response = await client.post(
        "/api/v1/auth/password/reset",
        json={
            "token": reset_token,
            "new_password": "AnotherStrongPassword789!",
        },
    )

    assert second_response.status_code == 400
    assert second_response.json()["error"]["code"] == "invalid_reset_token"


@pytest.mark.asyncio
async def test_password_reset_revokes_existing_sessions(client, reset_token):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "reset@example.com",
            "password": PASSWORD,
            "full_name": "Reset Test User",
        },
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "reset@example.com",
            "password": PASSWORD,
        },
    )

    assert login_response.status_code == 200

    refresh_token = client.cookies.get("refresh_token")
    assert refresh_token

    reset_response = await client.post(
        "/api/v1/auth/password/reset",
        json={
            "token": reset_token,
            "new_password": NEW_PASSWORD,
        },
    )

    assert reset_response.status_code == 204

    client.cookies.clear()
    client.cookies.set(
        "refresh_token",
        refresh_token,
        path="/api/v1/auth",
    )

    refresh_response = await client.post("/api/v1/auth/refresh")

    assert refresh_response.status_code == 401
