import pytest


@pytest.fixture
async def logged_in_client(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "refresh@example.com",
            "password": "StrongPassword123!",
            "full_name": "Refresh Test User",
        },
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "refresh@example.com",
            "password": "StrongPassword123!",
        },
    )

    assert login_response.status_code == 200
    assert client.cookies

    return client


@pytest.mark.asyncio
async def test_refresh_success_and_rotation(logged_in_client):
    client = logged_in_client

    old_cookie = client.cookies.get("refresh_token")
    assert old_cookie

    response = await client.post("/api/v1/auth/refresh")

    assert response.status_code == 200

    data = response.json()
    assert data["access_token"]
    assert data["expires_in"] > 0

    new_cookie = client.cookies.get("refresh_token")
    assert new_cookie
    assert new_cookie != old_cookie

    assert "refresh_token" not in data


@pytest.mark.asyncio
async def test_refresh_without_cookie(client):
    response = await client.post("/api/v1/auth/refresh")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_invalid_cookie(client):
    client.cookies.set("refresh_token", "invalid-refresh-token")

    response = await client.post("/api/v1/auth/refresh")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_old_refresh_token_rejected_during_grace_period(logged_in_client):
    client = logged_in_client

    old_cookie = client.cookies.get("refresh_token")
    assert old_cookie

    first_response = await client.post("/api/v1/auth/refresh")
    assert first_response.status_code == 200

    client.cookies.clear()
    client.cookies.set(
        "refresh_token",
        old_cookie,
        path="/api/v1/auth",
    )

    second_response = await client.post("/api/v1/auth/refresh")

    assert second_response.status_code == 409
    assert second_response.json()["error"]["code"] == "refresh_conflict"
