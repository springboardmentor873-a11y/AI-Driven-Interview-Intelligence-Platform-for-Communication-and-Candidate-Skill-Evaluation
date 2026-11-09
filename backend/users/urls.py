from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView,
    MeView,
    LogoutView,
    CandidateDashboardView,
    RecruiterDashboardView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('candidate/dashboard/', CandidateDashboardView.as_view(), name='candidate_dashboard'),
    path('recruiter/dashboard/', RecruiterDashboardView.as_view(), name='recruiter_dashboard'),
]