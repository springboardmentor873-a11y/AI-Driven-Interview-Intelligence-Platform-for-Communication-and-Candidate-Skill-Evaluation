from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import IsPlatformAdmin
from .serializers import (
    AdminUserSerializer,
    RecruiterCreateSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DashboardView(APIView):
    """Role-scoped numbers."""

    def get(self, request):
        from interviews.models import Assessment, InterviewSession

        user = request.user
        if user.role == 'candidate':
            return Response({
                'role': 'candidate',
                'resumes': user.resumes.count(),
                'interviews': user.interview_sessions.count(),
                'assessments': Assessment.objects.filter(session__candidate=user).count(),
            })
        return Response({
            'role': user.role,
            'candidates': User.objects.filter(role='candidate').count(),
            'recruiters': User.objects.filter(role='recruiter').count(),
            'interviews': InterviewSession.objects.count(),
            'assessments': Assessment.objects.count(),
        })


class AdminUserListView(generics.ListAPIView):
    """Admin only: every account with username, email and role."""
    serializer_class = AdminUserSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        if role in ('candidate', 'recruiter', 'admin'):
            qs = qs.filter(role=role)
        return qs


class AdminCreateRecruiterView(generics.CreateAPIView):
    """Admin only: the only way a recruiter account is created."""
    serializer_class = RecruiterCreateSerializer
    permission_classes = [IsPlatformAdmin]