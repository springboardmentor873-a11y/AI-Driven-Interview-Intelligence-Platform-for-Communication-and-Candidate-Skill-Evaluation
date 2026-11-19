from types import SimpleNamespace

import pytest

from apps.ai import gemini


class FakeModels:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def generate_content(self, model, contents, config):
        self.calls.append(model)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return SimpleNamespace(text=reply)


def patch_client(monkeypatch, replies):
    models = FakeModels(replies)
    monkeypatch.setattr(gemini, "_client", lambda: SimpleNamespace(models=models))
    return models


@pytest.fixture(autouse=True)
def no_waiting(monkeypatch):
    waits = []
    monkeypatch.setattr(gemini.time, "sleep", waits.append)  # keep the tests fast
    return waits


class ApiError(Exception):
    """Looks like the SDK's errors: they carry the HTTP status as .code."""

    def __init__(self, code):
        super().__init__(f"{code} error")
        self.code = code


@pytest.fixture
def configured(settings):
    settings.GEMINI_API_KEY = "test-key"
    settings.GEMINI_MODEL = "test-model"


def test_unavailable_without_key(settings):
    settings.GEMINI_API_KEY = ""
    assert gemini.is_configured() is False
    with pytest.raises(gemini.AIUnavailable):
        gemini.generate_json("hi")


def test_returns_parsed_json_and_uses_configured_model(configured, monkeypatch):
    models = patch_client(monkeypatch, ['{"skills": ["Python"]}'])
    assert gemini.generate_json("hi") == {"skills": ["Python"]}
    assert models.calls == ["test-model"]


def test_strips_code_fences(configured, monkeypatch):
    patch_client(monkeypatch, ['```json\n{"a": 1}\n```'])
    assert gemini.generate_json("hi") == {"a": 1}


def test_retries_once_then_succeeds(configured, monkeypatch):
    models = patch_client(monkeypatch, [RuntimeError("boom"), '{"ok": true}'])
    assert gemini.generate_json("hi") == {"ok": True}
    assert len(models.calls) == 2


def test_raises_aierror_after_two_failures(configured, monkeypatch):
    models = patch_client(monkeypatch, [RuntimeError("boom"), "not json", RuntimeError("again")])
    with pytest.raises(gemini.AIError):
        gemini.generate_json("hi")
    assert len(models.calls) == 3


def test_client_stays_open_while_the_request_runs(configured, monkeypatch):
    """Regression: the client used to be dropped (and closed) before the request was sent."""

    class Models:
        # Like the real SDK, this does not keep the Client object alive
        def generate_content(self, model, contents, config):
            if Client.closed:
                raise RuntimeError("Cannot send a request, as the client has been closed.")
            return SimpleNamespace(text='{"ok": true}')

    class Client:
        closed = False
        models = Models()

        def __del__(self):  # the real SDK closes its connection here
            Client.closed = True

    monkeypatch.setattr(gemini, "_client", Client)
    assert gemini.generate_json("hi") == {"ok": True}


def test_busy_model_is_retried_with_waits_between_attempts(configured, monkeypatch, no_waiting):
    models = patch_client(monkeypatch, [ApiError(503), ApiError(503), '{"ok": true}'])
    assert gemini.generate_json("hi") == {"ok": True}
    assert models.calls == ["test-model"] * 3
    assert no_waiting == [0, 1.0, 2.0]


def test_last_attempt_uses_the_backup_model(configured, settings, monkeypatch):
    settings.GEMINI_FALLBACK_MODEL = "backup-model"
    models = patch_client(monkeypatch, [ApiError(503), ApiError(503), '{"ok": true}'])
    assert gemini.generate_json("hi") == {"ok": True}
    assert models.calls == ["test-model", "test-model", "backup-model"]


@pytest.mark.parametrize("code", [400, 401, 403, 404])
def test_permanent_errors_are_not_retried(configured, monkeypatch, code):
    models = patch_client(monkeypatch, [ApiError(code), '{"ok": true}'])
    with pytest.raises(gemini.AIError):
        gemini.generate_json("hi")
    assert len(models.calls) == 1  # a wrong key or model name fails fast


@pytest.mark.parametrize("code", [429, 500, 502, 503, 504])
def test_temporary_errors_are_retried(configured, monkeypatch, code):
    models = patch_client(monkeypatch, [ApiError(code), '{"ok": true}'])
    assert gemini.generate_json("hi") == {"ok": True}
    assert len(models.calls) == 2


def test_failures_are_logged_with_the_reason(configured, monkeypatch, caplog):
    patch_client(monkeypatch, [ApiError(404), ])
    with caplog.at_level("WARNING"), pytest.raises(gemini.AIError):
        gemini.generate_json("hi")
    assert "test-model" in caplog.text and "404" in caplog.text
