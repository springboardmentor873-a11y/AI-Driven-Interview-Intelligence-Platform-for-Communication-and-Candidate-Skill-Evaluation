"""The whole of Milestone 3 through the API, the way the interview room uses it:
answers with speech, typed text and a skip, then score, then feedback."""
import pytest

from apps.ai import gemini
from apps.ai.throttles import AIReviewThrottle
from apps.system.models import SystemSettings
from apps.interviews.models import Answer
from apps.scoring.models import Score

SESSIONS = "/api/interviews/sessions/"
SPOKEN = "I led a team of four and we shipped the payment feature two weeks early because we planned carefully " * 4

ATTENTION = {"tracked_seconds": 58.0, "face_visible_pct": 97.0, "eye_contact_pct": 66.0, "look_away_events": 1, "longest_look_away_seconds": 2.6}
EXPRESSION = {"face_seconds": 56.0, "smile_pct": 25.0, "tense_pct": 5.0, "raised_pct": 10.0, "neutral_pct": 60.0}
HESITATION = {"response_delay_seconds": 2.1, "long_pauses": 1, "longest_pause_seconds": 2.8, "total_pause_seconds": 2.8}

AI_REVIEW = {"grammar_score": 88, "grammar_issues": [{"text": "we was", "suggestion": "we were"}], "completeness_score": 80,
             "technical_score": 74, "organization_score": 70, "tone_score": 92, "note": "Clear example, but no measurable result."}
AI_FEEDBACK = {
    "summary": "A confident delivery with room to add measurable results.",
    "strengths": ["Steady pace and good eye contact."], "weaknesses": ["Answers lacked measurable results."],
    "suggestions": ["End each answer with a number.", "Answer the question in the first sentence.", "Skip fewer questions."],
    "practice_recommendations": ["Rewrite 3 answers to end with a result."],
    "learning_resources": [{"title": "STAR method", "type": "article", "why": "Structures examples.", "search": "STAR method interview"}],
}


@pytest.fixture
def client(auth_client, make_user):
    return auth_client(make_user("flow@example.com"))


def next_question(client, sid):
    return client.get(f"{SESSIONS}{sid}/next-question/").data["question"]


def run_interview(client, camera=True):
    sid = client.post(SESSIONS, {"interview_type": "hr", "difficulty": "medium", "question_count": 3}, format="json").data["id"]
    client.post(f"{SESSIONS}{sid}/start/")
    body = {"transcript": SPOKEN, "duration_seconds": 60, "speech_confidence": 0.91, "hesitation": HESITATION}
    if camera:
        body.update(attention=ATTENTION, expression=EXPRESSION)
    first = client.post(f"{SESSIONS}{sid}/answer/", {"question_id": next_question(client, sid)["id"], **body}, format="json")
    assert first.status_code == 200 and first.data["feedback"]["wpm"] is not None   # quick note after the answer
    typed = {"transcript": "I would first clarify the goal, then split the work and review progress every day. " * 3,
             "transcript_source": "typed", "duration_seconds": 50}
    assert client.post(f"{SESSIONS}{sid}/answer/", {"question_id": next_question(client, sid)["id"], **typed}, format="json").status_code == 200
    last = client.post(f"{SESSIONS}{sid}/answer/", {"question_id": next_question(client, sid)["id"], "duration_seconds": 0}, format="json")
    assert last.status_code == 200 and last.data["next_question"] is None          # the interview completes itself
    return sid


def fake_gemini(sid, calls):
    ids = list(Answer.objects.filter(question__session_id=sid).exclude(transcript="").values_list("id", flat=True))

    def generate(prompt, **kwargs):
        calls.append(prompt)
        if "Write feedback" in prompt:
            return AI_FEEDBACK
        return {"results": [{"id": i, **AI_REVIEW} for i in ids]}

    return generate


def test_full_interview_to_score_and_feedback(client, settings, monkeypatch):
    settings.GEMINI_API_KEY = "key"
    sid = run_interview(client)
    calls = []
    monkeypatch.setattr(gemini, "generate_json", fake_gemini(sid, calls))

    scored = client.post(f"{SESSIONS}{sid}/score/")
    assert scored.status_code == 200 and scored.data["analysis_source"] == "ai"
    score = scored.data["score"]
    assert score["complete"] is True
    assert score["counts"] == {"questions_total": 3, "answered": 2, "skipped": 1, "excluded_no_transcript": 0}
    assert [r["status"] for r in score["per_answer"]] == ["analyzed", "analyzed", "skipped"]
    parts = {k: score[k] for k in ("communication", "confidence", "technical_relevance", "professionalism")}
    assert all(v is not None and 0 <= v <= 100 for v in parts.values())
    assert score["overall"] == Score.combine(parts)[0]                         # the SRS weights, nothing else
    assert score["confidence"] < 70                                            # only 1 of 3 questions has confidence: the skip counts as 0

    spoken, typed, skipped = [q["answer"]["analysis"] for q in scored.data["questions"]]
    assert spoken["input"]["source"] == "speech" and spoken["pace"] and spoken["fillers"] is not None
    assert spoken["attention"]["label"] == "good" and spoken["expression"]["dominant"] == "neutral" and spoken["hesitation"]["long_pauses"] == 1
    assert spoken["confidence"] and spoken["technical"]["note"].startswith("Clear example")
    assert typed["input"]["source"] == "typed" and typed["pace"] is None and typed["confidence"] is None
    assert skipped["status"] == "skipped"
    summary = scored.data["speech_summary"]
    assert summary["answers_analyzed"] == 2 and summary["answers_skipped"] == 1 and summary["answers_tracked"] == 1

    written = client.post(f"{SESSIONS}{sid}/feedback/")
    assert written.status_code == 200 and written.data["feedback"]["source"] == "ai"
    assert written.data["feedback"]["learning_resources"][0]["search"] == "STAR method interview"
    assert len(calls) == 2                                                     # one review call, one feedback call

    again = client.get(f"{SESSIONS}{sid}/").data                               # reopening the results page
    assert again["score"]["overall"] == score["overall"] and again["feedback"]["summary"] == AI_FEEDBACK["summary"]
    client.post(f"{SESSIONS}{sid}/score/")
    client.post(f"{SESSIONS}{sid}/feedback/")
    assert len(calls) == 2                                                     # nothing is paid for twice


def test_everything_still_works_without_ai_or_camera(client, settings):
    settings.GEMINI_API_KEY = ""
    sid = run_interview(client, camera=False)
    scored = client.post(f"{SESSIONS}{sid}/score/")
    score = scored.data["score"]
    assert scored.status_code == 200 and scored.data["analysis_source"] == "basic"
    assert score["complete"] is False and "technical_relevance" in score["missing"]
    assert score["communication"] is not None and score["confidence"] is not None and score["overall"] is not None
    assert all(q["answer"]["analysis"]["attention"] is None for q in scored.data["questions"])
    written = client.post(f"{SESSIONS}{sid}/feedback/")
    assert written.status_code == 200 and written.data["feedback"]["source"] == "basic"
    assert written.data["feedback"]["weaknesses"]                              # the skipped question at least


def test_ai_reviews_are_rate_limited_per_user(client, auth_client, make_user, settings, monkeypatch):
    settings.GEMINI_API_KEY = ""
    monkeypatch.setattr(AIReviewThrottle, "THROTTLE_RATES", {"ai_review": "3/hour"})
    sid = run_interview(client)
    for _ in range(3):
        assert client.post(f"{SESSIONS}{sid}/score/").status_code == 200
    blocked = client.post(f"{SESSIONS}{sid}/score/")
    assert blocked.status_code == 429
    assert client.post(f"{SESSIONS}{sid}/feedback/").status_code == 429       # analyze, score and feedback share one limit
    assert client.post(f"{SESSIONS}{sid}/analyze/").status_code == 429
    assert client.get(f"{SESSIONS}{sid}/").status_code == 200                 # reading results is never limited
    other = auth_client(make_user("flow-other@example.com"))
    other_sid = run_interview(other)
    assert other.post(f"{SESSIONS}{other_sid}/score/").status_code == 200     # another user has their own allowance


def test_an_admin_can_change_the_review_limit(client, settings):
    settings.GEMINI_API_KEY = ""
    SystemSettings.objects.create(ai_review_rate_per_hour=2)  # what the admin AI settings page saves
    sid = run_interview(client)
    assert [client.post(f"{SESSIONS}{sid}/score/").status_code for _ in range(3)] == [200, 200, 429]
