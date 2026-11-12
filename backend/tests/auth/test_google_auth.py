import pytest
from pydantic import ValidationError

from app.auth.schemas import GoogleAuthRequest
from app.auth.service import verify_google_credential
from app.core.exceptions import InvalidCredentialsError


def test_google_auth_schema_accepts_credential_or_id_token():
    with pytest.raises(ValidationError):
        GoogleAuthRequest()

    with pytest.raises(ValidationError):
        GoogleAuthRequest(credential="too-short")

    valid_cred = GoogleAuthRequest(credential="valid-google-credential-token-string-1234567890")
    assert valid_cred.credential == "valid-google-credential-token-string-1234567890"

    valid_id_token = GoogleAuthRequest(id_token="valid-google-id-token-string-1234567890")
    assert valid_id_token.credential == "valid-google-id-token-string-1234567890"


@pytest.mark.asyncio
async def test_google_auth_verification_rejects_invalid_token(monkeypatch):
    class MockResponse:
        status_code = 400
        text = "Bad Request"

        def json(self):
            return {"error_description": "Invalid Value"}

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, params=None):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockClient())

    with pytest.raises(InvalidCredentialsError):
        await verify_google_credential("invalid_token", "test_client_id")


@pytest.mark.asyncio
async def test_google_auth_verification_rejects_invalid_issuer(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "iss": "https://malicious-issuer.com",
                "sub": "1234567890",
                "aud": "test_client_id",
                "email": "user@example.com",
                "email_verified": "true",
            }

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, params=None):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockClient())

    with pytest.raises(InvalidCredentialsError):
        await verify_google_credential("token", "test_client_id")


@pytest.mark.asyncio
async def test_google_auth_verification_rejects_aud_mismatch(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "iss": "https://accounts.google.com",
                "sub": "1234567890",
                "aud": "wrong_audience_id",
                "email": "user@example.com",
                "email_verified": "true",
            }

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, params=None):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockClient())

    with pytest.raises(InvalidCredentialsError):
        await verify_google_credential("token", "expected_client_id")


@pytest.mark.asyncio
async def test_google_auth_verification_rejects_unverified_email(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "iss": "https://accounts.google.com",
                "sub": "1234567890",
                "aud": "test_client_id",
                "email": "unverified@example.com",
                "email_verified": "false",
            }

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, params=None):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockClient())

    with pytest.raises(InvalidCredentialsError):
        await verify_google_credential("token", "test_client_id")


@pytest.mark.asyncio
async def test_google_auth_verification_rejects_missing_sub(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "iss": "https://accounts.google.com",
                "aud": "test_client_id",
                "email": "nosub@example.com",
                "email_verified": "true",
            }

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, params=None):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockClient())

    with pytest.raises(InvalidCredentialsError):
        await verify_google_credential("token", "test_client_id")


@pytest.mark.asyncio
async def test_google_auth_verification_succeeds_for_verified_payload(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "iss": "https://accounts.google.com",
                "sub": "google-sub-123456",
                "aud": "test_client_id",
                "email": "candidate@example.com",
                "email_verified": "true",
                "name": "Jane Candidate",
                "picture": "https://example.com/avatar.jpg",
            }

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, params=None):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockClient())

    result = await verify_google_credential("valid_token", "test_client_id")
    assert result["email"] == "candidate@example.com"
    assert result["sub"] == "google-sub-123456"
    assert result["name"] == "Jane Candidate"
    assert result["picture"] == "https://example.com/avatar.jpg"


@pytest.mark.asyncio
async def test_post_auth_google_creates_candidate_and_authenticates(client, monkeypatch):
    """End-to-end endpoint test: POST /api/v1/auth/google creates candidate and logs in."""
    from app.core.config import get_settings
    settings = get_settings()

    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google-sub-999888",
        "aud": settings.google_client_id,
        "email": "new.candidate@example.com",
        "email_verified": "true",
        "name": "New Candidate",
        "picture": "https://lh3.googleusercontent.com/avatar.jpg",
    }

    class MockResponse:
        status_code = 200

        def json(self):
            return mock_payload

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, params=None):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockClient())

    # 1. First-time sign in creates candidate
    res1 = await client.post(
        "/api/v1/auth/google",
        json={"credential": "mock-google-id-token-xyz-1234567890"},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert "access_token" in data1
    assert data1["user"]["email"] == "new.candidate@example.com"
    assert data1["user"]["roles"] == ["candidate"]
    assert "refresh_token" in res1.cookies

    # 2. Authenticated GET /api/v1/users/me succeeds
    me_res = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {data1['access_token']}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "new.candidate@example.com"

    # 3. Returning sign in succeeds without creating duplicate account
    res2 = await client.post(
        "/api/v1/auth/google",
        json={"credential": "mock-google-id-token-xyz-1234567890"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["user"]["id"] == data1["user"]["id"]
    assert data2["user"]["email"] == "new.candidate@example.com"
