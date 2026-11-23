from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCandidate
from apps.interviews.models import InterviewType

from . import services


class CandidateAnalyticsView(APIView):
    """The signed-in candidate's performance analytics. Optional ?type=hr|technical|behavioral|aptitude."""

    permission_classes = [IsCandidate]

    def get(self, request):
        interview_type = request.query_params.get("type") or None
        if interview_type and interview_type not in InterviewType.values:
            raise ValidationError({"type": "Choose hr, technical, behavioral or aptitude."})
        return Response(services.candidate_analytics(request.user, interview_type))
