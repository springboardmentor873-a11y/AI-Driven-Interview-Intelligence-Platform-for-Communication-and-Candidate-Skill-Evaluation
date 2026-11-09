from rest_framework import generics, serializers
from rest_framework.parsers import MultiPartParser, FormParser
from pypdf import PdfReader
from .models import Resume


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ['id', 'file', 'text', 'skills', 'uploaded_at']
        read_only_fields = ['text', 'skills', 'uploaded_at']


class ResumeListCreate(generics.ListCreateAPIView):
    serializer_class = ResumeSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user).order_by('-uploaded_at')

    def perform_create(self, serializer):
        r = serializer.save(user=self.request.user)
        try:
            reader = PdfReader(r.file.path)
            text = ''.join((p.extract_text() or '') for p in reader.pages)
        except Exception:
            text = ''
        r.text = text
        r.save()
