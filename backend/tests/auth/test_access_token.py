import pytest


@pytest.fixture
async def authenticated_client(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "access@example.com",
            "password": "StrongPassword123!",
            "full_name": "Access Test User",
        },
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "access@example.com",
            "password": "StrongPassword123!",
        },
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["access_token"]

    client.headers["Authorization"] = f"Bearer {access_token}"

    return client


@pytest.mark.asyncio
async def test_valid_access_token(authenticated_client):
    response = await authenticated_client.get("/api/v1/users/me")

    assert response.status_code == 200

    data = response.json()

    assert data["email"] == "access@example.com"
    assert data["full_name"] == "Access Test User"


@pytest.mark.asyncio
async def test_missing_access_token(client):
    response = await client.get("/api/v1/users/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_access_token(client):
    client.headers["Authorization"] = "Bearer invalid.token.value"

    response = await client.get("/api/v1/users/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_tampered_access_token(client, authenticated_client):
    token = authenticated_client.headers["Authorization"].replace("Bearer ", "")

    tampered_token = token[:-5] + "xxxxx"
    client.headers["Authorization"] = f"Bearer {tampered_token}"

    response = await client.get("/api/v1/users/me")

    assert response.status_code == 401
