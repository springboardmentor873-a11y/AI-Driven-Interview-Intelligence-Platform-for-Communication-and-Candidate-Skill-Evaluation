import pytest

from apps.interviews import behavior as sg
from apps.interviews import speech_analysis as sa
from apps.interviews.models import Answer

SESSIONS = "/api/interviews/sessions/"

ATTENTION = {"tracked_seconds": 40.0, "face_visible_pct": 96.0, "eye_contact_pct": 63.0,
             "look_away_events": 2, "longest_look_away_seconds": 3.5}
EXPRESSION = {"face_seconds": 38.0, "smile_pct": 20.0, "tense_pct": 10.0, "raised_pct": 10.0, "neutral_pct": 60.0}
HESITATION = {"response_delay_seconds": 2.0, "long_pauses": 1, "longest_pause_seconds": 3.0, "total_pause_seconds": 3.0}
TEXT = "I built a REST API with Django and added caching " * 6


# --- expression ------------------------------------------------------------------

def test_expression_info_summarises_shares():
    info = sg.expression_info(EXPRESSION)
    assert info["dominant"] == "neutral" and info["source"] == "browser"
    assert info["expressiveness"] == 88            # (20 + 10 + 5) / 40
    assert info["composure"] == 75                 # 100 - 10 * 2.5


def test_expression_scores_are_capped_and_ignore_too_little_face_time():
    lively = sg.expression_info({**EXPRESSION, "smile_pct": 60, "neutral_pct": 20, "tense_pct": 10, "raised_pct": 10})
    assert lively["expressiveness"] == 100 and lively["dominant"] == "smile"
    assert sg.expression_info({**EXPRESSION, "tense_pct": 90, "neutral_pct": 0, "smile_pct": 0, "raised_pct": 10})["composure"] == 0
    assert sg.expression_info({**EXPRESSION, "face_seconds": 2}) is None
    assert sg.expression_info(None) is None


# --- hesitation ------------------------------------------------------------------

def test_hesitation_scores_delay_and_pauses():
    calm = sg.hesitation_info({**HESITATION, "long_pauses": 0, "longest_pause_seconds": 0, "total_pause_seconds": 0, "response_delay_seconds": 1}, 60)
    assert calm["score"] == 100 and calm["label"] == "good"
    slow = sg.hesitation_info({**HESITATION, "response_delay_seconds": 15}, 60)  # 12 s past the natural 3 s
    assert slow["score"] < 60
    pauses_only = sg.hesitation_info({**HESITATION, "response_delay_seconds": 1, "long_pauses": 6, "longest_pause_seconds": 4, "total_pause_seconds": 20}, 60)
    assert pauses_only["label"] == "fair"           # a quick start balances constant pausing
    many = sg.hesitation_info({**HESITATION, "response_delay_seconds": 10, "long_pauses": 6, "longest_pause_seconds": 4, "total_pause_seconds": 20}, 60)
    assert many["label"] == "low"
    assert sg.hesitation_info(None, 60) is None


def test_one_pause_in_a_short_answer_is_not_harsh():
    short = sg.hesitation_info({**HESITATION, "response_delay_seconds": 1}, 20)
    assert short["score"] >= 85  # pause rate is measured over at least a minute


# --- confidence ------------------------------------------------------------------

def full(**over):
    args = dict(transcript=TEXT, duration_seconds=60, time_limit_seconds=120, source="speech", speech_confidence=0.9,
                attention=ATTENTION, expression=EXPRESSION, hesitation=HESITATION)
    args.update(over)
    return sa.build_analysis(**args)


def test_confidence_combines_the_five_parts():
    result = full()
    c = result["confidence"]
    assert set(c["parts"]) == {"eye_contact", "attention_level", "facial_engagement", "hesitation", "speaking_confidence"}
    assert c["parts"]["eye_contact"] == 90
    assert c["parts"]["attention_level"] == 80      # 96 face visible - 2 look-aways * 8
    assert c["parts"]["facial_engagement"] == 88
    assert 0 <= c["score"] <= 100 and c["label"] in {"good", "fair", "low"}


def test_confidence_drops_parts_that_are_missing_and_needs_two():
    only_speech = full(attention=None, expression=None, hesitation=None)
    # speaking confidence alone is one part: not enough for a confidence score
    assert only_speech["confidence"] is None
    two = full(attention=None, expression=None)
    assert two["confidence"]["parts"]["eye_contact"] is None and two["confidence"]["parts"]["hesitation"] is not None


def test_no_confidence_for_typed_silent_or_skipped_answers():
    assert full(source="typed")["confidence"] is None
    assert full(source="typed")["hesitation"] is None   # typing has no pauses to measure
    silent = full(transcript="", duration_seconds=40)
    assert silent["status"] == "no_transcript" and silent["confidence"] is None
    assert silent["expression"]["dominant"] == "neutral"  # still stored: it describes the face, not the speech
    assert full(transcript="", duration_seconds=0)["confidence"] is None


def test_better_behaviour_gives_a_better_confidence_score():
    good = full(attention={**ATTENTION, "eye_contact_pct": 70, "look_away_events": 0, "face_visible_pct": 100},
                hesitation={**HESITATION, "long_pauses": 0, "longest_pause_seconds": 0, "total_pause_seconds": 0, "response_delay_seconds": 1})
    poor = full(attention={**ATTENTION, "eye_contact_pct": 15, "look_away_events": 5},
                expression={**EXPRESSION, "tense_pct": 60, "neutral_pct": 30, "smile_pct": 5, "raised_pct": 5},
                hesitation={**HESITATION, "long_pauses": 5, "longest_pause_seconds": 6, "total_pause_seconds": 20, "response_delay_seconds": 12})
    assert good["confidence"]["score"] > 85 and poor["confidence"]["score"] < 50


def test_confidence_does_not_change_the_communication_score():
    assert full()["communication_score"] == full(attention=None, expression=None, hesitation=None)["communication_score"]


def test_summary_covers_confidence_expression_and_hesitation():
    a, b = full(), full(hesitation={**HESITATION, "response_delay_seconds": 4.0, "long_pauses": 3, "longest_pause_seconds": 3, "total_pause_seconds": 9})
    summary = sa.summarize([a, b, sa.build_analysis("", 0, 120)])
    assert summary["answers_with_confidence"] == 2
    assert summary["average_confidence"] == pytest.approx((a["confidence"]["score"] + b["confidence"]["score"]) / 2, abs=0.1)
    assert summary["average_confidence_parts"]["eye_contact"] == 90
    assert summary["expression_shares"]["smile"] == 20.0
    assert summary["average_response_delay"] == 3.0 and summary["long_pauses"] == 4
    empty = sa.summarize([])
    assert empty["average_confidence"] is None and empty["expression_shares"]["smile"] is None


# --- API -------------------------------------------------------------------------

@pytest.fixture
def client(auth_client, make_user):
    return auth_client(make_user("signals@example.com"))


def start(client, count=2):
    sid = client.post(SESSIONS, {"interview_type": "hr", "difficulty": "easy", "question_count": count}, format="json").data["id"]
    client.post(f"{SESSIONS}{sid}/start/")
    return sid


def answer(client, sid, **body):
    q = client.get(f"{SESSIONS}{sid}/next-question/").data["question"]
    return client.post(f"{SESSIONS}{sid}/answer/", {"question_id": q["id"], **body}, format="json")


def test_answer_stores_expression_hesitation_and_confidence(client):
    sid = start(client)
    res = answer(client, sid, transcript=TEXT, duration_seconds=42, speech_confidence=0.9,
                 attention=ATTENTION, expression=EXPRESSION, hesitation=HESITATION)
    assert res.status_code == 200
    stored = Answer.objects.get().analysis
    assert stored["expression"]["dominant"] == "neutral"
    assert stored["hesitation"]["long_pauses"] == 1
    assert stored["confidence"]["parts"]["eye_contact"] == 90


def test_answer_works_without_the_new_fields(client):
    sid = start(client)
    assert answer(client, sid, transcript=TEXT, duration_seconds=42).status_code == 200
    stored = Answer.objects.get().analysis
    assert stored["expression"] is None and stored["hesitation"] is None and stored["confidence"] is None


@pytest.mark.parametrize("field,change", [
    ("expression", {"smile_pct": 101}),
    ("expression", {"smile_pct": 60, "neutral_pct": 60}),            # more than 100% together
    ("expression", {"face_seconds": 400}),                           # longer than the answer
    ("hesitation", {"long_pauses": -1}),
    ("hesitation", {"longest_pause_seconds": 9, "total_pause_seconds": 3}),
    ("hesitation", {"response_delay_seconds": 500}),
    ("hesitation", {"total_pause_seconds": 100, "longest_pause_seconds": 3}),
])
def test_impossible_values_are_rejected(client, field, change):
    sid = start(client)
    base = {"expression": EXPRESSION, "hesitation": HESITATION}[field]
    res = answer(client, sid, transcript=TEXT, duration_seconds=42, **{field: {**base, **change}})
    assert res.status_code == 400
    assert not Answer.objects.exists()


def test_session_summary_shows_confidence(client):
    sid = start(client, count=1)
    answer(client, sid, transcript=TEXT, duration_seconds=42, speech_confidence=0.9,
           attention=ATTENTION, expression=EXPRESSION, hesitation=HESITATION)
    detail = client.get(f"{SESSIONS}{sid}/").data
    assert detail["speech_summary"]["answers_with_confidence"] == 1
    assert detail["questions"][0]["answer"]["analysis"]["confidence"]["label"] in {"good", "fair", "low"}
