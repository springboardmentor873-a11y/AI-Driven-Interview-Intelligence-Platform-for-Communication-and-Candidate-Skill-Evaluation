from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCandidate
from analysis.ai_client import ai_enabled
from .models import Resume
from .serializers import ResumeSerializer
from .services import enrich_with_ai, parse_resume


class ResumeListCreateView(generics.ListCreateAPIView):
    serializer_class = ResumeSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        # only MY resumes - this line is the data-isolation rule
        return Resume.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        f = self.request.FILES['file']
        serializer.save(owner=self.request.user, original_name=f.name[:255])


class ResumeDetailView(generics.RetrieveDestroyAPIView):
    """Get or delete one resume. Someone else's resume gives 404."""
    serializer_class = ResumeSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return Resume.objects.filter(owner=self.request.user)

    def perform_destroy(self, instance):
        stored_file = instance.file
        instance.delete()                    # remove the database row first
        stored_file.delete(save=False)       # then remove the PDF from disk


class ResumeReanalyseView(APIView):
    """Re-run the AI reading on a resume that is already saved. Owner only."""
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        resume = get_object_or_404(Resume.objects.filter(owner=request.user), pk=pk)
        if not resume.extracted_text:
            return Response(
                {'detail': 'There is no saved text for this resume to re-analyse.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not ai_enabled():
            return Response(
                {'detail': 'AI reading is not turned on for this server. Ask an admin to set GEMINI_API_KEY and GEMINI_MODEL.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parsed = enrich_with_ai(resume.extracted_text, parse_resume(resume.extracted_text))
        if not parsed.get('ai_used'):
            return Response(
                {'detail': 'The AI could not read this resume right now. Please try again in a moment.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resume.parsed_data = parsed
        resume.save(update_fields=['parsed_data'])
        return Response(ResumeSerializer(resume).data)
