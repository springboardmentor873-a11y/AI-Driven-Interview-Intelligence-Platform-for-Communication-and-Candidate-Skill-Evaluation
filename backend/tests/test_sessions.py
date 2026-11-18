import pytest

from apps.interviews.models import Answer, InterviewSession, Question
from apps.interviews.views import MAX_OPEN_SESSIONS

SESSIONS = "/api/interviews/sessions/"


@pytest.fixture(autouse=True)
def no_key(settings):
    settings.GEMINI_API_KEY = ""


@pytest.fixture
def client(auth_client, make_user):
    return auth_client(make_user("a@example.com"))


def create(client, **body):
    body = {"interview_type": "technical", "difficulty": "easy", "question_count": 3, **body}
    return client.post(SESSIONS, body, format="json")


def url(sid, action=""):
    return f"{SESSIONS}{sid}/{action + '/' if action else ''}"


def answer_next(client, sid, text="my answer", seconds=30):
    q = client.get(url(sid, "next-question")).data["question"]
    return client.post(url(sid, "answer"), {"question_id": q["id"], "transcript": text, "duration_seconds": seconds}, format="json")


# --- create -----------------------------------------------------------------

def test_create_saves_questions_and_hides_them(client):
    res = create(client)
    assert res.status_code == 201
    assert res.data["status"] == "scheduled" and res.data["question_total"] == 3
    assert res.data["question_source"] == "basic" and res.data["questions"] is None
    assert Question.objects.filter(session_id=res.data["id"]).count() == 3
    assert list(Question.objects.filter(session_id=res.data["id"]).values_list("order", flat=True)) == [1, 2, 3]


def test_create_uses_primary_resume_or_none(client):
    assert create(client).data["resume"] is None


def test_create_rejects_bad_input_and_other_peoples_resume(client, auth_client, make_user):
    assert create(client, interview_type="nope").status_code == 400
    assert create(client, question_count=99).status_code == 400
    assert create(client, resume_id=12345).status_code == 400


def test_create_is_capped_for_unfinished_sessions(client):
    for _ in range(MAX_OPEN_SESSIONS):
        assert create(client).status_code == 201
    res = create(client)
    assert res.status_code == 400 and "unfinished" in res.data["detail"]
    client.post(url(InterviewSession.objects.first().id, "cancel"))  # frees a slot
    assert create(client).status_code == 201


def test_only_candidates_can_use_sessions(auth_client, make_user, api):
    recruiter = auth_client(make_user("r@example.com", role="recruiter"))
    assert recruiter.get(SESSIONS).status_code == 403
    assert create(recruiter).status_code == 403
    assert api.get(SESSIONS).status_code == 401


# --- running an interview -----------------------------------------------------

def test_cannot_ask_or_answer_before_start(client):
    sid = create(client).data["id"]
    assert client.get(url(sid, "next-question")).status_code == 400
    assert client.post(url(sid, "answer"), {"question_id": 1}, format="json").status_code == 400


def test_start_sets_status_and_is_safe_to_repeat(client):
    sid = create(client).data["id"]
    first = client.post(url(sid, "start"))
    assert first.status_code == 200 and first.data["status"] == "in_progress"
    assert first.data["next_question"]["order"] == 1 and first.data["started_at"]
    again = client.post(url(sid, "start"))
    assert again.status_code == 200 and again.data["started_at"] == first.data["started_at"]


def test_full_interview_flow(client):
    sid = create(client).data["id"]
    client.post(url(sid, "start"))
    seen = []
    for i in (1, 2, 3):
        q = client.get(url(sid, "next-question")).data
        assert q["question"]["order"] == i and q["answered"] == i - 1 and q["total"] == 3
        seen.append(q["question"]["text"])
        res = answer_next(client, sid, text=f"answer {i}", seconds=10 * i)
        assert res.status_code == 200 and res.data["answered"] == i
    assert res.data["status"] == "completed" and res.data["next_question"] is None

    detail = client.get(url(sid)).data
    assert detail["status"] == "completed" and detail["ended_at"] and detail["answered_count"] == 3
    assert [q["text"] for q in detail["questions"]] == seen
    assert detail["questions"][1]["answer"]["transcript"] == "answer 2"
    assert detail["questions"][2]["answer"]["duration_seconds"] == 30


def test_questions_stay_hidden_while_in_progress(client):
    sid = create(client).data["id"]
    client.post(url(sid, "start"))
    assert client.get(url(sid)).data["questions"] is None


def test_answer_must_be_for_the_current_question(client):
    sid = create(client).data["id"]
    client.post(url(sid, "start"))
    questions = list(Question.objects.filter(session_id=sid))
    skip_ahead = client.post(url(sid, "answer"), {"question_id": questions[1].id}, format="json")
    assert skip_ahead.status_code == 400 and "question_id" in skip_ahead.data
    assert client.post(url(sid, "answer"), {"question_id": questions[0].id}, format="json").status_code == 200
    repeat = client.post(url(sid, "answer"), {"question_id": questions[0].id}, format="json")
    assert repeat.status_code == 400
    assert Answer.objects.filter(question__session_id=sid).count() == 1


@pytest.mark.parametrize("body", [{}, {"question_id": "x"}, {"question_id": 1, "duration_seconds": -1},
                                  {"question_id": 1, "duration_seconds": 9999}])
def test_answer_input_is_validated(client, body):
    sid = create(client).data["id"]
    client.post(url(sid, "start"))
    assert client.post(url(sid, "answer"), body, format="json").status_code == 400


def test_skipping_with_an_empty_answer_is_allowed(client):
    sid = create(client).data["id"]
    client.post(url(sid, "start"))
    assert answer_next(client, sid, text="", seconds=0).status_code == 200


def test_finish_early_keeps_unanswered_questions_unanswered(client):
    sid = create(client).data["id"]
    client.post(url(sid, "start"))
    answer_next(client, sid)
    res = client.post(url(sid, "finish"))
    assert res.status_code == 200 and res.data["status"] == "completed" and res.data["ended_at"]
    assert res.data["answered_count"] == 1 and res.data["question_total"] == 3
    assert [q["answer"] is not None for q in res.data["questions"]] == [True, False, False]
    assert client.post(url(sid, "finish")).status_code == 200  # repeat is harmless
    assert client.post(url(sid, "start")).status_code == 400
    assert client.get(url(sid, "next-question")).status_code == 400
    assert client.post(url(sid, "answer"), {"question_id": 1}, format="json").status_code == 400


def test_cannot_finish_before_starting(client):
    sid = create(client).data["id"]
    assert client.post(url(sid, "finish")).status_code == 400


def test_cancel(client):
    sid = create(client).data["id"]
    res = client.post(url(sid, "cancel"))
    assert res.status_code == 200 and res.data["status"] == "cancelled"
    assert client.post(url(sid, "start")).status_code == 400
    done = create(client).data["id"]
    client.post(url(done, "start"))
    for _ in range(3):
        answer_next(client, done)
    assert client.post(url(done, "cancel")).status_code == 400  # finished interviews stay finished


# --- history and privacy -------------------------------------------------------

def test_history_lists_only_own_sessions_newest_first(client, auth_client, make_user):
    first, second = create(client).data["id"], create(client).data["id"]
    client.post(url(first, "start"))
    answer_next(client, first)
    other = auth_client(make_user("b@example.com"))
    create(other)
    rows = client.get(SESSIONS).data
    assert [r["id"] for r in rows] == [second, first]
    assert rows[1]["answered_count"] == 1 and rows[1]["question_total"] == 3
    assert all(r["questions"] is None for r in rows)


@pytest.mark.parametrize("method,action", [("get", ""), ("post", "start"), ("get", "next-question"),
                                           ("post", "answer"), ("post", "finish"), ("post", "cancel")])
def test_other_users_sessions_are_not_found(client, auth_client, make_user, method, action):
    sid = create(client).data["id"]
    other = auth_client(make_user("b@example.com"))
    res = getattr(other, method)(url(sid, action), {"question_id": 1} if method == "post" else None, format="json")
    assert res.status_code == 404
