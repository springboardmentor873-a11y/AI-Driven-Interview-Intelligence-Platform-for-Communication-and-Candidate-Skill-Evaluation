from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Resume
from .permissions import IsCandidate
from .serializers import (
    RegisterSerializer,
    ResumeSerializer,
    UserProfileSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)

        return Response(serializer.data)


class ResumeListCreateView(generics.ListCreateAPIView):
    serializer_class = ResumeSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return Resume.objects.filter(owner=self.request.user).order_by(
            "-uploaded_at"
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ResumeDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ResumeSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return Resume.objects.filter(owner=self.request.user)


class ResumeDownloadView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request, pk):
        resume = get_object_or_404(
            Resume,
            pk=pk,
            owner=request.user,
        )
        return FileResponse(
            resume.file.open("rb"),
            as_attachment=True,
        )