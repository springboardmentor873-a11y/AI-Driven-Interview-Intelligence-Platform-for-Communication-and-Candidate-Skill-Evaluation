"""Candidate analytics (Milestone 4, Day 1).

Turns a candidate's saved scores into the numbers behind the analytics page: score trend, the four
assessment areas (the SRS "skills"), results by interview type and by question topic, a weak-area
outlook, an anonymous ranking and recent activity.

Reading rules
  * Only completed interviews that have a score count. Cancelled and unfinished ones do not.
  * A part that could not be measured (None) is left out of that part's history, never counted as 0.
    Skipped questions are different: the scoring engine already counted them as 0 when it scored.
  * Dates are oldest first so a chart can draw them left to right.

Everything is computed from a few queries, whatever the number of interviews, so it stays fast as a
candidate's history grows. Recruiter and admin analytics (Days 3 and 4) reuse these helpers.
"""
from collections import Counter, defaultdict

from django.db.models import Avg
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.interviews.models import InterviewSession, InterviewType, Question
from apps.scoring.models import Score

from . import stats

PARTS = ("communication", "confidence", "technical_relevance", "professionalism")
PART_LABELS = {
    "communication": "Communication",
    "confidence": "Confidence",
    "technical_relevance": "Technical relevance",
    "professionalism": "Professionalism",
}
# One practical line per area, shown next to a weak area. The detailed advice stays in the AI feedback.
PART_TIPS = {
    "communication": "Answer out loud in a short structure (point, example, result) and cut filler words and rambling.",
    "confidence": "Look at the camera, keep your face in the picture and pause instead of filling silence.",
    "technical_relevance": "Name the exact tools, steps and trade-offs, and give one real example in every answer.",
    "professionalism": "Use about half to most of the time for each answer, open with the point and keep a calm, polite tone.",
}
TREND_LIMIT = 50           # newest interviews used for the charts
MIN_RANKING_COHORT = 5     # no ranking until this many candidates have a score, so nobody can be singled out
TOPIC_MIN_ANSWERS = 2      # a topic needs this many answers before it can be called weak
TOPIC_LIMIT = 12
WEAK_BELOW = 60            # under this the area is a high risk (the "Needs Improvement" band starts at 40, "Average" at 60)
WATCH_BELOW = 75           # under this the area is worth watching ("Good" starts at 75)
RISK_ORDER = {"high": 0, "medium": 1}


def _rating(value):
    return {"value": value, "label": Score.Rating(value).label} if value else None


def _risk(recent, predicted, direction):
    """\"high\", \"medium\" or None for one area, from its recent average and where its trend points."""
    if recent is None:
        return None
    if recent < WEAK_BELOW or (predicted is not None and predicted < WEAK_BELOW):
        return "high"
    if recent < WATCH_BELOW or (predicted is not None and predicted < WATCH_BELOW and direction == "declining"):
        return "medium"
    return None


def _reason(label, recent, predicted, direction, who="your"):
    text = f"{who.capitalize()} recent {label.lower()} average is {recent:.0f} out of 100"
    if direction == "declining":
        text += " and it has been falling"
    if predicted is not None:
        text += f"; the trend points to about {predicted:.0f} next time"
    return text + "."


def scored_queryset(sessions):
    """Completed interviews that have an overall score, out of any queryset of sessions."""
    return sessions.filter(status=InterviewSession.Status.COMPLETED, score__overall_score__isnull=False)


def _scored_sessions(sessions, interview_type):
    """The scored interviews of a queryset, oldest first (the newest TREND_LIMIT of them) and how many there are."""
    queryset = scored_queryset(sessions)
    if interview_type:
        queryset = queryset.filter(interview_type=interview_type)
    total = queryset.count()
    newest = queryset.select_related("score", "template").order_by("-created_at", "-id")[:TREND_LIMIT]
    return total, list(reversed(newest))


def _trend(sessions):
    rows = []
    for session in sessions:
        score = session.score
        rows.append({
            "session_id": session.id,
            "date": (session.ended_at or session.created_at).isoformat(),
            "title": session.template.title if session.template else "",
            "interview_type": session.interview_type,
            "difficulty": session.difficulty,
            "domain": session.domain,
            "overall": stats.r1(score.overall_score),
            "rating": score.rating,
            "communication": stats.r1(score.communication_score),
            "confidence": stats.r1(score.confidence_score),
            "technical_relevance": stats.r1(score.technical_relevance_score),
            "professionalism": stats.r1(score.professionalism_score),
            "complete": score.details.get("complete", False),
        })
    return rows


def _part_values(sessions):
    """For each part, its scores oldest first, with the interviews where it was not measured left out."""
    values = {name: [] for name in PARTS}
    for session in sessions:
        for name in PARTS:
            value = getattr(session.score, f"{name}_score")
            if value is not None:
                values[name].append(value)
    return values


def _parts(sessions):
    values = _part_values(sessions)
    return [
        {"key": name, "label": PART_LABELS[name], "weight": round(Score.WEIGHTS[name] * 100), **stats.series_stats(values[name])}
        for name in PARTS
    ]


def _by_type(sessions):
    groups = defaultdict(list)
    for session in sessions:
        groups[session.interview_type].append(session)
    rows = []
    for value, label in InterviewType.choices:
        group = groups.get(value)
        if not group:
            continue
        overall = [s.score.overall_score for s in group]
        part_values = _part_values(group)
        rows.append({
            "interview_type": value, "label": label, "interviews": len(group),
            "average_overall": stats.r1(stats.mean(overall)), "best_overall": stats.r1(max(overall)),
            "latest_overall": stats.r1(overall[-1]),
            "parts": {name: stats.r1(stats.mean(part_values[name])) for name in PARTS},
        })
    return rows


def _by_category(sessions):
    """Average score per question topic. Topics come from the questions (for example Python or Teamwork)."""
    if not sessions:
        return []
    topics = {
        (row["session_id"], row["order"]): row["category"].strip()
        for row in Question.objects.filter(session__in=sessions).values("session_id", "order", "category")
        if row["category"].strip()
    }
    groups = {}  # lower-case topic -> {"name", "scores"}
    for session in sessions:
        for item in session.score.details.get("per_answer", []):
            topic = topics.get((session.id, item.get("order")))
            # Answers with no words captured are left out, like the scoring engine does
            if not topic or item.get("status") not in ("analyzed", "skipped") or item.get("overall") is None:
                continue
            group = groups.setdefault(topic.lower(), {"name": topic, "scores": [], "skipped": 0})
            group["scores"].append(item["overall"])
            group["skipped"] += item["status"] == "skipped"
    rows = [
        {"name": g["name"], "answers": len(g["scores"]), "skipped": g["skipped"], "average": stats.r1(stats.mean(g["scores"]))}
        for g in groups.values()
    ]
    rows.sort(key=lambda row: (row["average"], row["name"]))  # weakest first
    return rows[:TOPIC_LIMIT]


def _weak_areas(parts, topics, who="your", tips=True):
    """Skills and topics to work on. `who` is "your" for the candidate and "their" for a recruiter reading the report."""
    weak = []
    for part in parts:
        risk = _risk(part["recent_average"], part["predicted_next"], part["direction"])
        if risk:
            weak.append({
                "kind": "skill", "key": part["key"], "label": part["label"], "risk": risk,
                "recent_average": part["recent_average"], "predicted_next": part["predicted_next"],
                "direction": part["direction"],
                "reason": _reason(part["label"], part["recent_average"], part["predicted_next"], part["direction"], who),
                "tip": PART_TIPS[part["key"]] if tips else "",
            })
    weak.sort(key=lambda w: (RISK_ORDER[w["risk"]], w["recent_average"]))

    weak_topics = []
    for topic in topics:
        if topic["answers"] < TOPIC_MIN_ANSWERS:
            continue
        risk = _risk(topic["average"], None, None)
        if risk:
            weak_topics.append({
                "kind": "topic", "key": topic["name"].lower(), "label": topic["name"], "risk": risk,
                "recent_average": topic["average"], "predicted_next": None, "direction": "not_enough_data",
                "reason": f"{who.capitalize()} answers on {topic['name']} average {topic['average']:.0f} out of 100 over {topic['answers']} questions.",
                "tip": f"Practise more {topic['name']} questions and prepare one concrete example for each." if tips else "",
            })
    weak_topics.sort(key=lambda w: (RISK_ORDER[w["risk"]], w["recent_average"]))
    return weak + weak_topics[:3]


def _ranking(user):
    """Where this candidate's average overall score sits among all candidates, without naming anyone."""
    rows = (
        Score.objects.filter(overall_score__isnull=False, session__status=InterviewSession.Status.COMPLETED)
        .values("session__candidate_id").annotate(average=Avg("overall_score"))
    )
    averages = {row["session__candidate_id"]: row["average"] for row in rows}
    mine = averages.get(user.id)
    if mine is None:
        return {"available": False, "reason": "Finish and score an interview to see how you compare."}
    if len(averages) < MIN_RANKING_COHORT:
        return {"available": False, "reason": f"Ranking appears once {MIN_RANKING_COHORT} candidates have scored interviews."}
    others = [value for candidate, value in averages.items() if candidate != user.id]
    return {
        "available": True,
        "percentile": stats.percentile_of(mine, others),
        "candidates_compared": len(averages),
        "your_average": stats.r1(mine),
        "cohort_average": stats.r1(stats.mean(averages.values())),
    }


def _activity(user, now):
    finished = list(
        InterviewSession.objects.filter(candidate=user, status=InterviewSession.Status.COMPLETED)
        .annotate(finished=Coalesce("ended_at", "created_at")).values_list("finished", flat=True)
    )
    return {
        "last_interview_at": max(finished).isoformat() if finished else None,
        "completed_last_7_days": sum(1 for f in finished if (now - f).days < 7),
        "completed_last_30_days": sum(1 for f in finished if (now - f).days < 30),
    }


def candidate_analytics(user, interview_type=None, now=None):
    """Everything the candidate analytics page needs, in one dictionary."""
    now = now or timezone.now()
    scored_total, sessions = _scored_sessions(InterviewSession.objects.filter(candidate=user), interview_type)
    overall_values = [s.score.overall_score for s in sessions]
    parts = _parts(sessions)
    categories = _by_category(sessions)
    latest = sessions[-1].score if sessions else None
    counts = Counter(s.score.rating for s in sessions)
    all_sessions = InterviewSession.objects.filter(candidate=user)
    if interview_type:
        all_sessions = all_sessions.filter(interview_type=interview_type)
    status_counts = Counter(all_sessions.values_list("status", flat=True))

    return {
        "generated_at": now.isoformat(),
        "filter": {"interview_type": interview_type},
        "has_data": bool(sessions),
        "summary": {
            "sessions_total": sum(status_counts.values()),
            "completed": status_counts["completed"],
            "scored": scored_total,
            "in_chart": len(sessions),
            "cancelled": status_counts["cancelled"],
        },
        "overall": {**stats.series_stats(overall_values), "rating": _rating(latest.rating if latest else ""),
                    "rating_counts": {value: counts.get(value, 0) for value, _ in Score.Rating.choices}},
        "parts": parts,
        "trend": _trend(sessions),
        "by_type": _by_type(sessions),
        "by_category": categories,
        "weak_areas": _weak_areas(parts, categories),
        "ranking": _ranking(user),
        "activity": _activity(user, now),
    }
