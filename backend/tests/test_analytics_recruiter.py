from datetime import timedelta

import pytest
from django.utils import timezone

from apps.analytics import recruiter as rec
from apps.interviews.models import Answer, InterviewSession, InterviewTemplate, Question
from tests.test_analytics_candidate import answer, make_scored

BASE = "/api/analytics/recruiter/"
ENDPOINTS = [BASE, BASE + "candidates/", BASE + "candidates/1/", BASE + "compare/?candidates=1,2", BASE + "sessions/"]


@pytest.fixture
def boss(make_user):
    return make_user("boss@example.com", role="recruiter", first_name="Rita", last_name="Recruiter")


@pytest.fixture
def client(boss, auth_client):
    return auth_client(boss)


@pytest.fixture
def template(boss):
    return InterviewTemplate.objects.create(created_by=boss, title="Backend engineer", interview_type="technical")


def candidate(make_user, name, **extra):
    first, _, last = name.partition(" ")
    return make_user(f"{first.lower()}@example.com", first_name=first, last_name=last, **extra)


def take(who, template, overall=70, **kwargs):
    """A finished, scored interview on a template."""
    return make_scored(who, overall, template=template, interview_type=template.interview_type if template else "hr", **kwargs)


def unscored(who, template, status):
    return InterviewSession.objects.create(candidate=who, template=template, interview_type="technical", status=status,
                                           started_at=timezone.now() if status != "scheduled" else None)


# --- access ----------------------------------------------------------------------

@pytest.mark.parametrize("url", ENDPOINTS)
def test_signed_out_is_401(api, url):
    assert api.get(url).status_code == 401


@pytest.mark.parametrize("url", ENDPOINTS)
@pytest.mark.parametrize("role", ["candidate", "admin"])
def test_only_recruiters_can_open_recruiter_analytics(make_user, auth_client, url, role):
    assert auth_client(make_user(f"{role}@example.com", role=role)).get(url).status_code == 403


# --- a recruiter only sees interviews on their own templates ----------------------

def test_other_recruiters_and_custom_interviews_are_invisible(make_user, client, boss, template):
    amy = candidate(make_user, "Amy Adams")
    take(amy, template, 80)
    other_boss = make_user("other@example.com", role="recruiter")
    other_template = InterviewTemplate.objects.create(created_by=other_boss, title="Theirs", interview_type="hr")
    take(amy, other_template, 10)   # same candidate, someone else's template
    take(amy, None, 20)             # a practice interview with no template
    bob = candidate(make_user, "Bob Brown")
    take(bob, other_template, 90)   # a candidate who never took this recruiter's template

    overview = client.get(BASE).json()
    assert overview["summary"]["candidates"] == 1 and overview["summary"]["scored"] == 1 and overview["summary"]["average_overall"] == 80
    rows = client.get(BASE + "candidates/").json()["results"]
    assert [r["candidate"]["name"] for r in rows] == ["Amy Adams"] and rows[0]["interviews"] == 1 and rows[0]["average_overall"] == 80
    assert [r["overall"] for r in client.get(BASE + f"candidates/{amy.id}/").json()["trend"]] == [80]
    assert client.get(BASE + f"candidates/{bob.id}/").status_code == 404
    assert client.get(BASE + "sessions/").json()["counts"]["all"] == 1


def test_template_owner_sees_nothing_from_a_deleted_template(make_user, client, template):
    amy = candidate(make_user, "Amy Adams")
    take(amy, template, 80)
    template.delete()  # sessions keep existing but lose their template
    assert client.get(BASE).json()["summary"]["sessions_total"] == 0


# --- overview --------------------------------------------------------------------

def test_a_recruiter_with_no_interviews_gets_an_empty_but_complete_overview(client):
    data = client.get(BASE).json()
    assert data["has_data"] is False
    assert data["summary"]["candidates"] == 0 and data["summary"]["average_overall"] is None and data["summary"]["completion_rate"] is None
    assert data["status_counts"] == {"scheduled": 0, "in_progress": 0, "completed": 0, "cancelled": 0}
    assert len(data["weekly"]) == rec.WEEKS and all(w["interviews"] == 0 for w in data["weekly"])
    assert data["templates"] == [] and data["top_candidates"] == []
    assert [p["key"] for p in data["parts"]] == ["communication", "confidence", "technical_relevance", "professionalism"]


def test_overview_totals(make_user, client, template, boss):
    amy, bob = candidate(make_user, "Amy Adams"), candidate(make_user, "Bob Brown")
    take(amy, template, 80, parts={"communication": 90})
    take(amy, template, 60)
    take(bob, template, 75)
    unscored(bob, template, "in_progress")
    unscored(amy, template, "cancelled")
    draft = InterviewTemplate.objects.create(created_by=boss, title="Draft", interview_type="hr", is_published=False)

    data = client.get(BASE).json()
    assert data["summary"] == {
        "templates": 2, "published_templates": 1, "candidates": 2, "sessions_total": 5, "scored": 3,
        "average_overall": 71.7, "best_overall": 80, "completion_rate": 75,  # 3 finished, 1 cancelled
    }
    assert data["status_counts"] == {"scheduled": 0, "in_progress": 1, "completed": 3, "cancelled": 1}
    assert {p["key"]: p["average"] for p in data["parts"]}["communication"] == 75
    assert data["rating_counts"]["good"] == 2 and data["rating_counts"]["average"] == 1
    by_id = {t["id"]: t for t in data["templates"]}
    assert by_id[template.id]["sessions"] == 5 and by_id[template.id]["candidates"] == 2 and by_id[template.id]["scored"] == 3
    assert by_id[template.id]["average_overall"] == 71.7 and by_id[template.id]["completion_rate"] == 75
    assert by_id[draft.id]["sessions"] == 0 and by_id[draft.id]["average_overall"] is None and by_id[draft.id]["completion_rate"] is None
    assert [c["candidate"]["name"] for c in data["top_candidates"]] == ["Bob Brown", "Amy Adams"]
    assert data["activity"] == {"completed_last_7_days": 3, "completed_last_30_days": 3}


def test_weekly_trend_buckets_by_week_oldest_first(make_user, client, template):
    amy = candidate(make_user, "Amy Adams")
    now = timezone.now()
    take(amy, template, 50, ended=now - timedelta(weeks=3))
    take(amy, template, 70, ended=now - timedelta(weeks=3))
    take(amy, template, 90, ended=now)
    take(amy, template, 10, ended=now - timedelta(weeks=30))  # too old to appear
    weekly = client.get(BASE).json()["weekly"]
    assert len(weekly) == rec.WEEKS and weekly[0]["week_start"] < weekly[-1]["week_start"]
    assert (weekly[-1]["interviews"], weekly[-1]["average_overall"]) == (1, 90)
    assert (weekly[-4]["interviews"], weekly[-4]["average_overall"]) == (2, 60)
    assert sum(w["interviews"] for w in weekly) == 3


# --- candidates list -------------------------------------------------------------

@pytest.fixture
def cohort(make_user, template):
    """Amy 80 (improving), Bob 70, Cara 50, and Dan who only has an unfinished interview."""
    amy, bob, cara, dan = (candidate(make_user, n) for n in ("Amy Adams", "Bob Brown", "Cara Clark", "Dan Dunn"))
    now = timezone.now()
    for value, days in ((60, 9), (70, 6), (80, 3)):
        take(amy, template, value, ended=now - timedelta(days=days))
    take(bob, template, 70, ended=now - timedelta(days=1))
    take(cara, template, 50, ended=now - timedelta(days=20))
    unscored(dan, template, "in_progress")
    return {"amy": amy, "bob": bob, "cara": cara, "dan": dan}


def names(response):
    return [r["candidate"]["name"] for r in response.json()["results"]]


def test_candidate_rows_have_the_numbers_a_recruiter_needs(client, cohort):
    data = client.get(BASE + "candidates/").json()
    assert data["count"] == 4 and data["limit"] == 25 and data["offset"] == 0
    amy = data["results"][0]
    assert amy["candidate"] == {"id": cohort["amy"].id, "name": "Amy Adams", "email": "amy@example.com"}
    assert amy["sessions"] == 3 and amy["interviews"] == 3 and amy["average_overall"] == 70 and amy["best_overall"] == 80
    assert amy["latest_overall"] == 80 and amy["latest_rating"] == {"value": "good", "label": "Good"}
    assert amy["direction"] == "improving" and amy["predicted_next"] == 90 and amy["parts"]["communication"] == 70
    assert amy["last_interview_at"] is not None


def test_default_order_is_best_average_first_and_unscored_last(client, cohort):
    # Amy and Bob both average 70, so the lower id comes first
    assert names(client.get(BASE + "candidates/")) == ["Amy Adams", "Bob Brown", "Cara Clark", "Dan Dunn"]
    dan = client.get(BASE + "candidates/").json()["results"][-1]
    assert dan["interviews"] == 0 and dan["average_overall"] is None and dan["latest_overall"] is None and dan["direction"] == "not_enough_data"


@pytest.mark.parametrize("params,expected", [
    ({"sort": "name"}, ["Amy Adams", "Bob Brown", "Cara Clark", "Dan Dunn"]),
    ({"sort": "name", "order": "desc"}, ["Dan Dunn", "Cara Clark", "Bob Brown", "Amy Adams"]),
    ({"sort": "interviews"}, ["Amy Adams", "Bob Brown", "Cara Clark", "Dan Dunn"]),
    ({"sort": "latest"}, ["Bob Brown", "Amy Adams", "Cara Clark", "Dan Dunn"]),
    ({"sort": "average", "order": "asc"}, ["Cara Clark", "Amy Adams", "Bob Brown", "Dan Dunn"]),  # no score is always last
])
def test_sorting(client, cohort, params, expected):
    assert names(client.get(BASE + "candidates/", params)) == expected


def test_search_matches_every_word_in_the_name_or_email(client, cohort):
    assert names(client.get(BASE + "candidates/", {"q": "amy"})) == ["Amy Adams"]
    assert names(client.get(BASE + "candidates/", {"q": "cara cl"})) == ["Cara Clark"]
    assert len(names(client.get(BASE + "candidates/", {"q": "EXAMPLE.COM"}))) == 4
    assert names(client.get(BASE + "candidates/", {"q": "amy zzz"})) == []


def test_type_filter(make_user, client, template, cohort, boss):
    hr = InterviewTemplate.objects.create(created_by=boss, title="HR chat", interview_type="hr")
    take(cohort["bob"], hr, 95)
    rows = client.get(BASE + "candidates/", {"type": "hr"}).json()["results"]
    assert [(r["candidate"]["name"], r["average_overall"]) for r in rows] == [("Bob Brown", 95)]


def test_pagination_is_stable(client, cohort):
    first = client.get(BASE + "candidates/", {"limit": 2}).json()
    second = client.get(BASE + "candidates/", {"limit": 2, "offset": 2}).json()
    assert first["count"] == 4 and len(first["results"]) == 2 and len(second["results"]) == 2
    assert len({r["candidate"]["id"] for r in first["results"] + second["results"]}) == 4


@pytest.mark.parametrize("params", [{"sort": "luck"}, {"order": "up"}, {"limit": 0}, {"limit": 101}, {"limit": "x"}, {"offset": -1}, {"type": "poetry"}])
def test_bad_list_parameters_are_400(client, params):
    assert client.get(BASE + "candidates/", params).status_code == 400


def test_ties_are_ordered_by_candidate_id(make_user, client, template):
    people = [candidate(make_user, f"Zed{i} Same") for i in range(3)]
    for person in people:
        take(person, template, 70)
    ids = [r["candidate"]["id"] for r in client.get(BASE + "candidates/").json()["results"]]
    assert ids == sorted(ids)


# --- candidate report ------------------------------------------------------------

def test_report_covers_only_this_recruiters_templates(make_user, client, boss, template):
    amy = candidate(make_user, "Amy Adams")
    for value in (50, 60, 70):
        take(amy, template, value, categories=["SQL", "SQL"], per_answer=[answer(1, 20), answer(2, 30)])
    other = InterviewTemplate.objects.create(created_by=make_user("o@example.com", role="recruiter"), title="Other", interview_type="hr")
    take(amy, other, 99)
    take(amy, None, 99)

    data = client.get(BASE + f"candidates/{amy.id}/").json()
    assert data["candidate"]["name"] == "Amy Adams" and data["candidate"]["email"] == "amy@example.com"
    assert data["has_data"] is True and [r["overall"] for r in data["trend"]] == [50, 60, 70]
    assert data["summary"] == {"sessions_total": 3, "completed": 3, "scored": 3, "in_chart": 3, "cancelled": 0}
    assert data["overall"]["average"] == 60 and data["overall"]["direction"] == "improving" and data["overall"]["predicted_next"] == 80
    assert data["by_template"] == [{"template_id": template.id, "title": "Backend engineer", "interviews": 3,
                                    "average_overall": 60, "best_overall": 70, "latest_overall": 70}]
    assert len(data["sessions"]) == 3 and all(s["template"]["title"] == "Backend engineer" for s in data["sessions"])


def test_report_weak_areas_are_written_about_the_candidate_without_tips(make_user, client, template):
    amy = candidate(make_user, "Amy Adams")
    for _ in range(3):
        take(amy, template, 80, parts={"confidence": 50}, categories=["SQL", "SQL"], per_answer=[answer(1, 20), answer(2, 30)])
    data = client.get(BASE + f"candidates/{amy.id}/").json()
    weak = {(w["kind"], w["key"]): w for w in data["weak_areas"]}
    assert weak[("skill", "confidence")]["reason"].startswith("Their recent confidence average")
    assert weak[("topic", "sql")]["reason"].startswith("Their answers on SQL")
    assert all(w["tip"] == "" for w in data["weak_areas"])
    assert [s["key"] for s in data["strengths"]] == ["communication", "technical_relevance", "professionalism"]


def test_report_includes_unfinished_sessions_but_has_no_data_without_a_score(make_user, client, template):
    amy = candidate(make_user, "Amy Adams")
    unscored(amy, template, "in_progress")
    data = client.get(BASE + f"candidates/{amy.id}/").json()
    assert data["has_data"] is False and data["trend"] == [] and data["overall"]["samples"] == 0 and data["overall"]["rating"] is None
    assert [s["status"] for s in data["sessions"]] == ["in_progress"]


def test_report_standing_needs_three_candidates(make_user, client, template, cohort):
    data = client.get(BASE + f"candidates/{cohort['amy'].id}/").json()["standing"]
    assert data["available"] is True and data["candidates_compared"] == 3 and data["percentile"] == 75  # above Cara, level with Bob
    assert data["candidate_average"] == 70 and data["cohort_average"] == pytest.approx(63.3, abs=0.1)
    assert client.get(BASE + f"candidates/{cohort['dan'].id}/").json()["standing"] == {"available": False}


def test_report_standing_is_withheld_with_only_two_scored_candidates(make_user, client, template):
    amy, bob = candidate(make_user, "Amy Adams"), candidate(make_user, "Bob Brown")
    take(amy, template, 80)
    take(bob, template, 60)
    assert client.get(BASE + f"candidates/{amy.id}/").json()["standing"] == {"available": False}


def test_report_type_filter_and_validation(make_user, client, template, boss):
    amy = candidate(make_user, "Amy Adams")
    hr = InterviewTemplate.objects.create(created_by=boss, title="HR chat", interview_type="hr")
    take(amy, template, 60)
    take(amy, hr, 90)
    assert [r["overall"] for r in client.get(BASE + f"candidates/{amy.id}/", {"type": "hr"}).json()["trend"]] == [90]
    assert client.get(BASE + f"candidates/{amy.id}/", {"type": "x"}).status_code == 400


def test_report_for_an_unknown_candidate_is_404(client):
    assert client.get(BASE + "candidates/9999/").status_code == 404


# --- compare ---------------------------------------------------------------------

def ids(*people):
    return ",".join(str(p.id) for p in people)


def test_compare_puts_candidates_side_by_side_in_the_order_asked(client, cohort):
    amy, bob = cohort["amy"], cohort["bob"]
    data = client.get(BASE + "compare/", {"candidates": ids(bob, amy)}).json()
    assert [c["candidate"]["name"] for c in data["candidates"]] == ["Bob Brown", "Amy Adams"]
    amy_col = data["candidates"][1]
    assert amy_col["interviews"] == 3 and amy_col["overall"]["average"] == 70 and amy_col["overall"]["direction"] == "improving"
    assert amy_col["parts"]["communication"]["average"] == 70 and [t["overall"] for t in amy_col["trend"]] == [60, 70, 80]
    assert data["cohort"]["overall"] == pytest.approx(63.3, abs=0.1)  # Amy 70, Bob 70, Cara 50: one vote each


def test_compare_names_the_leader_and_all_leaders_on_a_tie(client, cohort):
    data = client.get(BASE + "compare/", {"candidates": ids(cohort["amy"], cohort["cara"])}).json()
    assert data["leaders"]["overall"] == [cohort["amy"].id] and data["leaders"]["confidence"] == [cohort["amy"].id]


def test_a_tie_lists_everyone_who_shares_the_lead(client, cohort):
    data = client.get(BASE + "compare/", {"candidates": ids(cohort["amy"], cohort["bob"])}).json()
    assert sorted(data["leaders"]["overall"]) == sorted([cohort["amy"].id, cohort["bob"].id])


def test_compare_includes_a_candidate_with_no_scores_as_empty(client, cohort):
    data = client.get(BASE + "compare/", {"candidates": ids(cohort["amy"], cohort["dan"])}).json()
    dan = data["candidates"][1]
    assert dan["interviews"] == 0 and dan["sessions"] == 1 and dan["overall"]["average"] is None and dan["rating"] is None
    assert data["leaders"]["overall"] == []  # one score is nothing to compare


@pytest.mark.parametrize("raw", ["", "1", "1,2,3,4,5", "1,1", "a,b", "1,,", "1;2"])
def test_compare_needs_two_to_four_different_ids(client, raw):
    assert client.get(BASE + "compare/", {"candidates": raw}).status_code == 400


def test_compare_refuses_candidates_outside_the_recruiters_scope(make_user, client, cohort):
    stranger = candidate(make_user, "Eve Stranger")
    take(stranger, InterviewTemplate.objects.create(created_by=make_user("o@example.com", role="recruiter"), title="X", interview_type="hr"), 99)
    assert client.get(BASE + "compare/", {"candidates": ids(cohort["amy"], stranger)}).status_code == 404
    assert client.get(BASE + "compare/", {"candidates": f"{cohort['amy'].id},9999"}).status_code == 404


def test_compare_type_filter(client, cohort, boss):
    hr = InterviewTemplate.objects.create(created_by=boss, title="HR chat", interview_type="hr")
    take(cohort["amy"], hr, 95)
    take(cohort["bob"], hr, 85)
    data = client.get(BASE + "compare/", {"candidates": ids(cohort["amy"], cohort["bob"]), "type": "hr"}).json()
    assert [c["overall"]["average"] for c in data["candidates"]] == [95, 85] and data["leaders"]["overall"] == [cohort["amy"].id]


# --- monitoring ------------------------------------------------------------------

def test_monitor_lists_active_sessions_first_with_progress(make_user, client, template):
    amy, bob = candidate(make_user, "Amy Adams"), candidate(make_user, "Bob Brown")
    done = take(amy, template, 80)
    live = unscored(bob, template, "in_progress")
    for order in (1, 2, 3, 4):
        question = Question.objects.create(session=live, text="Q?", order=order)
        if order <= 3:
            Answer.objects.create(question=question, transcript="x")
    waiting = unscored(amy, template, "scheduled")

    data = client.get(BASE + "sessions/").json()
    assert [r["id"] for r in data["results"]] == [live.id, waiting.id, done.id]
    assert data["counts"] == {"scheduled": 1, "in_progress": 1, "completed": 1, "cancelled": 0, "all": 3} and data["count"] == 3
    row = data["results"][0]
    assert row["candidate"]["name"] == "Bob Brown" and row["template"]["title"] == "Backend engineer"
    assert (row["questions"], row["answered"], row["progress"]) == (4, 3, 75) and row["stalled"] is False and row["overall"] is None
    finished = data["results"][2]
    assert finished["overall"] == 80 and finished["rating"] == "good" and finished["status"] == "completed"


def test_monitor_flags_interviews_that_look_abandoned(make_user, client, template):
    bob = candidate(make_user, "Bob Brown")
    session = unscored(bob, template, "in_progress")
    InterviewSession.objects.filter(pk=session.pk).update(started_at=timezone.now() - timedelta(hours=5))
    assert client.get(BASE + "sessions/").json()["results"][0]["stalled"] is True


def test_monitor_shows_how_long_a_finished_interview_took(make_user, client, template):
    amy = candidate(make_user, "Amy Adams")
    session = take(amy, template, 80)
    start = timezone.now() - timedelta(minutes=20)
    InterviewSession.objects.filter(pk=session.pk).update(started_at=start, ended_at=start + timedelta(minutes=12))
    assert client.get(BASE + "sessions/").json()["results"][0]["duration_seconds"] == 720


def test_monitor_filters_by_status_and_search(make_user, client, template):
    amy, bob = candidate(make_user, "Amy Adams"), candidate(make_user, "Bob Brown")
    take(amy, template, 80)
    unscored(bob, template, "in_progress")
    unscored(bob, template, "cancelled")
    only_live = client.get(BASE + "sessions/", {"status": "in_progress"}).json()
    assert [r["status"] for r in only_live["results"]] == ["in_progress"] and only_live["count"] == 1 and only_live["counts"]["all"] == 3
    assert {r["candidate"]["name"] for r in client.get(BASE + "sessions/", {"q": "amy"}).json()["results"]} == {"Amy Adams"}
    assert client.get(BASE + "sessions/", {"q": "amy"}).json()["counts"]["all"] == 1


def test_monitor_pagination_and_validation(make_user, client, template):
    amy = candidate(make_user, "Amy Adams")
    for _ in range(5):
        take(amy, template, 70)
    page = client.get(BASE + "sessions/", {"limit": 2, "offset": 4}).json()
    assert page["count"] == 5 and len(page["results"]) == 1
    assert client.get(BASE + "sessions/", {"status": "paused"}).status_code == 400
    assert client.get(BASE + "sessions/", {"limit": 500}).status_code == 400


# --- speed -----------------------------------------------------------------------

def test_query_counts_do_not_grow_with_the_number_of_candidates(make_user, client, template, django_assert_max_num_queries):
    people = []
    for index in range(12):
        person = candidate(make_user, f"Person{index} Test")
        people.append(person)
        for _ in range(3):
            take(person, template, 60 + index, categories=["SQL"], per_answer=[answer(1, 50)])
        unscored(person, template, "in_progress")
    with django_assert_max_num_queries(9):
        assert client.get(BASE + f"candidates/{people[0].id}/").status_code == 200
    with django_assert_max_num_queries(7):
        assert client.get(BASE + "compare/", {"candidates": ids(*people[:4])}).status_code == 200
    with django_assert_max_num_queries(12):
        assert client.get(BASE).status_code == 200
    with django_assert_max_num_queries(5):
        assert client.get(BASE + "candidates/", {"limit": 100}).status_code == 200
    with django_assert_max_num_queries(5):
        assert client.get(BASE + "sessions/", {"limit": 100}).status_code == 200
