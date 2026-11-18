from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCandidate

from .question_gen import generate_questions
from .serializers import GenerateQuestionsSerializer


class GenerateQuestionsView(APIView):
    """Preview a question set for a resume. Nothing is saved: session creation
    (Day 5) reuses the same service."""

    permission_classes = [IsCandidate]

    def post(self, request):
        serializer = GenerateQuestionsSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        questions, source = generate_questions(
            data["resume"], data["interview_type"], data["difficulty"],
            data["domain"], data["question_count"],
        )
        return Response({
            "source": source,
            "resume_id": data["resume"].id if data["resume"] else None,
            "interview_type": data["interview_type"],
            "difficulty": data["difficulty"],
            "domain": data["domain"],
            "questions": questions,
        })
