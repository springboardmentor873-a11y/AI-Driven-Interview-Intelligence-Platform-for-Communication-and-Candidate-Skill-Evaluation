from types import SimpleNamespace

import pytest

from apps.ai import gemini
from apps.ai.throttles import AIReviewThrottle
from apps.system import store
from apps.system.models import AICall, AuditLog, SystemSettings

pytestmark = pytest.mark.django_db

URL = "/api/admin/settings/ai/"
TEST_URL = URL + "test/"
USERS = "/api/auth/users/"


@pytest.fixture
def admin(make_user):
    return make_user("admin@example.com", role="admin")


@pytest.fixture
def client(admin, auth_client):
    return auth_client(admin)


@pytest.fixture
def configured(settings):
    settings.GEMINI_API_KEY = "secret-key-123"
    settings.GEMINI_MODEL = "default-model"
    settings.GEMINI_FALLBACK_MODEL = ""
    settings.GEMINI_TIMEOUT_SECONDS = 30


@pytest.fixture(autouse=True)
def no_waiting(monkeypatch):
    monkeypatch.setattr(gemini.time, "sleep", lambda seconds: None)


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


def fake_ai(monkeypatch, replies):
    models = FakeModels(replies)
    monkeypatch.setattr(gemini, "_client", lambda: SimpleNamespace(models=models))
    return models


class ApiError(Exception):
    def __init__(self, code):
        super().__init__(f"{code} error")
        self.code = code


# --- access ----------------------------------------------------------------------

@pytest.mark.parametrize("method,url", [("get", URL), ("patch", URL), ("post", TEST_URL)])
def test_signed_out_is_401(api, method, url):
    assert getattr(api, method)(url).status_code == 401


@pytest.mark.parametrize("method,url", [("get", URL), ("patch", URL), ("post", TEST_URL)])
@pytest.mark.parametrize("role", ["candidate", "recruiter"])
def test_only_admins_can_use_ai_settings(make_user, auth_client, method, url, role):
    assert getattr(auth_client(make_user(f"{role}@example.com", role=role)), method)(url).status_code == 403


# --- reading and changing the settings -------------------------------------------

def test_defaults_come_from_the_server_and_the_key_is_never_shown(client, configured):
    data = client.get(URL).json()
    assert data["key_configured"] is True and data["enabled"] is True
    assert data["model"] == {"override": "", "default": "default-model", "effective": "default-model"}
    assert data["timeout_seconds"] == {"override": None, "default": 30, "effective": 30}
    assert data["review_rate_per_hour"]["override"] is None and data["review_rate_per_hour"]["effective"] == "30/hour"
    assert data["updated_at"] is None and data["updated_by"] is None
    assert "secret-key-123" not in str(data)


def test_key_configured_is_false_without_a_key(client, settings):
    settings.GEMINI_API_KEY = ""
    assert client.get(URL).json()["key_configured"] is False


def test_an_override_replaces_the_default_and_is_remembered(client, admin, configured):
    response = client.patch(URL, {"model": "gemini-2.5-pro", "timeout_seconds": 60, "review_rate_per_hour": 5, "enabled": False}, format="json")
    assert response.status_code == 200
    data = response.json()
    assert data["enabled"] is False
    assert data["model"] == {"override": "gemini-2.5-pro", "default": "default-model", "effective": "gemini-2.5-pro"}
    assert data["timeout_seconds"]["effective"] == 60 and data["review_rate_per_hour"]["effective"] == "5/hour"
    assert data["updated_by"] == {"id": admin.id, "email": "admin@example.com"} and data["updated_at"]
    assert client.get(URL).json() == data
    assert SystemSettings.objects.count() == 1


def test_fields_left_out_are_unchanged(client, configured):
    client.patch(URL, {"model": "a-model", "timeout_seconds": 40}, format="json")
    data = client.patch(URL, {"fallback_model": "b-model"}, format="json").json()
    assert data["model"]["override"] == "a-model" and data["timeout_seconds"]["override"] == 40
    assert data["fallback_model"]["override"] == "b-model"


def test_blank_or_null_puts_the_server_default_back(client, configured):
    client.patch(URL, {"model": "a-model", "timeout_seconds": 40, "review_rate_per_hour": 9}, format="json")
    data = client.patch(URL, {"model": "", "timeout_seconds": None, "review_rate_per_hour": None}, format="json").json()
    assert data["model"]["effective"] == "default-model" and data["timeout_seconds"]["effective"] == 30
    assert data["review_rate_per_hour"]["effective"] == "30/hour"


@pytest.mark.parametrize("body", [
    {"model": "has space"}, {"model": "semi;colon"}, {"model": "-leading-dash"}, {"model": "x" * 81}, {"fallback_model": "../etc"},
    {"timeout_seconds": 4}, {"timeout_seconds": 121}, {"timeout_seconds": "slow"},
    {"review_rate_per_hour": 0}, {"review_rate_per_hour": 1001}, {"enabled": "maybe"},
])
def test_bad_values_are_rejected_and_nothing_is_saved(client, body):
    assert client.patch(URL, body, format="json").status_code == 400
    assert SystemSettings.objects.count() == 0 and AuditLog.objects.count() == 0


def test_the_api_key_cannot_be_changed_here(client, configured, settings):
    client.patch(URL, {"api_key": "stolen", "GEMINI_API_KEY": "stolen"}, format="json")
    assert settings.GEMINI_API_KEY == "secret-key-123"
    assert "stolen" not in str(client.get(URL).json())


def test_every_real_change_is_audited_and_a_no_op_is_not(client, admin, configured):
    client.patch(URL, {"model": "new-model", "enabled": False}, format="json")
    entry = AuditLog.objects.get()
    assert entry.action == "settings.ai_updated" and entry.actor == admin and entry.actor_email == "admin@example.com"
    assert entry.details == {"model": {"from": "", "to": "new-model"}, "enabled": {"from": True, "to": False}}
    client.patch(URL, {"model": "new-model"}, format="json")   # nothing changed
    assert AuditLog.objects.count() == 1


# --- the AI module follows the settings ------------------------------------------

def test_the_model_override_is_used_for_calls(client, configured, monkeypatch):
    client.patch(URL, {"model": "override-model"}, format="json")
    models = fake_ai(monkeypatch, ['{"a": 1}'])
    assert gemini.generate_json("hi") == {"a": 1}
    assert models.calls == ["override-model"]


def test_the_fallback_model_override_is_used_on_the_last_attempt(client, configured, monkeypatch):
    client.patch(URL, {"fallback_model": "backup-model"}, format="json")
    models = fake_ai(monkeypatch, [ApiError(503), ApiError(503), '{"a": 1}'])
    gemini.generate_json("hi")
    assert models.calls == ["default-model", "default-model", "backup-model"]


def test_switching_the_ai_off_makes_every_caller_fall_back(client, configured, monkeypatch):
    client.patch(URL, {"enabled": False}, format="json")
    models = fake_ai(monkeypatch, ['{"a": 1}'])
    assert gemini.is_configured() is False
    with pytest.raises(gemini.AIUnavailable):
        gemini.generate_json("hi")
    assert models.calls == [] and AICall.objects.count() == 0
    client.patch(URL, {"enabled": True}, format="json")
    assert gemini.is_configured() is True


def test_the_timeout_override_reaches_the_client(client, configured):
    client.patch(URL, {"timeout_seconds": 77}, format="json")
    assert store.ai_config()["timeout_seconds"] == 77


def test_the_review_limit_follows_the_admin_setting(client, configured):
    assert (AIReviewThrottle().num_requests, AIReviewThrottle().duration) == (30, 3600)
    client.patch(URL, {"review_rate_per_hour": 5}, format="json")
    assert (AIReviewThrottle().num_requests, AIReviewThrottle().duration) == (5, 3600)
    client.patch(URL, {"review_rate_per_hour": None}, format="json")
    assert AIReviewThrottle().num_requests == 30


# --- every AI call is logged -----------------------------------------------------

def test_a_successful_call_is_logged(configured, monkeypatch):
    fake_ai(monkeypatch, ['{"a": 1}'])
    gemini.generate_json("hi")
    call = AICall.objects.get()
    assert (call.ok, call.attempts, call.model, call.used_fallback, call.error_kind) == (True, 1, "default-model", False, "")
    assert call.latency_ms >= 0


def test_a_retry_that_works_is_one_call_with_two_attempts(configured, monkeypatch):
    fake_ai(monkeypatch, [ApiError(503), '{"a": 1}'])
    gemini.generate_json("hi")
    call = AICall.objects.get()
    assert call.ok is True and call.attempts == 2


def test_success_on_the_backup_model_is_marked(configured, settings, monkeypatch):
    settings.GEMINI_FALLBACK_MODEL = "backup-model"
    fake_ai(monkeypatch, [ApiError(503), ApiError(503), '{"a": 1}'])
    gemini.generate_json("hi")
    call = AICall.objects.get()
    assert call.ok is True and call.used_fallback is True and call.model == "backup-model" and call.attempts == 3


@pytest.mark.parametrize("error,kind,attempts", [
    (ApiError(429), "rate_limited", 3), (ApiError(503), "server_error", 3), (ApiError(504), "timeout", 3),
    (ApiError(401), "rejected", 1), (ApiError(404), "rejected", 1),
    (TimeoutError("read timeout"), "timeout", 3), (RuntimeError("boom"), "other", 3),
])
def test_failures_are_logged_with_a_reason(configured, monkeypatch, error, kind, attempts):
    fake_ai(monkeypatch, [error] * 3)
    with pytest.raises(gemini.AIError):
        gemini.generate_json("hi")
    call = AICall.objects.get()
    assert (call.ok, call.error_kind, call.attempts) == (False, kind, attempts)


def test_unusable_json_is_logged_as_bad_json(configured, monkeypatch):
    fake_ai(monkeypatch, ["not json", "still not", "nope"])
    with pytest.raises(gemini.AIError):
        gemini.generate_json("hi")
    assert AICall.objects.get().error_kind == "bad_json"


def test_a_missing_key_is_not_logged(settings):
    settings.GEMINI_API_KEY = ""
    with pytest.raises(gemini.AIUnavailable):
        gemini.generate_json("hi")
    assert AICall.objects.count() == 0


@pytest.mark.parametrize("module,purpose", [
    ("apps.scoring.feedback", "feedback"), ("apps.interviews.question_gen", "questions"),
    ("apps.interviews.speech_analysis", "speech_review"), ("apps.resumes.skill_extract", "resume_skills"),
    ("apps.something.new_feature", "new_feature"),
])
def test_the_feature_that_made_the_call_is_recorded(configured, monkeypatch, module, purpose):
    fake_ai(monkeypatch, ['{"a": 1}'])
    caller = {"__name__": module, "gemini": gemini}
    exec("def go():\n    return gemini.generate_json('hi')", caller)  # a function that lives in that module
    caller["go"]()
    assert AICall.objects.get().purpose == purpose


def test_a_logging_problem_never_breaks_the_call(configured, monkeypatch):
    fake_ai(monkeypatch, ['{"a": 1}'])
    monkeypatch.setattr(AICall.objects, "create", lambda **kw: (_ for _ in ()).throw(RuntimeError("db down")))
    assert gemini.generate_json("hi") == {"a": 1}


def test_a_settings_problem_never_breaks_the_call(configured, monkeypatch):
    fake_ai(monkeypatch, ['{"a": 1}'])
    monkeypatch.setattr(store, "ai_config", lambda: (_ for _ in ()).throw(RuntimeError("db down")))
    assert gemini.generate_json("hi") == {"a": 1}


# --- test connection -------------------------------------------------------------

def test_connection_test_works_and_is_audited(client, configured, monkeypatch):
    models = fake_ai(monkeypatch, ['{"ok": true}'])
    data = client.post(TEST_URL).json()
    assert data["ok"] is True and data["model"] == "default-model" and data["latency_ms"] >= 0
    assert models.calls == ["default-model"]
    assert AICall.objects.get().purpose == "settings_test"
    entry = AuditLog.objects.get()
    assert entry.action == "settings.ai_tested" and entry.details == {"ok": True, "reason": ""}


def test_connection_test_reports_why_it_failed(client, configured, monkeypatch):
    fake_ai(monkeypatch, [ApiError(401)])
    assert client.post(TEST_URL).json() == {"ok": False, "reason": "failed", "error_kind": "rejected", "model": "default-model"}


def test_connection_test_without_a_key_or_when_switched_off(client, configured, settings):
    settings.GEMINI_API_KEY = ""
    assert client.post(TEST_URL).json() == {"ok": False, "reason": "no_key"}
    settings.GEMINI_API_KEY = "k"
    client.patch(URL, {"enabled": False}, format="json")
    assert client.post(TEST_URL).json() == {"ok": False, "reason": "disabled"}
    assert AICall.objects.count() == 0


def test_connection_tests_are_limited_to_10_an_hour(client, configured, monkeypatch):
    fake_ai(monkeypatch, ['{"ok": true}'] * 11)
    assert [client.post(TEST_URL).status_code for _ in range(11)] == [200] * 10 + [429]


# --- admins' changes to users are audited ----------------------------------------

@pytest.fixture
def target(make_user):
    return make_user("target@example.com", first_name="Tara", last_name="Target")


def test_changing_a_role_is_audited(client, admin, target):
    assert client.patch(f"{USERS}{target.id}/", {"role": "recruiter"}, format="json").status_code == 200
    entry = AuditLog.objects.get()
    assert (entry.action, entry.target, entry.actor, entry.details) == ("user.role_changed", "target@example.com", admin, {"from": "candidate", "to": "recruiter"})


def test_deactivating_and_reactivating_are_audited(client, target):
    client.patch(f"{USERS}{target.id}/", {"is_active": False}, format="json")
    client.patch(f"{USERS}{target.id}/", {"is_active": True}, format="json")
    assert [e.action for e in AuditLog.objects.order_by("id")] == ["user.deactivated", "user.activated"]


def test_a_change_that_changes_nothing_is_not_audited(client, target):
    client.patch(f"{USERS}{target.id}/", {"role": "candidate", "is_active": True}, format="json")
    assert AuditLog.objects.count() == 0


def test_two_changes_at_once_are_two_entries(client, target):
    client.patch(f"{USERS}{target.id}/", {"role": "recruiter", "is_active": False}, format="json")
    assert sorted(e.action for e in AuditLog.objects.all()) == ["user.deactivated", "user.role_changed"]


def test_blocked_self_demotion_leaves_no_entry(client, admin):
    assert client.patch(f"{USERS}{admin.id}/", {"role": "candidate"}, format="json").status_code == 400
    assert AuditLog.objects.count() == 0


def test_the_audit_log_survives_the_account_being_deleted(client, admin, target):
    client.patch(f"{USERS}{target.id}/", {"role": "recruiter"}, format="json")
    admin.delete()
    entry = AuditLog.objects.get()
    assert entry.actor is None and entry.actor_email == "admin@example.com"
