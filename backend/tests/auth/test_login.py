import pytest


@pytest.fixture
async def registered_user(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "StrongPassword123!",
            "full_name": "Login Test User",
        },
    )

    assert response.status_code == 201
    return {
        "email": "login@example.com",
        "password": "StrongPassword123!",
    }


@pytest.mark.asyncio
async def test_login_success(client, registered_user):
    response = await client.post(
        "/api/v1/auth/login",
        json=registered_user,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0

    assert data["user"]["email"] == registered_user["email"]
    assert data["user"]["full_name"] == "Login Test User"

    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]

    assert "refresh_token" not in data

    set_cookie = response.headers.get("set-cookie", "").lower()
    assert "httponly" in set_cookie


@pytest.mark.asyncio
async def test_login_wrong_password(client, registered_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": registered_user["email"],
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "unknown@example.com",
            "password": "StrongPassword123!",
        },
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_email_is_case_insensitive(client, registered_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "LOGIN@EXAMPLE.COM",
            "password": registered_user["password"],
        },
    )

    assert response.status_code == 200
