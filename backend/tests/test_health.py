from httpx import ASGITransport, AsyncClient

from app.main import create_app


async def test_liveness(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_readiness_with_database(client):
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_readiness_returns_503_when_database_down(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@127.0.0.1:1/none")
    app = create_app()
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c,
    ):
        response = await c.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
    assert "127.0.0.1" not in response.text  # no connection details leaked


async def test_unknown_route_returns_404(client):
    assert (await client.get("/api/v1/nope")).status_code == 404


async def test_docs_disabled_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        assert (await c.get("/docs")).status_code == 404
        assert (await c.get("/openapi.json")).status_code == 404
