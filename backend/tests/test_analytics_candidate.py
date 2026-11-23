from datetime import timedelta

import pytest
from django.utils import timezone

from apps.analytics import services
from apps.interviews.models import InterviewSession, Question
from apps.scoring.models import Score

URL = "/api/analytics/candidate/"


def make_scored(user, overall=70, *, parts=None, interview_type="hr", status="completed", categories=None,
                per_answer=None, with_score=True, difficulty="medium", ended=None):
    """A session with a saved Score. `parts` is a dict of the four part scores; missing ones default to `overall`."""
    session = InterviewSession.objects.create(
        candidate=user, interview_type=interview_type, difficulty=difficulty, status=status,
        ended_at=ended or timezone.now(),
    )
    for order, category in enumerate(categories or [], start=1):
        Question.objects.create(session=session, text=f"Question {order}?", order=order, category=category)
    if with_score:
        values = {"communication": overall, "confidence": overall, "technical_relevance": overall, "professionalism": overall}
        values.update(parts or {})
        score = Score(
            session=session, communication_score=values["communication"], confidence_score=values["confidence"],
            technical_relevance_score=values["technical_relevance"], professionalism_score=values["professionalism"],
            details={"complete": all(v is not None for v in values.values()), "per_answer": per_answer or []},
        )
        score.calculate()
        score.overall_score = overall  # keep the number the test asked for
        score.save()
    return session


@pytest.fixture
def user(make_user):
    return make_user("cand@example.com")


@pytest.fixture
def client(user, auth_client):
    return auth_client(user)


# --- access ----------------------------------------------------------------------

def test_requires_sign_in(api):
    assert api.get(URL).status_code == 401


@pytest.mark.parametrize("role", ["recruiter", "admin"])
def test_only_candidates_can_open_it(make_user, auth_client, role):
    assert auth_client(make_user(f"{role}@example.com", role=role)).get(URL).status_code == 403


def test_invalid_type_is_rejected(client):
    response = client.get(URL, {"type": "poetry"})
    assert response.status_code == 400 and "type" in response.json()


# --- no data ---------------------------------------------------------------------

def test_a_new_candidate_gets_an_empty_but_complete_answer(client):
    data = client.get(URL).json()
    assert data["has_data"] is False
    assert data["trend"] == [] and data["by_type"] == [] and data["by_category"] == [] and data["weak_areas"] == []
    assert data["summary"] == {"sessions_total": 0, "completed": 0, "scored": 0, "in_chart": 0, "cancelled": 0}
    assert data["overall"]["samples"] == 0 and data["overall"]["rating"] is None
    assert [p["key"] for p in data["parts"]] == ["communication", "confidence", "technical_relevance", "professionalism"]
    assert data["ranking"]["available"] is False
    assert data["activity"]["last_interview_at"] is None


# --- trend and overall -----------------------------------------------------------

def test_trend_is_oldest_first_and_overall_summarises_it(user, client):
    for value in (50, 60, 70, 80):
        make_scored(user, value)
    data = client.get(URL).json()
    assert [row["overall"] for row in data["trend"]] == [50, 60, 70, 80]
    overall = data["overall"]
    assert overall["average"] == 65 and overall["latest"] == 80 and overall["best"] == 80
    assert overall["change"] == 30 and overall["direction"] == "improving" and overall["predicted_next"] == 90
    assert overall["rating"] == {"value": "good", "label": "Good"}
    assert overall["rating_counts"] == {"excellent": 0, "good": 1, "average": 2, "needs_improvement": 1, "poor": 0}


def test_only_scored_completed_interviews_count(user, client):
    make_scored(user, 70)
    make_scored(user, 20, status="in_progress")
    make_scored(user, 30, status="cancelled")
    make_scored(user, with_score=False)
    data = client.get(URL).json()
    assert [row["overall"] for row in data["trend"]] == [70]
    assert data["summary"] == {"sessions_total": 4, "completed": 2, "scored": 1, "in_chart": 1, "cancelled": 1}


def test_other_candidates_are_never_included(user, client, make_user):
    make_scored(user, 70)
    make_scored(make_user("other@example.com"), 10)
    assert [row["overall"] for row in client.get(URL).json()["trend"]] == [70]


def test_the_chart_keeps_only_the_newest_interviews(user, client, monkeypatch):
    monkeypatch.setattr(services, "TREND_LIMIT", 3)
    for value in (10, 20, 30, 40, 50):
        make_scored(user, value)
    data = client.get(URL).json()
    assert [row["overall"] for row in data["trend"]] == [30, 40, 50]
    assert data["summary"]["scored"] == 5 and data["summary"]["in_chart"] == 3


# --- the four parts --------------------------------------------------------------

def test_each_part_has_its_own_history_and_weight(user, client):
    for value in (60, 70, 80):
        make_scored(user, 70, parts={"confidence": value})
    parts = {p["key"]: p for p in client.get(URL).json()["parts"]}
    confidence = parts["confidence"]
    assert confidence["weight"] == 25 and parts["communication"]["weight"] == 30
    assert confidence["latest"] == 80 and confidence["direction"] == "improving" and confidence["predicted_next"] == 90
    assert parts["communication"]["direction"] == "steady" and parts["communication"]["average"] == 70


def test_a_part_that_was_not_measured_is_left_out_not_counted_as_zero(user, client):
    make_scored(user, 70, parts={"technical_relevance": None})
    make_scored(user, 70, parts={"technical_relevance": 80})
    technical = {p["key"]: p for p in client.get(URL).json()["parts"]}["technical_relevance"]
    assert technical["samples"] == 1 and technical["average"] == 80
    trend = client.get(URL).json()["trend"]
    assert trend[0]["technical_relevance"] is None and trend[0]["complete"] is False


# --- by type and topic -----------------------------------------------------------

def test_results_by_interview_type(user, client):
    make_scored(user, 60, interview_type="hr")
    make_scored(user, 80, interview_type="hr")
    make_scored(user, 90, interview_type="technical", parts={"communication": 50})
    rows = {row["interview_type"]: row for row in client.get(URL).json()["by_type"]}
    assert set(rows) == {"hr", "technical"}
    assert rows["hr"]["interviews"] == 2 and rows["hr"]["average_overall"] == 70 and rows["hr"]["latest_overall"] == 80
    assert rows["technical"]["parts"]["communication"] == 50 and rows["technical"]["best_overall"] == 90


def test_type_filter_limits_everything(user, client):
    make_scored(user, 60, interview_type="hr")
    make_scored(user, 90, interview_type="technical")
    data = client.get(URL, {"type": "technical"}).json()
    assert data["filter"]["interview_type"] == "technical"
    assert [row["overall"] for row in data["trend"]] == [90]
    assert data["summary"]["sessions_total"] == 1


def answer(order, overall, status="analyzed"):
    return {"order": order, "status": status, "overall": overall}


def test_results_by_question_topic(user, client):
    make_scored(user, 60, categories=["Python", "Teamwork", "Python"],
                per_answer=[answer(1, 40), answer(2, 80), answer(3, 60)])
    make_scored(user, 60, categories=["python", "Teamwork"],
                per_answer=[answer(1, 0, "skipped"), answer(2, 70)])
    rows = {row["name"]: row for row in client.get(URL).json()["by_category"]}
    assert rows["Python"]["answers"] == 3 and rows["Python"]["average"] == pytest.approx(33.3, abs=0.1)  # 40, 60 and a skipped 0
    assert rows["Python"]["skipped"] == 1
    assert rows["Teamwork"]["average"] == 75


def test_answers_without_words_or_topics_are_left_out_of_topic_results(user, client):
    make_scored(user, 60, categories=["Python", "", "SQL"],
                per_answer=[answer(1, 90), answer(2, 10), answer(3, None, "no_transcript")])
    rows = client.get(URL).json()["by_category"]
    assert [(r["name"], r["average"]) for r in rows] == [("Python", 90)]


def test_weakest_topic_comes_first(user, client):
    make_scored(user, 60, categories=["A", "B"], per_answer=[answer(1, 90), answer(2, 30)])
    assert [r["name"] for r in client.get(URL).json()["by_category"]] == ["B", "A"]


# --- weak areas ------------------------------------------------------------------

def test_weak_areas_flag_low_and_falling_skills_with_a_tip(user, client):
    for value in (70, 60, 50):
        make_scored(user, 80, parts={"confidence": value})
    weak = client.get(URL).json()["weak_areas"]
    assert [w["key"] for w in weak] == ["confidence"]
    item = weak[0]
    assert item["kind"] == "skill" and item["risk"] == "high" and item["direction"] == "declining"
    assert item["predicted_next"] == 40 and "falling" in item["reason"] and item["tip"]


def test_a_dip_below_the_watch_line_is_medium_risk(user, client):
    for _ in range(3):
        make_scored(user, 80, parts={"professionalism": 68})
    weak = client.get(URL).json()["weak_areas"]
    assert [(w["key"], w["risk"]) for w in weak] == [("professionalism", "medium")]


def test_strong_steady_results_flag_nothing(user, client):
    for _ in range(3):
        make_scored(user, 85)
    assert client.get(URL).json()["weak_areas"] == []


def test_a_good_score_that_is_falling_fast_is_flagged_before_it_gets_bad(user, client):
    for value in (95, 85, 76):  # recent average 85, but the line points below 75 and is falling
        make_scored(user, 85, parts={"communication": value})
    weak = client.get(URL).json()["weak_areas"]
    assert [(w["key"], w["risk"]) for w in weak] == [("communication", "medium")]


def test_high_risk_comes_before_medium_and_skills_before_topics(user, client):
    make_scored(user, 80, parts={"communication": 55, "confidence": 70}, categories=["SQL", "SQL"],
                per_answer=[answer(1, 30), answer(2, 40)])
    weak = client.get(URL).json()["weak_areas"]
    assert [(w["kind"], w["key"], w["risk"]) for w in weak] == [
        ("skill", "communication", "high"), ("skill", "confidence", "medium"), ("topic", "sql", "high"),
    ]


def test_a_topic_needs_two_answers_before_it_is_called_weak(user, client):
    make_scored(user, 80, categories=["SQL"], per_answer=[answer(1, 10)])
    assert client.get(URL).json()["weak_areas"] == []


# --- ranking and activity --------------------------------------------------------

def test_ranking_waits_for_enough_candidates(user, client, make_user):
    make_scored(user, 80)
    make_scored(make_user("b@example.com"), 50)
    ranking = client.get(URL).json()["ranking"]
    assert ranking["available"] is False and "5" in ranking["reason"]


def test_ranking_is_a_percentile_with_no_names(user, client, make_user):
    make_scored(user, 80)
    for index, value in enumerate((40, 60, 70, 90)):
        make_scored(make_user(f"c{index}@example.com"), value)
    ranking = client.get(URL).json()["ranking"]
    assert ranking == {"available": True, "percentile": 75, "candidates_compared": 5, "your_average": 80, "cohort_average": 68}


def test_ranking_ignores_unscored_and_unfinished_interviews(user, client, make_user):
    make_scored(user, 80)
    for index in range(4):
        make_scored(make_user(f"d{index}@example.com"), 10, status="in_progress")
    assert client.get(URL).json()["ranking"]["available"] is False


def test_activity_counts_recent_completed_interviews(user, client):
    now = timezone.now()
    make_scored(user, 70, ended=now - timedelta(days=2))
    make_scored(user, 70, ended=now - timedelta(days=10))
    make_scored(user, 70, ended=now - timedelta(days=40))
    activity = client.get(URL).json()["activity"]
    assert activity["completed_last_7_days"] == 1 and activity["completed_last_30_days"] == 2
    assert activity["last_interview_at"].startswith((now - timedelta(days=2)).date().isoformat())


# --- speed -----------------------------------------------------------------------

def test_the_number_of_queries_does_not_grow_with_the_history(user, client, django_assert_max_num_queries):
    for _ in range(25):
        make_scored(user, 70, categories=["Python", "SQL"], per_answer=[answer(1, 60), answer(2, 80)])
    with django_assert_max_num_queries(8):
        assert client.get(URL).status_code == 200
