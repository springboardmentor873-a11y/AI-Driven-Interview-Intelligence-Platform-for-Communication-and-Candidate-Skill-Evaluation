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
    patch_client(monkeypatch, [RuntimeError("boom"), "not json"])
    with pytest.raises(gemini.AIError):
        gemini.generate_json("hi")
