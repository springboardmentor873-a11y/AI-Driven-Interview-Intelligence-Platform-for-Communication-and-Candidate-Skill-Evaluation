from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    ProfileView,
    RegisterView,
    ResumeDetailView,
    ResumeDownloadView,
    ResumeListCreateView,
    ResumeSkillsView,
)


urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
    path(
        "login/",
        TokenObtainPairView.as_view(),
        name="login",
    ),
    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),
    path(
        "profile/",
        ProfileView.as_view(),
        name="profile",
    ),
    path(
        "resumes/",
        ResumeListCreateView.as_view(),
        name="resume-list-create",
    ),
    path(
        "resumes/<int:pk>/download/",
        ResumeDownloadView.as_view(),
        name="resume-download",
    ),
    path(
        "resumes/<int:pk>/extract-skills/",
        ResumeSkillsView.as_view(),
        name="resume-extract-skills",
    ),
    path(
        "resumes/<int:pk>/",
        ResumeDetailView.as_view(),
        name="resume-detail",
    ),
]