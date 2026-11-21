import pytest

from apps.interviews import speech_analysis as sa
from apps.interviews.attention import attention_info
from apps.interviews.models import Answer

SESSIONS = "/api/interviews/sessions/"

RAW = {"tracked_seconds": 40.0, "face_visible_pct": 96.0, "eye_contact_pct": 63.0,
       "look_away_events": 2, "longest_look_away_seconds": 3.5}


# --- scoring ---------------------------------------------------------------------

def test_attention_info_scores_against_a_natural_70_percent():
    info = attention_info(RAW)
    assert info["score"] == 90 and info["label"] == "good" and info["source"] == "browser"
    assert attention_info({**RAW, "eye_contact_pct": 80})["score"] == 100  # capped
    assert attention_info({**RAW, "eye_contact_pct": 42})["label"] == "fair"
    assert attention_info({**RAW, "eye_contact_pct": 10, "face_visible_pct": 20})["label"] == "low"


def test_attention_info_ignores_missing_or_too_short_measurements():
    assert attention_info(None) is None
    assert attention_info({}) is None
    assert attention_info({**RAW, "tracked_seconds": 3}) is None


def test_attention_is_kept_even_without_a_transcript_and_for_typed_answers():
    silent = sa.build_analysis("", 40, 120, attention=RAW)
    assert silent["status"] == "no_transcript" and silent["attention"]["score"] == 90
    typed = sa.build_analysis("word " * 40, 40, 120, "typed", attention=RAW)
    assert typed["attention"]["eye_contact_pct"] == 63.0


def test_attention_does_not_change_the_communication_score():
    text = "I built a REST API with Django and added caching " * 6
    assert sa.build_analysis(text, 60, 120)["communication_score"] == sa.build_analysis(text, 60, 120, attention=RAW)["communication_score"]


def test_quick_feedback_and_summary_include_eye_contact():
    one = sa.build_analysis("word " * 60, 30, 120, attention={**RAW, "tracked_seconds": 30})
    two = sa.build_analysis("word " * 60, 60, 120, attention={**RAW, "tracked_seconds": 60, "eye_contact_pct": 30,
                                                              "face_visible_pct": 90, "look_away_events": 1})
    untracked = sa.build_analysis("word " * 60, 30, 120)
    assert sa.quick_feedback(one)["eye_contact_pct"] == 63.0
    assert sa.quick_feedback(untracked)["eye_contact_pct"] is None
    summary = sa.summarize([one, two, untracked])
    assert summary["answers_tracked"] == 2
    assert summary["average_eye_contact_pct"] == pytest.approx((63 * 30 + 30 * 60) / 90, abs=0.1)  # weighted by time
    assert summary["look_away_events"] == 3
    empty = sa.summarize([untracked])
    assert empty["answers_tracked"] == 0 and empty["average_eye_contact_pct"] is None


# --- API -------------------------------------------------------------------------

@pytest.fixture
def client(auth_client, make_user):
    return auth_client(make_user("eye@example.com"))


def start(client, count=2):
    sid = client.post(SESSIONS, {"interview_type": "hr", "difficulty": "easy", "question_count": count}, format="json").data["id"]
    client.post(f"{SESSIONS}{sid}/start/")
    return sid


def answer(client, sid, **body):
    q = client.get(f"{SESSIONS}{sid}/next-question/").data["question"]
    return client.post(f"{SESSIONS}{sid}/answer/", {"question_id": q["id"], **body}, format="json")


def test_answer_stores_attention(client):
    sid = start(client)
    res = answer(client, sid, transcript="word " * 60, duration_seconds=42, attention=RAW)
    assert res.status_code == 200 and res.data["feedback"]["eye_contact_pct"] == 63.0
    stored = Answer.objects.get().analysis["attention"]
    assert stored["score"] == 90 and stored["look_away_events"] == 2


def test_answer_without_attention_still_works(client):
    sid = start(client)
    assert answer(client, sid, transcript="word " * 60, duration_seconds=40).status_code == 200
    assert Answer.objects.get().analysis["attention"] is None
    assert answer(client, sid, duration_seconds=0, attention=None).status_code == 200


@pytest.mark.parametrize("change", [
    {"eye_contact_pct": 101},
    {"face_visible_pct": -1},
    {"tracked_seconds": -2},
    {"look_away_events": 5000},
    {"eye_contact_pct": 90, "face_visible_pct": 50},      # eye contact without a visible face
    {"longest_look_away_seconds": 60},                    # longer than the measurement
    {"tracked_seconds": 400, "longest_look_away_seconds": 3},  # longer than the answer took
])
def test_impossible_attention_is_rejected(client, change):
    sid = start(client)
    res = answer(client, sid, transcript="word " * 60, duration_seconds=42, attention={**RAW, **change})
    assert res.status_code == 400
    assert not Answer.objects.exists()


def test_review_and_summary_show_attention(client):
    sid = start(client, count=1)
    answer(client, sid, transcript="word " * 60, duration_seconds=42, attention=RAW)
    detail = client.get(f"{SESSIONS}{sid}/").data
    assert detail["questions"][0]["answer"]["analysis"]["attention"]["label"] == "good"
    assert detail["speech_summary"]["average_eye_contact_pct"] == 63.0
