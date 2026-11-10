#from django.shortcuts import render

# Create your views here.
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