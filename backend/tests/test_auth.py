from unittest.mock import AsyncMock

import httpx
from fastapi.testclient import TestClient

from app.main import app, settings


def test_health_and_missing_bearer():
    with TestClient(app) as client:
        assert client.get('/health').status_code == 200
        assert client.get('/api/me').status_code == 401
        assert client.get('/api/capabilities').status_code == 401


def test_validated_identity(monkeypatch):
    monkeypatch.setattr(settings, 'supabase_url', 'https://test.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'test-public-key')
    with TestClient(app) as client:
        app.state.http.get = AsyncMock(return_value=httpx.Response(200, json={
            'id': '5aee38f0-17c2-40da-a0dd-5383c5e8cf6a', 'email': 'candidate@example.com',
            'user_metadata': {'role': 'admin'},
        }))
        response = client.get('/api/me', headers={'Authorization': 'Bearer validated-token'})
        assert response.status_code == 200
        assert response.json() == {'id': '5aee38f0-17c2-40da-a0dd-5383c5e8cf6a', 'email': 'candidate@example.com'}
        assert app.state.http.get.call_args.kwargs['headers']['Authorization'] == 'Bearer validated-token'


def test_invalid_token_and_unavailable_auth(monkeypatch):
    monkeypatch.setattr(settings, 'supabase_url', 'https://test.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'test-public-key')
    with TestClient(app) as client:
        app.state.http.get = AsyncMock(return_value=httpx.Response(401))
        assert client.get('/api/me', headers={'Authorization': 'Bearer forged'}).status_code == 401
        app.state.http.get = AsyncMock(side_effect=httpx.ConnectError('offline'))
        assert client.get('/api/me', headers={'Authorization': 'Bearer token'}).status_code == 503


def test_malformed_identity_fails_closed(monkeypatch):
    monkeypatch.setattr(settings, 'supabase_url', 'https://test.supabase.co')
    monkeypatch.setattr(settings, 'supabase_publishable_key', 'test-public-key')
    with TestClient(app) as client:
        app.state.http.get = AsyncMock(return_value=httpx.Response(200, json={'email': 'no-id@example.com'}))
        assert client.get('/api/me', headers={'Authorization': 'Bearer token'}).status_code == 503
