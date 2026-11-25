from rest_framework import generics

from accounts.permissions import IsCandidate
from .models import Resume
from .serializers import ResumeSerializer


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
