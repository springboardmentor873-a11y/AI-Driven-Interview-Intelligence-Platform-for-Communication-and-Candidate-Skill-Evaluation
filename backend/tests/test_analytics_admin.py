from datetime import timedelta

import pytest
from django.utils import timezone

from apps.analytics import admin_stats
from apps.interviews.models import InterviewSession, InterviewTemplate
from apps.resumes.models import Resume
from apps.scoring.models import Feedback
from apps.system import audit
from apps.system.models import AICall, AuditLog, SystemSettings
from tests.test_analytics_candidate import make_scored

BASE = "/api/analytics/admin/"
ENDPOINTS = [BASE, BASE + "activity/", BASE + "ai/"]


@pytest.fixture
def admin(make_user):
    return make_user("admin@example.com", role="admin", first_name="Ada", last_name="Admin")


@pytest.fixture
def client(admin, auth_client):
    return auth_client(admin)


def named(make_user, name, role="candidate"):
    first, _, last = name.partition(" ")
    return make_user(f"{first.lower()}@example.com", role=role, first_name=first, last_name=last)


def resume(user, source="ai"):
    return Resume.objects.create(user=user, file="resumes/x.pdf", original_name="x.pdf", parse_source=source)


def ai_call(minutes_ago=0, *, ok=True, purpose="feedback", model="gemini-2.5-flash", latency=800, error="", attempts=1, backup=False):
    call = AICall.objects.create(purpose=purpose, model=model, ok=ok, latency_ms=latency, error_kind=error, attempts=attempts, used_fallback=backup)
    AICall.objects.filter(pk=call.pk).update(created_at=timezone.now() - timedelta(minutes=minutes_ago))
    return call


# --- access ----------------------------------------------------------------------

@pytest.mark.parametrize("url", ENDPOINTS)
def test_signed_out_is_401(api, url):
    assert api.get(url).status_code == 401


@pytest.mark.parametrize("url", ENDPOINTS)
@pytest.mark.parametrize("role", ["candidate", "recruiter"])
def test_only_admins_can_open_platform_analytics(make_user, auth_client, url, role):
    assert auth_client(make_user(f"{role}@example.com", role=role)).get(url).status_code == 403


# --- overview --------------------------------------------------------------------

def test_an_empty_platform_gets_a_complete_overview(client):
    data = client.get(BASE).json()
    assert data["users"]["total"] == 1 and data["users"]["by_role"] == {"candidate": 0, "recruiter": 0, "admin": 1}
    assert data["interviews"]["total"] == 0 and data["interviews"]["average_overall"] is None and data["interviews"]["completion_rate"] is None
    assert data["interviews"]["average_duration_seconds"] is None and data["interviews"]["median_duration_seconds"] is None
    assert len(data["users"]["signups_weekly"]) == admin_stats.WEEKS and len(data["interviews"]["weekly"]) == admin_stats.WEEKS
    assert data["top_recruiters"] == [] and data["top_templates"] == []
    assert data["content"] == {"templates": 0, "published_templates": 0, "resumes": 0, "resume_sources": {"ai": 0, "basic": 0, "unparsed": 0}}
    assert data["ai"]["calls"] == 0 and data["ai"]["success_rate"] is None and data["ai"]["enabled"] is True


def test_user_numbers(make_user, client, admin):
    ana, rita = named(make_user, "Ana Adams"), named(make_user, "Rita Boss", "recruiter")
    old = named(make_user, "Old Timer")
    from django.contrib.auth import get_user_model
    get_user_model().objects.filter(pk=old.pk).update(date_joined=timezone.now() - timedelta(days=45), is_active=False)
    users = client.get(BASE).json()["users"]
    assert users["total"] == 4 and users["active"] == 3 and users["inactive"] == 1
    assert users["by_role"] == {"candidate": 2, "recruiter": 1, "admin": 1}
    assert users["new_last_7_days"] == 3 and users["new_last_30_days"] == 3
    weekly = users["signups_weekly"]
    assert weekly[0]["week_start"] < weekly[-1]["week_start"] and sum(w["signups"] for w in weekly) == 4 and weekly[-1]["signups"] == 3
    assert ana and rita


def test_active_users(make_user, client):
    rita = named(make_user, "Rita Boss", "recruiter")
    template = InterviewTemplate.objects.create(created_by=rita, title="T", interview_type="hr")
    ana, ben, cara = (named(make_user, n) for n in ("Ana Adams", "Ben Brown", "Cara Clark"))
    make_scored(ana, 70, template=template)
    make_scored(ben, 70)                       # practice interview, no template
    old = make_scored(cara, 70, template=template)
    InterviewSession.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=20))
    users = client.get(BASE).json()["users"]
    assert users["active_candidates_7_days"] == 2 and users["active_candidates_30_days"] == 3
    assert users["active_recruiters_30_days"] == 1


def test_interview_numbers_cover_every_recruiter_and_practice_runs(make_user, client):
    rita, oscar = named(make_user, "Rita Boss", "recruiter"), named(make_user, "Oscar Other", "recruiter")
    t1 = InterviewTemplate.objects.create(created_by=rita, title="T1", interview_type="technical")
    t2 = InterviewTemplate.objects.create(created_by=oscar, title="T2", interview_type="hr")
    ana = named(make_user, "Ana Adams")
    make_scored(ana, 80, template=t1, interview_type="technical")
    make_scored(ana, 60, template=t2, interview_type="hr")
    make_scored(ana, 70, interview_type="hr")                                       # a practice interview counts too
    make_scored(ana, with_score=False, status="cancelled", interview_type="hr")
    make_scored(ana, with_score=False, status="in_progress", interview_type="technical")
    data = client.get(BASE).json()["interviews"]
    assert data["total"] == 5 and data["status_counts"] == {"scheduled": 0, "in_progress": 1, "completed": 3, "cancelled": 1}
    assert data["type_counts"] == {"technical": 2, "hr": 3}
    assert data["scored"] == 3 and data["average_overall"] == 70 and data["best_overall"] == 80
    assert data["completion_rate"] == 75
    assert data["rating_counts"]["good"] == 1 and data["rating_counts"]["average"] == 2
    assert {p["key"]: p["average"] for p in data["parts"]}["communication"] == 70


def test_interview_length(make_user, client):
    ana = named(make_user, "Ana Adams")
    for minutes in (10, 20, 60):
        session = make_scored(ana, 70)
        start = timezone.now() - timedelta(hours=3)
        InterviewSession.objects.filter(pk=session.pk).update(started_at=start, ended_at=start + timedelta(minutes=minutes))
    data = client.get(BASE).json()["interviews"]
    assert data["average_duration_seconds"] == 30 * 60 and data["median_duration_seconds"] == 20 * 60


def test_weekly_interviews(make_user, client):
    ana = named(make_user, "Ana Adams")
    now = timezone.now()
    make_scored(ana, 50, ended=now - timedelta(weeks=2))
    make_scored(ana, 70, ended=now - timedelta(weeks=2))
    make_scored(ana, 90, ended=now)
    old = make_scored(ana, 10, ended=now - timedelta(weeks=40))
    InterviewSession.objects.filter(pk=old.pk).update(created_at=now - timedelta(weeks=40))
    weekly = client.get(BASE).json()["interviews"]["weekly"]
    assert weekly[0]["week_start"] < weekly[-1]["week_start"]
    assert (weekly[-1]["completed"], weekly[-1]["average_overall"]) == (1, 90)
    assert (weekly[-3]["completed"], weekly[-3]["average_overall"]) == (2, 60)
    assert sum(w["completed"] for w in weekly) == 3 and sum(w["started"] for w in weekly) == 3


def test_content_numbers(make_user, client):
    rita = named(make_user, "Rita Boss", "recruiter")
    InterviewTemplate.objects.create(created_by=rita, title="A", interview_type="hr")
    InterviewTemplate.objects.create(created_by=rita, title="B", interview_type="hr", is_published=False)
    ana = named(make_user, "Ana Adams")
    for source in ("ai", "ai", "basic", ""):
        resume(ana, source)
    assert client.get(BASE).json()["content"] == {
        "templates": 2, "published_templates": 1, "resumes": 4, "resume_sources": {"ai": 2, "basic": 1, "unparsed": 1},
    }


def test_busiest_recruiters_and_templates(make_user, client):
    rita, oscar = named(make_user, "Rita Boss", "recruiter"), named(make_user, "Oscar Other", "recruiter")
    quiet = named(make_user, "Quiet Recruiter", "recruiter")
    t1 = InterviewTemplate.objects.create(created_by=rita, title="Backend", interview_type="technical")
    t2 = InterviewTemplate.objects.create(created_by=rita, title="Frontend", interview_type="technical")
    t3 = InterviewTemplate.objects.create(created_by=oscar, title="HR", interview_type="hr")
    InterviewTemplate.objects.create(created_by=quiet, title="Unused", interview_type="hr")
    ana, ben = named(make_user, "Ana Adams"), named(make_user, "Ben Brown")
    for who, template, overall in [(ana, t1, 80), (ben, t1, 60), (ana, t2, 90), (ben, t3, 50)]:
        make_scored(who, overall, template=template)
    make_scored(ana, with_score=False, status="in_progress", template=t1)
    data = client.get(BASE).json()
    first, second = data["top_recruiters"]
    assert first["recruiter"]["name"] == "Rita Boss" and (first["templates"], first["candidates"], first["interviews"], first["completed"]) == (2, 2, 4, 3)
    assert first["average_overall"] == 76.7 and second["recruiter"]["name"] == "Oscar Other" and second["interviews"] == 1
    assert [t["title"] for t in data["top_templates"]] == ["Backend", "Frontend", "HR"]       # the unused template is not listed
    assert data["top_templates"][0] == {"id": t1.id, "title": "Backend", "interview_type": "technical", "owner": "Rita Boss", "sessions": 3, "completed": 2, "average_overall": 70}


def test_the_overview_includes_a_small_ai_summary(client):
    ai_call(5)
    ai_call(10, ok=False, error="timeout")
    ai_call(60 * 30)   # more than a day ago
    SystemSettings.objects.create(ai_enabled=False)
    ai = client.get(BASE).json()["ai"]
    assert (ai["calls"], ai["successes"], ai["failures"], ai["success_rate"], ai["enabled"]) == (2, 1, 1, 50, False)


# --- activity feed ---------------------------------------------------------------

def test_the_feed_merges_every_source_newest_first(make_user, client, admin):
    rita = named(make_user, "Rita Boss", "recruiter")
    template = InterviewTemplate.objects.create(created_by=rita, title="Backend", interview_type="technical")
    ana = named(make_user, "Ana Adams")
    resume(ana)
    session = make_scored(ana, 80, template=template)
    InterviewSession.objects.filter(pk=session.pk).update(started_at=timezone.now() - timedelta(minutes=30))
    audit.record(admin, "user.role_changed", "ana@example.com", {"from": "candidate", "to": "recruiter"})
    results = client.get(BASE + "activity/").json()["results"]
    kinds = {r["kind"] for r in results}
    assert kinds == {"signup", "interview", "resume", "template", "admin"}
    assert [r["at"] for r in results] == sorted((r["at"] for r in results), reverse=True)
    by = {(r["kind"], r["event"]): r for r in results}
    assert by[("interview", "completed")]["summary"] == "Ana Adams finished Backend with a score of 80"
    assert by[("interview", "started")]["summary"] == "Ana Adams started Backend"
    assert {"Ana Adams joined as a candidate", "Rita Boss joined as a recruiter", "Ada Admin joined as a admin"} <= {r["summary"] for r in results if r["kind"] == "signup"}
    assert by[("resume", "uploaded")]["summary"] == "Ana Adams uploaded a resume"
    assert by[("template", "created")]["summary"] == "Rita Boss created the template “Backend” (published)"
    assert by[("admin", "user.role_changed")]["summary"] == "admin@example.com changed the role of ana@example.com from candidate to recruiter"
    assert by[("interview", "completed")]["actor"] == {"id": ana.id, "name": "Ana Adams", "email": "ana@example.com"}


def test_the_feed_can_be_limited_to_one_kind(make_user, client, admin):
    ana = named(make_user, "Ana Adams")
    resume(ana)
    audit.record(admin, "user.deactivated", "ana@example.com")
    assert {r["kind"] for r in client.get(BASE + "activity/", {"kind": "admin"}).json()["results"]} == {"admin"}
    assert {r["kind"] for r in client.get(BASE + "activity/", {"kind": "resume"}).json()["results"]} == {"resume"}


def test_admin_actions_read_clearly(client, admin):
    audit.record(admin, "user.deactivated", "a@example.com")
    audit.record(admin, "user.activated", "a@example.com")
    audit.record(admin, "settings.ai_updated", "AI settings", {"model": {"from": "", "to": "x"}, "enabled": {"from": True, "to": False}})
    audit.record(admin, "settings.ai_tested", "AI connection", {"ok": False})
    audit.record(admin, "something.new", "x")
    summaries = {r["event"]: r["summary"] for r in client.get(BASE + "activity/", {"kind": "admin"}).json()["results"]}
    assert summaries["user.deactivated"] == "admin@example.com deactivated a@example.com"
    assert summaries["user.activated"] == "admin@example.com reactivated a@example.com"
    assert summaries["settings.ai_updated"] == "admin@example.com changed the AI settings (enabled, model)"
    assert summaries["settings.ai_tested"] == "admin@example.com tested the AI connection (it did not work)"
    assert summaries["something.new"] == "admin@example.com: something.new"


def test_an_entry_still_names_the_admin_after_the_account_is_gone(client, make_user):
    gone = make_user("gone@example.com", role="admin")
    audit.record(gone, "user.deactivated", "a@example.com")
    gone.delete()
    entry = client.get(BASE + "activity/", {"kind": "admin"}).json()["results"][0]
    assert entry["actor"] == {"id": None, "name": "gone@example.com", "email": "gone@example.com"}


def test_a_new_account_with_no_name_is_shown_by_its_email(make_user, client):
    make_user("plain.person@example.com")
    summaries = [r["summary"] for r in client.get(BASE + "activity/", {"kind": "signup"}).json()["results"]]
    assert "plain.person joined as a candidate" in summaries


def test_the_feed_limit(make_user, client):
    for index in range(5):
        make_user(f"u{index}@example.com")
    assert len(client.get(BASE + "activity/", {"limit": 3}).json()["results"]) == 3
    assert client.get(BASE + "activity/", {"limit": 3}).json()["limit"] == 3


@pytest.mark.parametrize("params", [{"kind": "gossip"}, {"limit": 0}, {"limit": 101}, {"limit": "x"}])
def test_bad_feed_parameters_are_400(client, params):
    assert client.get(BASE + "activity/", params).status_code == 400


def test_the_feed_returns_the_newest_even_when_one_source_is_busy(make_user, client):
    ana = named(make_user, "Ana Adams")
    for _ in range(6):
        resume(ana)
    newest = make_user("newest@example.com")
    results = client.get(BASE + "activity/", {"limit": 3}).json()["results"]
    assert results[0]["summary"].startswith("newest joined") and len(results) == 3
    assert newest


# --- AI usage --------------------------------------------------------------------

def test_ai_usage_with_no_calls(client, settings):
    settings.GEMINI_API_KEY = ""
    data = client.get(BASE + "ai/").json()
    assert data["windows"]["last_24_hours"] == {"calls": 0, "successes": 0, "failures": 0, "success_rate": None, "average_latency_ms": None, "used_backup_model": 0}
    assert data["by_purpose"] == [] and data["by_model"] == [] and data["errors"] == [] and data["recent_failures"] == []
    assert len(data["daily"]) == admin_stats.AI_DAYS and all(d["calls"] == 0 for d in data["daily"])
    assert data["config"]["key_configured"] is False and data["config"]["enabled"] is True
    assert data["coverage"] == {"feedback": {"ai": 0, "basic": 0}, "resumes": {"ai": 0, "basic": 0}}


def test_ai_usage_windows(client):
    ai_call(30, latency=1000)
    ai_call(60, latency=3000)
    ai_call(90, ok=False, error="rate_limited", attempts=3)
    ai_call(60 * 24 * 3, latency=500, backup=True)          # 3 days ago
    ai_call(60 * 24 * 20)                                   # 20 days ago
    ai_call(60 * 24 * 40)                                   # too old for any window
    windows = client.get(BASE + "ai/").json()["windows"]
    assert windows["last_24_hours"] == {"calls": 3, "successes": 2, "failures": 1, "success_rate": 67, "average_latency_ms": 2000, "used_backup_model": 0}
    assert windows["last_7_days"]["calls"] == 4 and windows["last_7_days"]["used_backup_model"] == 1
    assert windows["last_30_days"]["calls"] == 5


def test_ai_usage_breakdowns(client):
    ai_call(10, purpose="feedback", model="m1", latency=1000)
    ai_call(20, purpose="feedback", model="m1", ok=False, error="timeout")
    ai_call(30, purpose="questions", model="m2", latency=3000)
    ai_call(60 * 24 * 10, purpose="questions", model="m2")   # outside the 7-day breakdown
    data = client.get(BASE + "ai/").json()
    assert data["by_purpose"] == [
        {"name": "feedback", "calls": 2, "failures": 1, "average_latency_ms": 1000},
        {"name": "questions", "calls": 1, "failures": 0, "average_latency_ms": 3000},
    ]
    assert [(m["name"], m["calls"]) for m in data["by_model"]] == [("m1", 2), ("m2", 1)]
    assert data["errors"] == [{"kind": "timeout", "count": 1}]


def test_ai_daily_series_and_recent_failures(client):
    ai_call(10)
    ai_call(20, ok=False, error="rejected", purpose="questions", model="bad-model", attempts=1)
    ai_call(60 * 24 * 2, ok=False, error="timeout")
    data = client.get(BASE + "ai/").json()
    assert data["daily"][0]["date"] < data["daily"][-1]["date"]
    assert (data["daily"][-1]["calls"], data["daily"][-1]["failures"]) == (2, 1)
    assert sum(d["calls"] for d in data["daily"]) == 3
    assert [f["error_kind"] for f in data["recent_failures"]] == ["rejected", "timeout"]
    assert data["recent_failures"][0] == {"at": data["recent_failures"][0]["at"], "purpose": "questions", "model": "bad-model", "error_kind": "rejected", "attempts": 1}


def test_ai_coverage_shows_how_much_used_the_fallback(make_user, client):
    ana = named(make_user, "Ana Adams")
    for source in ("ai", "ai", "basic"):
        session = make_scored(ana, 70)
        Feedback.objects.create(session=session, source=source)
    resume(ana, "ai")
    resume(ana, "basic")
    resume(ana, "basic")
    resume(ana, "")
    assert client.get(BASE + "ai/").json()["coverage"] == {"feedback": {"ai": 2, "basic": 1}, "resumes": {"ai": 1, "basic": 2}}


def test_ai_usage_shows_the_effective_settings_but_never_the_key(client, settings):
    settings.GEMINI_API_KEY = "secret-key-123"
    settings.GEMINI_MODEL = "default-model"
    SystemSettings.objects.create(gemini_model="override-model", ai_enabled=False)
    data = client.get(BASE + "ai/").json()
    assert data["config"] == {"enabled": False, "key_configured": True, "model": "override-model", "fallback_model": ""}
    assert "secret-key-123" not in str(data)


# --- speed -----------------------------------------------------------------------

def test_query_counts_do_not_grow_with_the_amount_of_data(make_user, client, django_assert_max_num_queries):
    rita = named(make_user, "Rita Boss", "recruiter")
    template = InterviewTemplate.objects.create(created_by=rita, title="T", interview_type="hr")
    for index in range(10):
        person = make_user(f"p{index}@example.com", first_name=f"P{index}", last_name="Test")
        make_scored(person, 60 + index, template=template)
        resume(person)
        ai_call(index, ok=index % 3 != 0, error="timeout")
        audit.record(rita, "user.activated", person.email)
    with django_assert_max_num_queries(20):
        assert client.get(BASE).status_code == 200
    with django_assert_max_num_queries(8):
        assert client.get(BASE + "activity/", {"limit": 100}).status_code == 200
    with django_assert_max_num_queries(16):
        assert client.get(BASE + "ai/").status_code == 200
