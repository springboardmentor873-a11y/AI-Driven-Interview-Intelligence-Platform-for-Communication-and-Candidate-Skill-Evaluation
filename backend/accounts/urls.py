from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AdminCreateRecruiterView,
    AdminUserListView,
    DashboardView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/token/', TokenObtainPairView.as_view()),
    path('auth/token/refresh/', TokenRefreshView.as_view()),
    path('auth/me/', MeView.as_view()),
    path('dashboard/', DashboardView.as_view()),
    path('admin/users/', AdminUserListView.as_view()),
    path('admin/recruiters/', AdminCreateRecruiterView.as_view()),
]