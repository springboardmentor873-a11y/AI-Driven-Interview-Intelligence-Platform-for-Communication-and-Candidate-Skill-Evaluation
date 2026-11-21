import pytest

from apps.ai import gemini
from apps.interviews.models import Answer, InterviewSession, Question
from apps.scoring import engine
from apps.scoring.models import Score

SESSIONS = "/api/interviews/sessions/"


# --- Score.combine ---------------------------------------------------------------

def test_combine_uses_the_srs_weights():
    overall, rating = Score.combine({"communication": 80, "confidence": 60, "technical_relevance": 70, "professionalism": 90})
    assert overall == 73.5            # 24 + 15 + 21 + 13.5
    assert rating == "average"


def test_combine_rescales_when_a_part_is_missing():
    overall, _ = Score.combine({"communication": 80, "confidence": 60, "technical_relevance": None, "professionalism": 100})
    assert overall == pytest.approx((80 * 30 + 60 * 25 + 100 * 15) / 70, abs=0.1)  # not pulled down by a missing part
    assert Score.combine({"communication": None, "confidence": None, "technical_relevance": None, "professionalism": None}) == (None, "")


@pytest.mark.parametrize("value,rating", [(100, "excellent"), (90, "excellent"), (89.9, "good"), (75, "good"),
                                          (74.9, "average"), (60, "average"), (59.9, "needs_improvement"),
                                          (40, "needs_improvement"), (39.9, "poor"), (0, "poor")])
def test_rating_thresholds(value, rating):
    assert Score.combine({"communication": value})[1] == rating


def test_calculate_on_the_model_handles_missing_parts(db, make_user):
    session = make_session(make_user("calc@example.com"), [])
    score = Score(session=session, communication_score=80, confidence_score=None, technical_relevance_score=None, professionalism_score=None)
    assert score.calculate() == 80 and score.rating == "good"


# --- one answer ------------------------------------------------------------------

def test_time_management():
    assert engine.time_management_score(60, 120) == 100
    assert engine.time_management_score(120, 120) == 70          # the clock ended it
    assert engine.time_management_score(0, 120) == 0
    assert engine.time_management_score(9, 120) == pytest.approx(20)
    assert engine.time_management_score(30, 120) == pytest.approx(64, abs=0.1)
    assert engine.time_management_score(10, 0) is None


def analysis(**over):
    base = {
        "version": 1, "status": "analyzed", "duration_seconds": 60, "word_count": 90,
        "communication_score": 80.0, "confidence": {"score": 60.0},
        "completeness": {"score": 60, "source": "ai"}, "technical": {"score": 80, "note": "", "source": "ai"},
        "organization": {"score": 70, "source": "ai"}, "tone": {"score": 90, "source": "ai"},
        "attention": {"face_visible_pct": 100.0, "look_away_events": 0},
    }
    base.update(over)
    return base


def test_score_answer_combines_the_parts():
    parts = engine.score_answer(analysis(), 120)
    assert parts["communication"] == 80 and parts["confidence"] == 60
    assert parts["technical_relevance"] == pytest.approx(76)      # 0.8 * 80 + 0.2 * 60
    assert parts["professionalism"] == pytest.approx(89.5)        # (100*25 + 70*25 + 90*30 + 100*20) / 100


def test_technical_relevance_needs_the_ai_review():
    parts = engine.score_answer(analysis(technical=None), 120)
    assert parts["technical_relevance"] is None and parts["communication"] == 80


def test_professionalism_needs_three_parts():
    no_ai = engine.score_answer(analysis(organization=None, tone=None), 120)   # time + etiquette only
    assert no_ai["professionalism"] is None
    no_camera = engine.score_answer(analysis(attention=None), 120)             # time + organization + tone
    assert no_camera["professionalism"] == pytest.approx((100 * 25 + 70 * 25 + 90 * 30) / 80)


def test_looking_away_lowers_etiquette():
    steady = engine.score_answer(analysis(), 120)["professionalism"]
    restless = engine.score_answer(analysis(attention={"face_visible_pct": 70.0, "look_away_events": 4}), 120)["professionalism"]
    assert restless < steady


# --- a whole interview -----------------------------------------------------------

def make_session(user, analyses, limit=120):
    """A completed session with one question per entry. None = unanswered."""
    session = InterviewSession.objects.create(candidate=user, interview_type="hr", status="completed")
    for order, data in enumerate(analyses, start=1):
        question = Question.objects.create(session=session, text=f"Question {order}?", order=order, time_limit_seconds=limit)
        if data is not None:
            Answer.objects.create(question=question, transcript="word " * 50, duration_seconds=data.get("duration_seconds", 0), analysis=data)
    return session


SKIPPED = {"version": 1, "status": "skipped", "duration_seconds": 0}
SILENT = {"version": 1, "status": "no_transcript", "duration_seconds": 40}


@pytest.fixture
def user(make_user):
    return make_user("score@example.com")


def test_skipped_questions_count_as_zero(user):
    session = make_session(user, [analysis(), SKIPPED])
    result = engine.compute(session)
    assert result["parts"] == {"communication": 40.0, "confidence": 30.0, "technical_relevance": 38.0, "professionalism": 44.8}
    assert result["details"]["answered"] == 1 and result["details"]["skipped"] == 1
    assert result["details"]["complete"] is True


def test_unanswered_questions_count_like_skipped_ones(user):
    session = make_session(user, [analysis(), None, None])
    assert engine.compute(session)["parts"]["communication"] == pytest.approx(26.7, abs=0.1)
    assert engine.compute(session)["details"]["skipped"] == 2


def test_answers_without_words_are_left_out_not_zeroed(user):
    session = make_session(user, [analysis(), SILENT])
    result = engine.compute(session)
    assert result["parts"]["communication"] == 80.0
    assert result["details"]["excluded_no_transcript"] == 1 and result["details"]["answered"] == 1


def test_nothing_scorable_gives_no_score(user):
    assert engine.compute(make_session(user, [SILENT, SILENT])) is None
    assert engine.compute(make_session(user, [SKIPPED, SKIPPED])) is None


def test_a_part_that_could_not_be_measured_is_marked_missing(user):
    session = make_session(user, [analysis(technical=None, organization=None, tone=None), SKIPPED])
    result = engine.compute(session)
    assert result["parts"]["technical_relevance"] is None          # skipped zeros do not invent a measurement
    assert result["parts"]["professionalism"] is None
    assert set(result["details"]["missing"]) == {"technical_relevance", "professionalism"}
    assert result["details"]["complete"] is False
    assert result["overall"] == Score.combine({"communication": 40.0, "confidence": 30.0})[0]


def test_per_answer_breakdown(user):
    session = make_session(user, [analysis(), SKIPPED, SILENT])
    rows = engine.compute(session)["details"]["per_answer"]
    assert [r["status"] for r in rows] == ["analyzed", "skipped", "no_transcript"]
    assert rows[0]["order"] == 1 and rows[0]["overall"] == pytest.approx(Score.combine(engine.score_answer(analysis(), 120))[0], abs=0.1)
    assert rows[1]["overall"] == 0 and rows[2]["communication"] is None


def test_score_session_saves_one_row_and_replaces_it(user):
    session = make_session(user, [analysis()])
    first = engine.score_session(session)
    assert first.overall_score == 75.2 and first.rating == "good"   # 24 + 15 + 22.8 + 13.425 = 75.225
    Answer.objects.update(analysis=analysis(communication_score=100.0))
    second = engine.score_session(session)
    assert Score.objects.filter(session=session).count() == 1 and second.pk == first.pk
    assert second.communication_score == 100.0
    # when nothing can be scored any more, the old score goes away
    Answer.objects.update(analysis=SILENT)
    assert engine.score_session(session) is None
    assert not Score.objects.filter(session=session).exists()


# --- API -------------------------------------------------------------------------

@pytest.fixture
def client(auth_client, user):
    return auth_client(user)


def run_interview(client, answers=2, hesitation=True):
    sid = client.post(SESSIONS, {"interview_type": "hr", "difficulty": "easy", "question_count": answers}, format="json").data["id"]
    client.post(f"{SESSIONS}{sid}/start/")
    for _ in range(answers):
        q = client.get(f"{SESSIONS}{sid}/next-question/").data["question"]
        body = {"question_id": q["id"], "transcript": "I led the team and we shipped on time because we planned well " * 6,
                "duration_seconds": 60, "speech_confidence": 0.9}
        if hesitation:
            body["hesitation"] = {"response_delay_seconds": 2, "long_pauses": 0, "longest_pause_seconds": 0, "total_pause_seconds": 0}
        client.post(f"{SESSIONS}{sid}/answer/", body, format="json")
    return sid


def fake_review(sid):
    ids = list(Answer.objects.filter(question__session_id=sid).values_list("id", flat=True))
    return {"results": [{"id": i, "grammar_score": 90, "grammar_issues": [], "completeness_score": 80,
                         "technical_score": 70, "organization_score": 75, "tone_score": 95, "note": "Gives a clear example."}
                        for i in ids]}


def test_score_endpoint_scores_the_interview(client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "key"
    sid = run_interview(client)
    calls = []
    monkeypatch.setattr(gemini, "generate_json", lambda *a, **k: calls.append(1) or fake_review(sid))
    res = client.post(f"{SESSIONS}{sid}/score/")
    assert res.status_code == 200 and res.data["analysis_source"] == "ai"
    score = res.data["score"]
    assert score["complete"] is True and score["missing"] == []
    assert score["technical_relevance"] == 72.0                      # 0.8 * 70 + 0.2 * 80
    assert 0 < score["overall"] <= 100 and score["rating"] in {"excellent", "good", "average", "needs_improvement", "poor"}
    assert score["counts"] == {"questions_total": 2, "answered": 2, "skipped": 0, "excluded_no_transcript": 0}
    assert score["weights"]["communication"] == 0.30 and len(score["per_answer"]) == 2
    assert res.data["questions"][0]["answer"]["analysis"]["technical"]["note"] == "Gives a clear example."
    # a second call recomputes the same single row and does not ask Gemini again
    assert client.post(f"{SESSIONS}{sid}/score/").data["score"]["overall"] == score["overall"]
    assert len(calls) == 1 and Score.objects.filter(session_id=sid).count() == 1


def test_score_without_ai_is_partial(client, settings):
    settings.GEMINI_API_KEY = ""
    sid = run_interview(client)
    res = client.post(f"{SESSIONS}{sid}/score/")
    score = res.data["score"]
    assert res.data["analysis_source"] == "basic"
    assert score["complete"] is False and "technical_relevance" in score["missing"]
    assert score["technical_relevance"] is None and score["communication"] is not None and score["overall"] is not None


def test_score_is_part_of_the_session_detail_but_not_the_list(client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "key"
    sid = run_interview(client)
    assert client.get(f"{SESSIONS}{sid}/").data["score"] is None           # not scored yet
    monkeypatch.setattr(gemini, "generate_json", lambda *a, **k: fake_review(sid))
    client.post(f"{SESSIONS}{sid}/score/")
    assert client.get(f"{SESSIONS}{sid}/").data["score"]["rating_label"]
    listing = client.get(SESSIONS).data
    rows = listing["results"] if isinstance(listing, dict) else listing
    assert rows[0]["score"] is None


def test_score_needs_a_completed_interview_and_the_owner(client, auth_client, make_user, settings):
    settings.GEMINI_API_KEY = ""
    sid = client.post(SESSIONS, {"interview_type": "hr", "difficulty": "easy", "question_count": 1}, format="json").data["id"]
    client.post(f"{SESSIONS}{sid}/start/")
    assert client.post(f"{SESSIONS}{sid}/score/").status_code == 400
    done = run_interview(client, answers=1)
    other = auth_client(make_user("other-score@example.com"))
    assert other.post(f"{SESSIONS}{done}/score/").status_code == 404


def test_all_skipped_interview_has_no_score(client, settings):
    settings.GEMINI_API_KEY = ""
    sid = client.post(SESSIONS, {"interview_type": "hr", "difficulty": "easy", "question_count": 2}, format="json").data["id"]
    client.post(f"{SESSIONS}{sid}/start/")
    for _ in range(2):
        q = client.get(f"{SESSIONS}{sid}/next-question/").data["question"]
        client.post(f"{SESSIONS}{sid}/answer/", {"question_id": q["id"], "duration_seconds": 0}, format="json")
    res = client.post(f"{SESSIONS}{sid}/score/")
    assert res.status_code == 200 and res.data["score"] is None
