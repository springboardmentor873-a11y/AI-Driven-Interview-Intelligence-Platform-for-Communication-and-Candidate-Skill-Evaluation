from django.conf import settings
from django.contrib.auth import get_user_model
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import generics, mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdmin
from .serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = EmailTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return ProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Password changed successfully."})


class AdminUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "patch", "head", "options"]

    def perform_update(self, serializer):
        target = self.get_object()
        data = serializer.validated_data
        if target == self.request.user:
            if data.get("role", target.role) != "admin" or data.get("is_active") is False:
                raise ValidationError(
                    "You cannot demote or deactivate your own account."
                )
        serializer.save()
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get("id_token")
        if not token:
            return Response({"detail": "id_token is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "Google login is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            info = google_id_token.verify_oauth2_token(
                token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_401_UNAUTHORIZED)

        if not info.get("email_verified"):
            return Response({"detail": "Google email is not verified."}, status=status.HTTP_400_BAD_REQUEST)

        email = info["email"].lower()
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=info.get("given_name", ""),
                last_name=info.get("family_name", ""),
            )
        elif not user.is_active:
            return Response({"detail": "This account is disabled."}, status=status.HTTP_403_FORBIDDEN)

        refresh = EmailTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)