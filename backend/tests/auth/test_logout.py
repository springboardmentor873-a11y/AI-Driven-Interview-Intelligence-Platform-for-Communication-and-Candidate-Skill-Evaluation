import pytest


@pytest.fixture
async def logged_in_client(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout@example.com",
            "password": "StrongPassword123!",
            "full_name": "Logout Test User",
        },
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "logout@example.com",
            "password": "StrongPassword123!",
        },
    )

    assert login_response.status_code == 200
    assert client.cookies.get("refresh_token")

    access_token = login_response.json()["access_token"]

    client.headers["Authorization"] = f"Bearer {access_token}"

    return client


@pytest.mark.asyncio
async def test_logout_success(logged_in_client):
    client = logged_in_client

    response = await client.post("/api/v1/auth/logout")

    assert response.status_code == 204

    # Refresh cookie should be cleared.
    assert client.cookies.get("refresh_token") is None


@pytest.mark.asyncio
async def test_logout_without_cookie(client):
    response = await client.post("/api/v1/auth/logout")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_logout_all_success(logged_in_client):
    client = logged_in_client

    response = await client.post("/api/v1/auth/logout-all")

    assert response.status_code == 204

    # All refresh sessions should be invalidated.
    refresh_response = await client.post("/api/v1/auth/refresh")

    assert refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_logout_all_without_access_token(client):
    response = await client.post("/api/v1/auth/logout-all")

    assert response.status_code == 401
