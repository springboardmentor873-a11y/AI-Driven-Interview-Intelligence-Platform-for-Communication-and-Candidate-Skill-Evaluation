"""Recruiter analytics (Milestone 4, Day 3).

A recruiter sees the interviews that candidates took on **their own templates**, and nothing else: not a
candidate's practice interviews, not custom interviews, and not the other recruiters' templates. That is the
only link between a recruiter and a candidate in the platform, and the template picker tells candidates that
the recruiter who made the template can see their scores. Everything below starts from `scope()` for that reason.

What is here
  * overview(): totals, how interviews ended, the cohort's skills, a weekly trend and per-template results.
  * candidate_rows(): the candidates in that scope with their scores, sortable and searchable.
  * candidate_report(): one candidate, limited to this recruiter's templates.
  * compare(): 2 to 4 candidates side by side.
  * monitor_sessions(): every session with its status and progress, active ones first.

The weekly trend is bucketed in Python (not with a database date function) so it behaves the same on SQLite and
PostgreSQL. Dates are oldest first so a chart can draw them left to right.
"""
from collections import Counter, defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Case, Count, F, IntegerField, Max, Q, When
from django.db.models.functions import Coalesce, Lower
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.interviews.models import InterviewSession, InterviewTemplate
from apps.scoring.models import Score

from . import services, stats
from .services import PARTS, WATCH_BELOW

User = get_user_model()

DEFAULT_LIMIT = 25
MAX_LIMIT = 100
COMPARE_MIN = 2
COMPARE_MAX = 4
WEEKS = 12                 # weeks shown in the trend
TOP_CANDIDATES = 5
MIN_STANDING_CANDIDATES = 3  # a candidate's place among the recruiter's candidates needs at least this many
RECENT_SESSIONS = 20       # sessions listed in a candidate report
STALLED_AFTER = timedelta(hours=3)  # an interview "in progress" for longer than this is probably abandoned

SORTS = ("average", "latest", "interviews", "name")
DEFAULT_ORDER = {"average": "desc", "latest": "desc", "interviews": "desc", "name": "asc"}
SCORED = Q(status=InterviewSession.Status.COMPLETED, score__overall_score__isnull=False)


def scope(recruiter):
    """Every session taken on one of this recruiter's templates."""
    return InterviewSession.objects.filter(template__created_by=recruiter)


def display_name(first_name, last_name, email):
    return f"{first_name} {last_name}".strip() or email.split("@")[0]


def person(user_id, first_name, last_name, email):
    return {"id": user_id, "name": display_name(first_name, last_name, email), "email": email}


def _status_counts(sessions):
    counts = {value: 0 for value in InterviewSession.Status.values}
    for row in sessions.values("status").annotate(n=Count("id")):
        counts[row["status"]] = row["n"]
    return counts


def _completion_rate(completed, cancelled):
    """Of the interviews that are over, the share that were finished (not cancelled). None until one is over."""
    closed = completed + cancelled
    return round(100 * completed / closed) if closed else None


def _name_filter(queryset, text, prefix="candidate__"):
    """Every word typed must match the first name, last name or email."""
    for token in text.split():
        queryset = queryset.filter(
            Q(**{f"{prefix}email__icontains": token}) | Q(**{f"{prefix}first_name__icontains": token})
            | Q(**{f"{prefix}last_name__icontains": token})
        )
    return queryset


# --- overview -------------------------------------------------------------------

def _weekly_trend(scored, now):
    """The cohort's average overall score for each of the last WEEKS weeks (Monday start), oldest first."""
    today = timezone.localtime(now).date()
    this_week = today - timedelta(days=today.weekday())
    starts = [this_week - timedelta(weeks=WEEKS - 1 - i) for i in range(WEEKS)]
    buckets = defaultdict(list)
    rows = (
        scored.annotate(finished=Coalesce("ended_at", "created_at")).filter(finished__gte=now - timedelta(weeks=WEEKS + 1))
        .values_list("finished", "score__overall_score")
    )
    for finished, overall in rows:
        day = timezone.localtime(finished).date()
        buckets[day - timedelta(days=day.weekday())].append(overall)
    return [
        {"week_start": start.isoformat(), "interviews": len(buckets[start]), "average_overall": stats.r1(stats.mean(buckets[start]))}
        for start in starts
    ]


def _template_rows(recruiter):
    completed = Q(sessions__status=InterviewSession.Status.COMPLETED)
    templates = (
        InterviewTemplate.objects.filter(created_by=recruiter)
        .annotate(
            session_count=Count("sessions", distinct=True),
            completed_count=Count("sessions", filter=completed, distinct=True),
            cancelled_count=Count("sessions", filter=Q(sessions__status=InterviewSession.Status.CANCELLED), distinct=True),
            candidate_count=Count("sessions__candidate", distinct=True),
            scored_count=Count("sessions", filter=completed & Q(sessions__score__overall_score__isnull=False), distinct=True),
            average=Avg("sessions__score__overall_score", filter=completed),
            best=Max("sessions__score__overall_score", filter=completed),
        )
        .order_by("-created_at", "-id")
    )
    return [
        {
            "id": t.id, "title": t.title, "interview_type": t.interview_type, "difficulty": t.difficulty,
            "domain": t.domain, "is_published": t.is_published, "sessions": t.session_count,
            "candidates": t.candidate_count, "completed": t.completed_count, "scored": t.scored_count,
            "completion_rate": _completion_rate(t.completed_count, t.cancelled_count),
            "average_overall": stats.r1(t.average), "best_overall": stats.r1(t.best),
        }
        for t in templates
    ]


def overview(recruiter, now=None):
    now = now or timezone.now()
    sessions = scope(recruiter)
    scored = services.scored_queryset(sessions)
    counts = _status_counts(sessions)
    totals = scored.aggregate(
        average=Avg("score__overall_score"), best=Max("score__overall_score"),
        **{name: Avg(f"score__{name}_score") for name in PARTS},
    )
    ratings = {row["score__rating"]: row["n"] for row in scored.values("score__rating").annotate(n=Count("id"))}
    finished = sessions.filter(status=InterviewSession.Status.COMPLETED).annotate(finished=Coalesce("ended_at", "created_at"))
    recent = finished.aggregate(
        week=Count("id", filter=Q(finished__gte=now - timedelta(days=7))),
        month=Count("id", filter=Q(finished__gte=now - timedelta(days=30))),
    )
    templates = _template_rows(recruiter)
    top = candidate_rows(recruiter, sort="average", limit=TOP_CANDIDATES, offset=0, scored_only=True)

    return {
        "generated_at": now.isoformat(),
        "has_data": counts["completed"] + counts["cancelled"] + counts["in_progress"] + counts["scheduled"] > 0,
        "summary": {
            "templates": len(templates),
            "published_templates": sum(t["is_published"] for t in templates),
            "candidates": sessions.values("candidate_id").distinct().count(),
            "sessions_total": sum(counts.values()),
            "scored": scored.count(),
            "average_overall": stats.r1(totals["average"]),
            "best_overall": stats.r1(totals["best"]),
            "completion_rate": _completion_rate(counts["completed"], counts["cancelled"]),
        },
        "status_counts": counts,
        "parts": [
            {"key": name, "label": services.PART_LABELS[name], "weight": round(Score.WEIGHTS[name] * 100), "average": stats.r1(totals[name])}
            for name in PARTS
        ],
        "rating_counts": {value: ratings.get(value, 0) for value, _ in Score.Rating.choices},
        "weekly": _weekly_trend(scored, now),
        "templates": templates,
        "top_candidates": top["results"],
        "activity": {"completed_last_7_days": recent["week"], "completed_last_30_days": recent["month"]},
    }


# --- candidates -----------------------------------------------------------------

def _order(sort, order):
    direction = order or DEFAULT_ORDER[sort]
    if sort == "name":
        keys = [Lower("candidate__first_name"), Lower("candidate__last_name"), Lower("candidate__email")]
        keys = [key.asc() if direction == "asc" else key.desc() for key in keys]
    else:
        field = {"average": "average", "latest": "last_at", "interviews": "interviews"}[sort]
        keys = [F(field).asc(nulls_last=True) if direction == "asc" else F(field).desc(nulls_last=True)]  # no score is always last
    return [*keys, "candidate_id"]  # the id keeps pages stable when scores tie


def _candidate_row(agg, history):
    values = [overall for overall, _ in history]
    latest_rating = history[-1][1] if history else ""
    return {
        "candidate": person(agg["candidate_id"], agg["candidate__first_name"], agg["candidate__last_name"], agg["candidate__email"]),
        "sessions": agg["sessions"],
        "interviews": agg["interviews"],
        "average_overall": stats.r1(agg["average"]),
        "best_overall": stats.r1(agg["best"]),
        "latest_overall": stats.r1(values[-1]) if values else None,
        "latest_rating": services._rating(latest_rating),
        "last_interview_at": agg["last_at"].isoformat() if agg["last_at"] else None,
        "direction": stats.direction(values),
        "predicted_next": stats.predict_next(values),
        "parts": {name: stats.r1(agg[name]) for name in PARTS},
    }


def candidate_rows(recruiter, *, interview_type=None, search="", sort="average", order=None, limit=DEFAULT_LIMIT, offset=0, scored_only=False):
    """One page of the candidates in the recruiter's scope. Candidates with no scored interview come last (or are left out)."""
    sessions = scope(recruiter)
    if interview_type:
        sessions = sessions.filter(interview_type=interview_type)
    if search:
        sessions = _name_filter(sessions, search)
    if scored_only:
        sessions = services.scored_queryset(sessions)

    grouped = sessions.values("candidate_id", "candidate__first_name", "candidate__last_name", "candidate__email").annotate(
        sessions=Count("id"),
        interviews=Count("id", filter=SCORED),
        average=Avg("score__overall_score", filter=SCORED),
        best=Max("score__overall_score", filter=SCORED),
        last_at=Max(Coalesce("ended_at", "created_at"), filter=SCORED),
        **{name: Avg(f"score__{name}_score", filter=SCORED) for name in PARTS},
    )
    count = grouped.count()
    page = list(grouped.order_by(*_order(sort, order))[offset:offset + limit])

    history = defaultdict(list)  # oldest first
    ids = [row["candidate_id"] for row in page]
    scored = services.scored_queryset(sessions.filter(candidate_id__in=ids)).order_by("created_at", "id")
    for candidate_id, overall, rating in scored.values_list("candidate_id", "score__overall_score", "score__rating"):
        history[candidate_id].append((overall, rating))

    return {"count": count, "limit": limit, "offset": offset, "results": [_candidate_row(row, history[row["candidate_id"]]) for row in page]}


# --- one candidate --------------------------------------------------------------

def _standing(recruiter, candidate_id, interview_type):
    """Where the candidate's average sits among this recruiter's candidates."""
    sessions = scope(recruiter)
    if interview_type:
        sessions = sessions.filter(interview_type=interview_type)
    rows = services.scored_queryset(sessions).values("candidate_id").annotate(average=Avg("score__overall_score"))
    averages = {row["candidate_id"]: row["average"] for row in rows}
    mine = averages.get(candidate_id)
    if mine is None or len(averages) < MIN_STANDING_CANDIDATES:
        return {"available": False}
    others = [value for key, value in averages.items() if key != candidate_id]
    return {
        "available": True, "percentile": stats.percentile_of(mine, others), "candidates_compared": len(averages),
        "candidate_average": stats.r1(mine), "cohort_average": stats.r1(stats.mean(averages.values())),
    }


def _session_rows(queryset, now):
    """Sessions with the candidate, template, progress and score, in the order of the queryset."""
    rows = []
    for session in queryset:
        score = getattr(session, "score", None)
        started = session.started_at
        active = session.status == InterviewSession.Status.IN_PROGRESS
        total = session.question_total
        rows.append({
            "id": session.id,
            "candidate": person(session.candidate_id, session.candidate.first_name, session.candidate.last_name, session.candidate.email),
            "template": {"id": session.template_id, "title": session.template.title} if session.template else None,
            "interview_type": session.interview_type,
            "difficulty": session.difficulty,
            "domain": session.domain,
            "status": session.status,
            "created_at": session.created_at.isoformat(),
            "started_at": started.isoformat() if started else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "duration_seconds": int((session.ended_at - started).total_seconds()) if started and session.ended_at else None,
            "questions": total,
            "answered": session.answered_total,
            "progress": round(100 * session.answered_total / total) if total else 0,
            "stalled": bool(active and (started or session.created_at) < now - STALLED_AFTER),
            "overall": stats.r1(score.overall_score) if score else None,
            "rating": score.rating if score and score.overall_score is not None else "",
        })
    return rows


def _annotated(sessions):
    return sessions.select_related("candidate", "template", "score").annotate(
        question_total=Count("questions", distinct=True), answered_total=Count("questions__answer", distinct=True),
    )


def candidate_report(recruiter, candidate_id, interview_type=None, now=None):
    """Everything a recruiter can see about one candidate: only interviews on this recruiter's templates."""
    now = now or timezone.now()
    sessions = scope(recruiter).filter(candidate_id=candidate_id)
    first = sessions.select_related("candidate").first()
    if first is None:
        raise NotFound("No interviews from this candidate on your templates.")
    candidate = first.candidate
    if interview_type:
        sessions = sessions.filter(interview_type=interview_type)

    scored_total, scored = services._scored_sessions(sessions, interview_type)
    overall_values = [s.score.overall_score for s in scored]
    parts = services._parts(scored)
    topics = services._by_category(scored)
    latest = scored[-1].score if scored else None
    counts = Counter(s.score.rating for s in scored)
    status_counts = _status_counts(sessions)

    by_template = defaultdict(list)
    for session in scored:
        by_template[session.template_id].append(session)
    template_rows = []
    for group in by_template.values():
        overall = [s.score.overall_score for s in group]
        template_rows.append({
            "template_id": group[0].template_id, "title": group[0].template.title, "interviews": len(group),
            "average_overall": stats.r1(stats.mean(overall)), "best_overall": stats.r1(max(overall)), "latest_overall": stats.r1(overall[-1]),
        })
    template_rows.sort(key=lambda row: (-row["interviews"], row["title"]))

    recent_sessions = _annotated(sessions).order_by("-created_at", "-id")[:RECENT_SESSIONS]

    return {
        "generated_at": now.isoformat(),
        "filter": {"interview_type": interview_type},
        "candidate": {
            "id": candidate.id, "name": display_name(candidate.first_name, candidate.last_name, candidate.email),
            "email": candidate.email, "joined": candidate.created_at.isoformat(),
        },
        "has_data": bool(scored),
        "summary": {
            "sessions_total": sum(status_counts.values()), "completed": status_counts["completed"], "scored": scored_total,
            "in_chart": len(scored), "cancelled": status_counts["cancelled"],
        },
        "overall": {**stats.series_stats(overall_values), "rating": services._rating(latest.rating if latest else ""),
                    "rating_counts": {value: counts.get(value, 0) for value, _ in Score.Rating.choices}},
        "parts": parts,
        "trend": services._trend(scored),
        "by_type": services._by_type(scored),
        "by_category": topics,
        "by_template": template_rows,
        "strengths": sorted(
            ({"key": p["key"], "label": p["label"], "recent_average": p["recent_average"]}
             for p in parts if p["recent_average"] is not None and p["recent_average"] >= WATCH_BELOW),
            key=lambda item: -item["recent_average"],
        )[:3],
        "weak_areas": services._weak_areas(parts, topics, who="their", tips=False),
        "standing": _standing(recruiter, candidate_id, interview_type),
        "sessions": _session_rows(recent_sessions, now),
    }


# --- compare --------------------------------------------------------------------

def compare(recruiter, candidate_ids, interview_type=None):
    """2 to 4 candidates side by side. Every one must have taken an interview on this recruiter's templates."""
    in_scope = set(scope(recruiter).filter(candidate_id__in=candidate_ids).values_list("candidate_id", flat=True))
    if in_scope != set(candidate_ids):
        raise NotFound("One of these candidates has no interviews on your templates.")
    people = {user.id: user for user in User.objects.filter(pk__in=candidate_ids)}

    sessions = scope(recruiter)
    if interview_type:
        sessions = sessions.filter(interview_type=interview_type)
    all_counts = {row["candidate_id"]: row["n"] for row in sessions.filter(candidate_id__in=candidate_ids).values("candidate_id").annotate(n=Count("id"))}
    history = defaultdict(list)  # oldest first
    for session in services.scored_queryset(sessions.filter(candidate_id__in=candidate_ids)).select_related("score").order_by("created_at", "id"):
        history[session.candidate_id].append(session)

    columns = []
    for candidate_id in candidate_ids:  # keep the order the recruiter picked
        user = people[candidate_id]
        scored = history[candidate_id]
        latest = scored[-1].score if scored else None
        columns.append({
            "candidate": person(user.id, user.first_name, user.last_name, user.email),
            "sessions": all_counts.get(candidate_id, 0),
            "interviews": len(scored),
            "overall": stats.series_stats([s.score.overall_score for s in scored]),
            "rating": services._rating(latest.rating if latest else ""),
            "parts": {
                name: stats.series_stats([getattr(s.score, f"{name}_score") for s in scored if getattr(s.score, f"{name}_score") is not None])
                for name in PARTS
            },
            "trend": [
                {"date": (s.ended_at or s.created_at).isoformat(), "overall": stats.r1(s.score.overall_score)} for s in scored[-services.TREND_LIMIT:]
            ],
        })

    leaders = {}
    for key in ("overall", *PARTS):
        averages = {c["candidate"]["id"]: (c["overall"] if key == "overall" else c["parts"][key])["average"] for c in columns}
        known = {cid: value for cid, value in averages.items() if value is not None}
        best = max(known.values()) if len(known) >= 2 else None
        leaders[key] = [cid for cid, value in known.items() if value == best] if best is not None else []

    # The cohort average counts every candidate once, like the standing in a candidate report
    per_candidate = list(
        services.scored_queryset(sessions).values("candidate_id")
        .annotate(overall=Avg("score__overall_score"), **{name: Avg(f"score__{name}_score") for name in PARTS})
    )
    cohort = {key: stats.mean([row[key] for row in per_candidate if row[key] is not None]) for key in ("overall", *PARTS)}
    return {
        "filter": {"interview_type": interview_type},
        "candidates": columns,
        "leaders": leaders,
        "cohort": {key: stats.r1(value) for key, value in cohort.items()},
    }


# --- monitoring -----------------------------------------------------------------

def monitor_sessions(recruiter, status=None, limit=DEFAULT_LIMIT, offset=0, search="", now=None):
    """Sessions on the recruiter's templates, with the ones happening now first."""
    now = now or timezone.now()
    base = scope(recruiter)
    if search:
        base = _name_filter(base, search)
    counts = _status_counts(base)
    queryset = base.filter(status=status) if status else base
    order = Case(
        When(status=InterviewSession.Status.IN_PROGRESS, then=0), When(status=InterviewSession.Status.SCHEDULED, then=1),
        default=2, output_field=IntegerField(),
    )
    page = _annotated(queryset).annotate(rank=order).order_by("rank", "-created_at", "-id")[offset:offset + limit]
    return {
        "generated_at": now.isoformat(), "counts": {**counts, "all": sum(counts.values())},
        "count": counts[status] if status else sum(counts.values()), "limit": limit, "offset": offset,
        "results": _session_rows(page, now),
    }
