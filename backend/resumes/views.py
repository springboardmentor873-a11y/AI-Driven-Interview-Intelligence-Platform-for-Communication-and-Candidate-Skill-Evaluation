import os
from rest_framework import generics, serializers, status, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from pypdf import PdfReader
from users.permissions import IsCandidate
from services.ai_service import extract_resume_intelligence
from .models import Resume, validate_pdf_file


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = [
            'id',
            'file',
            'file_name',
            'file_size',
            'text',
            'summary',
            'skills',
            'experience',
            'education',
            'technologies',
            'recommended_roles',
            'parsing_status',
            'uploaded_at'
        ]
        read_only_fields = [
            'file_name',
            'file_size',
            'text',
            'summary',
            'skills',
            'experience',
            'education',
            'technologies',
            'recommended_roles',
            'parsing_status',
            'uploaded_at'
        ]

    def validate_file(self, value):
        validate_pdf_file(value)
        return value


class ResumeListCreateView(generics.ListCreateAPIView):
    serializer_class = ResumeSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user).order_by('-uploaded_at')

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        file_name = uploaded_file.name if uploaded_file else ''
        file_size = uploaded_file.size if uploaded_file else 0

        r = serializer.save(
            user=self.request.user,
            file_name=file_name,
            file_size=file_size
        )
        try:
            reader = PdfReader(r.file.path)
            text = ''.join((p.extract_text() or '') for p in reader.pages)
        except Exception:
            text = ''
        r.text = text

        # Automatically extract intelligence if text exists
        if text.strip():
            try:
                parsed = extract_resume_intelligence(text)
                r.summary = parsed.get('summary', '')
                r.skills = parsed.get('skills', {})
                r.experience = parsed.get('experience', [])
                r.education = parsed.get('education', [])
                r.technologies = parsed.get('technologies', [])
                r.recommended_roles = parsed.get('recommended_roles', [])
                r.parsing_status = 'completed'
            except Exception:
                r.parsing_status = 'failed'
        r.save()


class ResumeDetailDestroyView(generics.RetrieveDestroyAPIView):
    serializer_class = ResumeSerializer
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.file and os.path.exists(instance.file.path):
            try:
                os.remove(instance.file.path)
            except Exception:
                pass
        instance.delete()


class ResumeParseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def post(self, request, pk):
        try:
            resume = Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return Response({"detail": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)

        if not resume.text.strip():
            # Try re-extracting text if missing
            try:
                reader = PdfReader(resume.file.path)
                resume.text = ''.join((p.extract_text() or '') for p in reader.pages)
            except Exception:
                pass

        if not resume.text.strip():
            return Response(
                {"error": "No text could be extracted from this PDF resume."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            parsed = extract_resume_intelligence(resume.text)
            resume.summary = parsed.get('summary', '')
            resume.skills = parsed.get('skills', {})
            resume.experience = parsed.get('experience', [])
            resume.education = parsed.get('education', [])
            resume.technologies = parsed.get('technologies', [])
            resume.recommended_roles = parsed.get('recommended_roles', [])
            resume.parsing_status = 'completed'
            resume.save()
            return Response(ResumeSerializer(resume).data, status=status.HTTP_200_OK)
        except Exception as e:
            resume.parsing_status = 'failed'
            resume.save()
            return Response(
                {"error": f"AI Parsing failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
