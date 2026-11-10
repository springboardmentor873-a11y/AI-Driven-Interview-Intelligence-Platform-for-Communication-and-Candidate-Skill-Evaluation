import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.core.exceptions import (
    AppException,
    register_exception_handlers,
)

ALLOWED_ORIGIN = "http://localhost:5173"
DISALLOWED_ORIGIN = "http://untrusted.example"


def create_test_app() -> FastAPI:
    """Create a small isolated app for testing exception handling."""

    app = FastAPI()
    register_exception_handlers(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[ALLOWED_ORIGIN],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    class TestRequest(BaseModel):
        name: str

    @app.post("/test-validation")
    async def validation_endpoint(payload: TestRequest):
        return {"name": payload.name}

    class TestAppException(AppException):
        status_code = 400
        code = "test_error"
        default_message = "Test exception"

    @app.get("/test-error")
    async def error_endpoint():
        raise TestAppException()

    return app


@pytest.mark.asyncio
async def test_cors_allows_configured_origin():
    app = create_test_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.options(
            "/test-validation",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"


@pytest.mark.asyncio
async def test_cors_rejects_unconfigured_origin():
    app = create_test_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.options(
            "/test-validation",
            headers={
                "Origin": DISALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
            },
        )

    assert "access-control-allow-origin" not in response.headers


@pytest.mark.asyncio
async def test_cors_allows_authorization_header():
    app = create_test_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.options(
            "/test-validation",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization",
            },
        )

    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


@pytest.mark.asyncio
async def test_validation_error_uses_standard_response():
    app = create_test_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/test-validation",
            json={},
        )

    assert response.status_code == 422

    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Request validation failed."


@pytest.mark.asyncio
async def test_app_exception_uses_standard_response():
    app = create_test_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/test-error")

    assert response.status_code == 400

    body = response.json()
    assert body["error"]["code"] == "test_error"
    assert body["error"]["message"] == "Test exception"
