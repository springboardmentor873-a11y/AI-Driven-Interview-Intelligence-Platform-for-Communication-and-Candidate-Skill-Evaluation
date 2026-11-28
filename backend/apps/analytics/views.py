from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsCandidate, IsRecruiter
from apps.interviews.models import InterviewSession, InterviewType

from . import admin_stats, recruiter, services


def _interview_type(request):
    """The optional ?type= filter, checked."""
    value = request.query_params.get("type") or None
    if value and value not in InterviewType.values:
        raise ValidationError({"type": "Choose hr, technical, behavioral or aptitude."})
    return value


def _number(request, name, default, low, high):
    """An optional whole-number query parameter between low and high."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return default
    try:
        value = int(raw)
    except ValueError:
        value = None
    if value is None or not low <= value <= high:
        raise ValidationError({name: f"Use a whole number from {low} to {high}."})
    return value


def _page(request):
    return _number(request, "limit", recruiter.DEFAULT_LIMIT, 1, recruiter.MAX_LIMIT), _number(request, "offset", 0, 0, 1_000_000)


class CandidateAnalyticsView(APIView):
    """The signed-in candidate's performance analytics. Optional ?type=hr|technical|behavioral|aptitude."""

    permission_classes = [IsCandidate]

    def get(self, request):
        return Response(services.candidate_analytics(request.user, _interview_type(request)))


class RecruiterOverviewView(APIView):
    """Totals for the interviews taken on the signed-in recruiter's templates."""

    permission_classes = [IsRecruiter]

    def get(self, request):
        return Response(recruiter.overview(request.user))


class RecruiterCandidatesView(APIView):
    """The recruiter's candidates with their scores. ?q= search, ?type=, ?sort=average|latest|interviews|name, ?order=asc|desc, ?limit=, ?offset=."""

    permission_classes = [IsRecruiter]

    def get(self, request):
        sort = request.query_params.get("sort") or "average"
        if sort not in recruiter.SORTS:
            raise ValidationError({"sort": f"Choose one of: {', '.join(recruiter.SORTS)}."})
        order = request.query_params.get("order") or None
        if order not in (None, "asc", "desc"):
            raise ValidationError({"order": "Choose asc or desc."})
        limit, offset = _page(request)
        return Response(recruiter.candidate_rows(
            request.user, interview_type=_interview_type(request), search=(request.query_params.get("q") or "").strip()[:100],
            sort=sort, order=order, limit=limit, offset=offset,
        ))


class RecruiterCandidateReportView(APIView):
    """One candidate, limited to interviews on the recruiter's templates. Optional ?type=."""

    permission_classes = [IsRecruiter]

    def get(self, request, candidate_id):
        return Response(recruiter.candidate_report(request.user, candidate_id, _interview_type(request)))


class RecruiterCompareView(APIView):
    """?candidates=1,2,3 (2 to 4 ids) side by side. Optional ?type=."""

    permission_classes = [IsRecruiter]

    def get(self, request):
        raw = request.query_params.get("candidates", "")
        try:
            ids = [int(part) for part in raw.split(",") if part.strip()]
        except ValueError:
            ids = []
        valid = recruiter.COMPARE_MIN <= len(ids) <= recruiter.COMPARE_MAX and len(set(ids)) == len(ids)
        if not valid:
            raise ValidationError({"candidates": f"Give {recruiter.COMPARE_MIN} to {recruiter.COMPARE_MAX} different candidate ids, like ?candidates=3,7."})
        return Response(recruiter.compare(request.user, ids, _interview_type(request)))


class RecruiterSessionsView(APIView):
    """Sessions on the recruiter's templates. ?status=scheduled|in_progress|completed|cancelled, ?q=, ?limit=, ?offset=."""

    permission_classes = [IsRecruiter]

    def get(self, request):
        status = request.query_params.get("status") or None
        if status and status not in InterviewSession.Status.values:
            raise ValidationError({"status": f"Choose one of: {', '.join(InterviewSession.Status.values)}."})
        limit, offset = _page(request)
        return Response(recruiter.monitor_sessions(
            request.user, status=status, limit=limit, offset=offset, search=(request.query_params.get("q") or "").strip()[:100],
        ))


class AdminOverviewView(APIView):
    """Platform-wide numbers: users, interviews, content, the busiest recruiters and templates, and a small AI summary."""

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(admin_stats.overview())


class AdminActivityView(APIView):
    """The latest activity on the platform, newest first. ?kind=signup|interview|resume|template|admin, ?limit= (1 to 100, default 30)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        kind = request.query_params.get("kind") or None
        if kind and kind not in admin_stats.FEED_KINDS:
            raise ValidationError({"kind": f"Choose one of: {', '.join(admin_stats.FEED_KINDS)}."})
        limit = _number(request, "limit", admin_stats.FEED_DEFAULT, 1, admin_stats.FEED_MAX)
        return Response(admin_stats.activity(kind, limit))


class AdminAIUsageView(APIView):
    """How the AI service is doing, from the calls the server logged."""

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(admin_stats.ai_usage())
