# from django.shortcuts import render

# Create your views here.
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DashboardView(APIView):
    """Role-scoped numbers. Real analytics come in Milestone 4."""
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
        # recruiter / admin (candidate scoping for recruiters is a later task)
        return Response({
            'role': user.role,
            'candidates': User.objects.filter(role='candidate').count(),
            'interviews': InterviewSession.objects.count(),
            'assessments': Assessment.objects.count(),
        })