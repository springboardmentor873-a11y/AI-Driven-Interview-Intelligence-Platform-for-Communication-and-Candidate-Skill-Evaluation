from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import RegisterSerializer, UserSerializer
from .permissions import IsCandidate, IsRecruiter, IsAdmin


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Logout successful."},
                status=status.HTTP_205_RESET_CONTENT
            )
        except TokenError:
            return Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_400_BAD_REQUEST
            )


class CandidateDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def get(self, request):
        return Response({
            "message": "Welcome to Candidate Dashboard!",
            "role": request.user.role
        })


class RecruiterDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsRecruiter]

    def get(self, request):
        return Response({
            "message": "Welcome to Recruiter Dashboard!",
            "role": request.user.role
        })
