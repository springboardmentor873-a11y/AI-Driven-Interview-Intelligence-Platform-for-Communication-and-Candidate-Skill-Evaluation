import pytest

from apps.interviews.models import InterviewSession, InterviewTemplate, Question
from apps.interviews.views import MAX_TEMPLATES_PER_RECRUITER

TEMPLATES = "/api/interviews/templates/"
SESSIONS = "/api/interviews/sessions/"

BODY = {
    "title": "Backend screening", "description": "First round", "interview_type": "technical",
    "difficulty": "hard", "domain": "fintech", "duration_minutes": 20, "question_count": 4,
}


@pytest.fixture(autouse=True)
def no_key(settings):
    settings.GEMINI_API_KEY = ""


@pytest.fixture
def recruiter(auth_client, make_user):
    return auth_client(make_user("r@example.com", role="recruiter", first_name="Rita", last_name="Rao"))


@pytest.fixture
def candidate(auth_client, make_user):
    return auth_client(make_user("c@example.com"))


def make(recruiter, **over):
    return recruiter.post(TEMPLATES, {**BODY, **over}, format="json")


# --- recruiter CRUD -----------------------------------------------------------

def test_recruiter_creates_and_lists_own_templates(recruiter):
    res = make(recruiter)
    assert res.status_code == 201
    assert res.data["is_published"] is True and res.data["session_count"] == 0
    assert InterviewTemplate.objects.get(id=res.data["id"]).created_by.email == "r@example.com"
    rows = recruiter.get(TEMPLATES).data
    assert [r["title"] for r in rows] == ["Backend screening"]


def test_title_and_domain_are_tidied(recruiter):
    res = make(recruiter, title="  Backend   screening  ", domain="  fin   tech ")
    assert res.data["title"] == "Backend screening" and res.data["domain"] == "fin tech"


@pytest.mark.parametrize("over", [
    {"title": ""}, {"title": "   "}, {"title": "x" * 201}, {"interview_type": "nope"}, {"difficulty": "insane"},
    {"question_count": 0}, {"question_count": 21}, {"duration_minutes": 4}, {"duration_minutes": 181},
    {"domain": "x" * 101}, {"description": "x" * 2001},
])
def test_invalid_templates_are_rejected(recruiter, over):
    assert make(recruiter, **over).status_code == 400


def test_duration_must_fit_the_questions(recruiter):
    res = make(recruiter, duration_minutes=5, question_count=15)  # 15 questions need 8 minutes
    assert res.status_code == 400 and "8 minutes" in res.data["duration_minutes"][0]
    assert make(recruiter, duration_minutes=8, question_count=15).status_code == 201


def test_update_and_partial_update(recruiter):
    tid = make(recruiter).data["id"]
    res = recruiter.patch(f"{TEMPLATES}{tid}/", {"title": "Renamed", "is_published": False}, format="json")
    assert res.status_code == 200 and res.data["title"] == "Renamed" and res.data["is_published"] is False
    too_short = recruiter.patch(f"{TEMPLATES}{tid}/", {"question_count": 20, "duration_minutes": 5}, format="json")
    assert too_short.status_code == 400
    # a partial update is checked against the saved values too: 20 minutes still fits 20 questions
    assert recruiter.patch(f"{TEMPLATES}{tid}/", {"question_count": 20}, format="json").status_code == 200
    assert recruiter.patch(f"{TEMPLATES}{tid}/", {"duration_minutes": 5}, format="json").status_code == 400
    full = recruiter.put(f"{TEMPLATES}{tid}/", {**BODY, "title": "Full update"}, format="json")
    assert full.status_code == 200 and full.data["title"] == "Full update"


def test_delete_keeps_existing_sessions(recruiter, candidate):
    tid = make(recruiter).data["id"]
    sid = candidate.post(SESSIONS, {"template_id": tid}, format="json").data["id"]
    assert recruiter.delete(f"{TEMPLATES}{tid}/").status_code == 204
    session = InterviewSession.objects.get(id=sid)
    assert session.template is None and session.questions.count() == 4


def test_recruiters_cannot_touch_each_others_templates(recruiter, auth_client, make_user):
    tid = make(recruiter).data["id"]
    other = auth_client(make_user("r2@example.com", role="recruiter"))
    assert other.get(TEMPLATES).data == []
    for call in (other.get, other.delete):
        assert call(f"{TEMPLATES}{tid}/").status_code == 404
    assert other.patch(f"{TEMPLATES}{tid}/", {"title": "Hijack"}, format="json").status_code == 404
    assert InterviewTemplate.objects.get(id=tid).title == "Backend screening"


def test_template_count_is_capped(recruiter):
    for i in range(MAX_TEMPLATES_PER_RECRUITER):
        InterviewTemplate.objects.create(created_by=recruiter.handler._force_user, title=f"T{i}", interview_type="hr")
    res = make(recruiter)
    assert res.status_code == 400 and "up to" in res.data["detail"]


# --- who can do what --------------------------------------------------------------

def test_candidates_can_read_but_never_write(recruiter, candidate):
    tid = make(recruiter).data["id"]
    assert candidate.post(TEMPLATES, BODY, format="json").status_code == 403
    assert candidate.patch(f"{TEMPLATES}{tid}/", {"title": "x"}, format="json").status_code == 403
    assert candidate.delete(f"{TEMPLATES}{tid}/").status_code == 403
    assert candidate.get(f"{TEMPLATES}{tid}/").status_code == 200


def test_candidates_only_see_published_templates_without_recruiter_stats(recruiter, candidate):
    shown = make(recruiter, title="Visible").data["id"]
    hidden = make(recruiter, title="Draft", is_published=False).data["id"]
    rows = candidate.get(TEMPLATES).data
    assert [r["id"] for r in rows] == [shown]
    assert rows[0]["recruiter_name"] == "Rita Rao"
    assert "session_count" not in rows[0] and "is_published" not in rows[0]
    assert "r@example.com" not in str(rows)
    assert candidate.get(f"{TEMPLATES}{hidden}/").status_code == 404


def test_admin_can_read_everything_but_not_write(recruiter, auth_client, make_user):
    make(recruiter, is_published=False)
    admin = auth_client(make_user("a@example.com", role="admin"))
    assert len(admin.get(TEMPLATES).data) == 1
    assert admin.post(TEMPLATES, BODY, format="json").status_code == 403


def test_anonymous_is_rejected(api):
    assert api.get(TEMPLATES).status_code == 401


# --- sessions from templates --------------------------------------------------------

def test_session_from_template_uses_the_templates_settings(recruiter, candidate):
    tid = make(recruiter).data["id"]
    res = candidate.post(SESSIONS, {"template_id": tid, "interview_type": "hr", "question_count": 2}, format="json")
    assert res.status_code == 201
    assert res.data["template"] == tid and res.data["template_title"] == "Backend screening"
    assert (res.data["interview_type"], res.data["difficulty"], res.data["domain"]) == ("technical", "hard", "fintech")
    assert res.data["question_total"] == 4  # the template wins over the request body


def test_template_duration_is_split_across_questions(recruiter, candidate):
    tid = make(recruiter, duration_minutes=20, question_count=4).data["id"]  # 1200 s / 4 questions
    sid = candidate.post(SESSIONS, {"template_id": tid}, format="json").data["id"]
    assert set(Question.objects.filter(session_id=sid).values_list("time_limit_seconds", flat=True)) == {300}


def test_per_question_time_is_kept_in_a_sensible_range(recruiter, candidate):
    tid = make(recruiter, duration_minutes=180, question_count=1).data["id"]  # 10800 s would be far too long
    sid = candidate.post(SESSIONS, {"template_id": tid}, format="json").data["id"]
    assert Question.objects.get(session_id=sid).time_limit_seconds == 600


def test_unpublished_or_missing_template_cannot_be_used(recruiter, candidate):
    hidden = make(recruiter, is_published=False).data["id"]
    for tid in (hidden, 99999):
        res = candidate.post(SESSIONS, {"template_id": tid}, format="json")
        assert res.status_code == 400 and "template_id" in res.data


def test_without_a_template_the_type_is_still_required(candidate):
    assert candidate.post(SESSIONS, {"difficulty": "easy"}, format="json").status_code == 400
    assert candidate.post(SESSIONS, {"interview_type": "hr", "question_count": 2}, format="json").status_code == 201


def test_session_count_shows_for_the_recruiter(recruiter, candidate):
    tid = make(recruiter).data["id"]
    candidate.post(SESSIONS, {"template_id": tid}, format="json")
    assert recruiter.get(f"{TEMPLATES}{tid}/").data["session_count"] == 1
