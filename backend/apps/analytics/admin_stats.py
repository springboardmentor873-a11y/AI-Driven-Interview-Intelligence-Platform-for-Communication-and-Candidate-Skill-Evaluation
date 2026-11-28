"""Platform-wide analytics for admins (Milestone 4, Day 4).

Three views of the whole platform, none of which is limited to one recruiter or candidate:
  * overview(): users, interviews, content and the busiest recruiters and templates.
  * activity(): a feed of the latest things that happened, including what admins did (the audit log).
  * ai_usage(): how the AI service is doing, from the calls the server logged (see apps/ai/gemini.py).

Weekly and daily series are bucketed in Python so they behave the same on SQLite and PostgreSQL, and every
series lists its oldest period first so a chart can draw it left to right.
"""
from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Max, Q
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.interviews.models import InterviewSession, InterviewTemplate
from apps.resumes.models import Resume
from apps.scoring.models import Feedback, Score
from apps.system import store
from apps.system.models import AICall, AuditLog

from . import services, stats
from .recruiter import display_name, person

User = get_user_model()

WEEKS = 12
AI_DAYS = 14
TOP = 5
FEED_DEFAULT = 30
FEED_MAX = 100
DURATION_SAMPLE = 500            # the newest completed interviews used for the average length
RECENT_FAILURES = 10
FEED_KINDS = ("signup", "interview", "resume", "template", "admin")
SCORED = Q(status=InterviewSession.Status.COMPLETED, score__overall_score__isnull=False)


def _week_start(moment):
    day = timezone.localtime(moment).date()
    return day - timedelta(days=day.weekday())


def _weeks(now):
    this_week = _week_start(now)
    return [this_week - timedelta(weeks=WEEKS - 1 - i) for i in range(WEEKS)]


def _rate(part, whole):
    return round(100 * part / whole) if whole else None


def _median(values):
    values = sorted(values)
    middle = len(values) // 2
    if not values:
        return None
    return values[middle] if len(values) % 2 else (values[middle - 1] + values[middle]) / 2


# --- overview -------------------------------------------------------------------

def _users(now):
    by_role = {value: 0 for value in User.Role.values}
    for row in User.objects.values("role").annotate(n=Count("id")):
        by_role[row["role"]] = row["n"]
    counts = User.objects.aggregate(
        total=Count("id"), active=Count("id", filter=Q(is_active=True)),
        new_7=Count("id", filter=Q(date_joined__gte=now - timedelta(days=7))),
        new_30=Count("id", filter=Q(date_joined__gte=now - timedelta(days=30))),
    )
    starts = _weeks(now)
    buckets = defaultdict(int)
    for joined in User.objects.filter(date_joined__gte=now - timedelta(weeks=WEEKS + 1)).values_list("date_joined", flat=True):
        buckets[_week_start(joined)] += 1
    recent = InterviewSession.objects.filter
    return {
        "total": counts["total"], "active": counts["active"], "inactive": counts["total"] - counts["active"],
        "by_role": by_role, "new_last_7_days": counts["new_7"], "new_last_30_days": counts["new_30"],
        "active_candidates_7_days": recent(created_at__gte=now - timedelta(days=7)).values("candidate_id").distinct().count(),
        "active_candidates_30_days": recent(created_at__gte=now - timedelta(days=30)).values("candidate_id").distinct().count(),
        "active_recruiters_30_days": recent(created_at__gte=now - timedelta(days=30), template__isnull=False).values("template__created_by_id").distinct().count(),
        "signups_weekly": [{"week_start": start.isoformat(), "signups": buckets[start]} for start in starts],
    }


def _interviews(now):
    sessions = InterviewSession.objects.all()
    status_counts = {value: 0 for value in InterviewSession.Status.values}
    for row in sessions.values("status").annotate(n=Count("id")):
        status_counts[row["status"]] = row["n"]
    type_counts = {row["interview_type"]: row["n"] for row in sessions.values("interview_type").annotate(n=Count("id"))}
    scored = services.scored_queryset(sessions)
    totals = scored.aggregate(
        scored=Count("id"), average=Avg("score__overall_score"), best=Max("score__overall_score"),
        **{name: Avg(f"score__{name}_score") for name in services.PARTS},
    )
    ratings = {row["score__rating"]: row["n"] for row in scored.values("score__rating").annotate(n=Count("id"))}

    cutoff = now - timedelta(weeks=WEEKS + 1)
    starts = _weeks(now)
    started, finished = defaultdict(int), defaultdict(list)
    for created in sessions.filter(created_at__gte=cutoff).values_list("created_at", flat=True):
        started[_week_start(created)] += 1
    done = scored.annotate(done=Coalesce("ended_at", "created_at")).filter(done__gte=cutoff)
    for moment, overall in done.values_list("done", "score__overall_score"):
        finished[_week_start(moment)].append(overall)

    durations = [
        (end - begin).total_seconds()
        for begin, end in sessions.filter(status=InterviewSession.Status.COMPLETED, started_at__isnull=False, ended_at__isnull=False)
        .order_by("-ended_at").values_list("started_at", "ended_at")[:DURATION_SAMPLE]
        if end >= begin
    ]
    return {
        "total": sum(status_counts.values()), "status_counts": status_counts, "type_counts": type_counts,
        "scored": totals["scored"], "average_overall": stats.r1(totals["average"]), "best_overall": stats.r1(totals["best"]),
        "completion_rate": _rate(status_counts["completed"], status_counts["completed"] + status_counts["cancelled"]),
        "average_duration_seconds": round(stats.mean(durations)) if durations else None,
        "median_duration_seconds": round(_median(durations)) if durations else None,
        "rating_counts": {value: ratings.get(value, 0) for value, _ in Score.Rating.choices},
        "parts": [
            {"key": name, "label": services.PART_LABELS[name], "weight": round(Score.WEIGHTS[name] * 100), "average": stats.r1(totals[name])}
            for name in services.PARTS
        ],
        "weekly": [
            {"week_start": start.isoformat(), "started": started[start], "completed": len(finished[start]), "average_overall": stats.r1(stats.mean(finished[start]))}
            for start in starts
        ],
    }


def _top_recruiters():
    rows = (
        InterviewSession.objects.filter(template__isnull=False)
        .values("template__created_by_id", "template__created_by__first_name", "template__created_by__last_name", "template__created_by__email")
        .annotate(
            templates=Count("template", distinct=True), candidates=Count("candidate", distinct=True), interviews=Count("id"),
            completed=Count("id", filter=Q(status=InterviewSession.Status.COMPLETED)), average=Avg("score__overall_score", filter=SCORED),
        )
        .order_by("-interviews", "template__created_by_id")[:TOP]
    )
    return [
        {
            "recruiter": person(r["template__created_by_id"], r["template__created_by__first_name"], r["template__created_by__last_name"], r["template__created_by__email"]),
            "templates": r["templates"], "candidates": r["candidates"], "interviews": r["interviews"], "completed": r["completed"],
            "average_overall": stats.r1(r["average"]),
        }
        for r in rows
    ]


def _top_templates():
    rows = (
        InterviewTemplate.objects.annotate(
            session_count=Count("sessions"), completed_count=Count("sessions", filter=Q(sessions__status=InterviewSession.Status.COMPLETED)),
            average=Avg("sessions__score__overall_score", filter=Q(sessions__status=InterviewSession.Status.COMPLETED)),
        )
        .filter(session_count__gt=0).select_related("created_by").order_by("-session_count", "id")[:TOP]
    )
    return [
        {
            "id": t.id, "title": t.title, "interview_type": t.interview_type,
            "owner": display_name(t.created_by.first_name, t.created_by.last_name, t.created_by.email),
            "sessions": t.session_count, "completed": t.completed_count, "average_overall": stats.r1(t.average),
        }
        for t in rows
    ]


def _content():
    templates = InterviewTemplate.objects.aggregate(total=Count("id"), published=Count("id", filter=Q(is_published=True)))
    sources = {row["parse_source"]: row["n"] for row in Resume.objects.values("parse_source").annotate(n=Count("id"))}
    return {
        "templates": templates["total"], "published_templates": templates["published"], "resumes": sum(sources.values()),
        "resume_sources": {"ai": sources.get("ai", 0), "basic": sources.get("basic", 0), "unparsed": sources.get("", 0)},
    }


def overview(now=None):
    now = now or timezone.now()
    return {
        "generated_at": now.isoformat(),
        "users": _users(now),
        "interviews": _interviews(now),
        "content": _content(),
        "top_recruiters": _top_recruiters(),
        "top_templates": _top_templates(),
        "ai": _ai_window(now - timedelta(hours=24)) | {"enabled": store.ai_config()["enabled"]},
    }


# --- activity feed --------------------------------------------------------------

def _user_ref(user):
    return person(user.id, user.first_name, user.last_name, user.email) if user else None


def _event(kind, event, at, summary, actor=None, detail=None):
    return {"kind": kind, "event": event, "at": at.isoformat(), "summary": summary, "actor": actor, "detail": detail or {}}


def _signups(limit):
    for user in User.objects.order_by("-date_joined", "-id")[:limit]:
        name = display_name(user.first_name, user.last_name, user.email)
        yield _event("signup", "joined", user.date_joined, f"{name} joined as a {user.role}", _user_ref(user), {"role": user.role})


def _interview_events(limit):
    base = InterviewSession.objects.select_related("candidate", "template", "score")

    def label(session):
        return session.template.title if session.template else f"{session.get_interview_type_display()} interview"

    for s in base.filter(started_at__isnull=False).order_by("-started_at", "-id")[:limit]:
        yield _event("interview", "started", s.started_at, f"{display_name(s.candidate.first_name, s.candidate.last_name, s.candidate.email)} started {label(s)}", _user_ref(s.candidate), {"session_id": s.id})
    for s in base.filter(status=InterviewSession.Status.COMPLETED).annotate(done=Coalesce("ended_at", "created_at")).order_by("-done", "-id")[:limit]:
        score = getattr(s, "score", None)
        points = f" with a score of {stats.r1(score.overall_score):g}" if score and score.overall_score is not None else ""
        yield _event("interview", "completed", s.done, f"{display_name(s.candidate.first_name, s.candidate.last_name, s.candidate.email)} finished {label(s)}{points}", _user_ref(s.candidate), {"session_id": s.id, "overall": stats.r1(score.overall_score) if score else None})
    for s in base.filter(status=InterviewSession.Status.CANCELLED).annotate(done=Coalesce("ended_at", "created_at")).order_by("-done", "-id")[:limit]:
        yield _event("interview", "cancelled", s.done, f"{display_name(s.candidate.first_name, s.candidate.last_name, s.candidate.email)} cancelled {label(s)}", _user_ref(s.candidate), {"session_id": s.id})


def _resume_events(limit):
    for resume in Resume.objects.select_related("user").order_by("-uploaded_at", "-id")[:limit]:
        who = display_name(resume.user.first_name, resume.user.last_name, resume.user.email)
        yield _event("resume", "uploaded", resume.uploaded_at, f"{who} uploaded a resume", _user_ref(resume.user), {"parse_source": resume.parse_source})


def _template_events(limit):
    for template in InterviewTemplate.objects.select_related("created_by").order_by("-created_at", "-id")[:limit]:
        who = display_name(template.created_by.first_name, template.created_by.last_name, template.created_by.email)
        state = "published" if template.is_published else "saved as a draft"
        yield _event("template", "created", template.created_at, f"{who} created the template “{template.title}” ({state})", _user_ref(template.created_by), {"template_id": template.id})


def _admin_summary(entry):
    who = entry.actor_email or "An admin"
    details = entry.details or {}
    if entry.action == "user.role_changed":
        return f"{who} changed the role of {entry.target} from {details.get('from')} to {details.get('to')}"
    if entry.action == "user.deactivated":
        return f"{who} deactivated {entry.target}"
    if entry.action == "user.activated":
        return f"{who} reactivated {entry.target}"
    if entry.action == "settings.ai_updated":
        return f"{who} changed the AI settings ({', '.join(sorted(details)) or 'no fields'})"
    if entry.action == "settings.ai_tested":
        return f"{who} tested the AI connection ({'it worked' if details.get('ok') else 'it did not work'})"
    return f"{who}: {entry.action}"


def _admin_events(limit):
    for entry in AuditLog.objects.select_related("actor").order_by("-created_at", "-id")[:limit]:
        yield _event("admin", entry.action, entry.created_at, _admin_summary(entry), _user_ref(entry.actor) or ({"id": None, "name": entry.actor_email, "email": entry.actor_email} if entry.actor_email else None), entry.details)


SOURCES = {"signup": _signups, "interview": _interview_events, "resume": _resume_events, "template": _template_events, "admin": _admin_events}


def activity(kind=None, limit=FEED_DEFAULT):
    """The latest things that happened, newest first. Each source gives its newest `limit`, so the merged list is exact."""
    events = []
    for name, source in SOURCES.items():
        if kind in (None, name):
            events.extend(source(limit))
    events.sort(key=lambda event: event["at"], reverse=True)
    return {"kind": kind, "limit": limit, "results": events[:limit]}


# --- AI usage -------------------------------------------------------------------

def _ai_window(since):
    row = AICall.objects.filter(created_at__gte=since).aggregate(
        calls=Count("id"), successes=Count("id", filter=Q(ok=True)), latency=Avg("latency_ms", filter=Q(ok=True)),
        backup=Count("id", filter=Q(used_fallback=True)),
    )
    return {
        "calls": row["calls"], "successes": row["successes"], "failures": row["calls"] - row["successes"],
        "success_rate": _rate(row["successes"], row["calls"]),
        "average_latency_ms": round(row["latency"]) if row["latency"] is not None else None,
        "used_backup_model": row["backup"],
    }


def ai_usage(now=None):
    now = now or timezone.now()
    week = now - timedelta(days=7)
    recent = AICall.objects.filter(created_at__gte=week)
    grouped = lambda field: recent.values(field).annotate(  # noqa: E731
        calls=Count("id"), failures=Count("id", filter=Q(ok=False)), latency=Avg("latency_ms", filter=Q(ok=True)),
    ).order_by("-calls", field)
    row = lambda r, field: {  # noqa: E731
        "name": r[field] or "unknown", "calls": r["calls"], "failures": r["failures"],
        "average_latency_ms": round(r["latency"]) if r["latency"] is not None else None,
    }

    today = timezone.localtime(now).date()
    days = [today - timedelta(days=AI_DAYS - 1 - i) for i in range(AI_DAYS)]
    calls, failures = defaultdict(int), defaultdict(int)
    for moment, ok in AICall.objects.filter(created_at__gte=now - timedelta(days=AI_DAYS + 1)).values_list("created_at", "ok"):
        day = timezone.localtime(moment).date()
        calls[day] += 1
        failures[day] += not ok

    config = store.ai_config()
    return {
        "generated_at": now.isoformat(),
        "config": {"enabled": config["enabled"], "key_configured": store.describe_ai()["key_configured"], "model": config["model"], "fallback_model": config["fallback_model"]},
        "windows": {"last_24_hours": _ai_window(now - timedelta(hours=24)), "last_7_days": _ai_window(week), "last_30_days": _ai_window(now - timedelta(days=30))},
        "by_purpose": [row(r, "purpose") for r in grouped("purpose")],
        "by_model": [row(r, "model") for r in grouped("model")],
        "errors": [{"kind": r["error_kind"] or "other", "count": r["n"]} for r in recent.filter(ok=False).values("error_kind").annotate(n=Count("id")).order_by("-n", "error_kind")],
        "daily": [{"date": day.isoformat(), "calls": calls[day], "failures": failures[day]} for day in days],
        "recent_failures": [
            {"at": c.created_at.isoformat(), "purpose": c.purpose or "unknown", "model": c.model, "error_kind": c.error_kind or "other", "attempts": c.attempts}
            for c in AICall.objects.filter(ok=False)[:RECENT_FAILURES]
        ],
        # How much of the written output really came from the AI and how much from the rule-based fallback
        "coverage": {
            "feedback": {source: Feedback.objects.filter(source=source).count() for source, _ in Feedback.Source.choices},
            "resumes": {"ai": Resume.objects.filter(parse_source="ai").count(), "basic": Resume.objects.filter(parse_source="basic").count()},
        },
    }
