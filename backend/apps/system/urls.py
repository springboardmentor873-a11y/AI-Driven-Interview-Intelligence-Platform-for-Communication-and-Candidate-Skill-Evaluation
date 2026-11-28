from django.urls import path

from .views import AISettingsView, AITestView

urlpatterns = [
    path("settings/ai/", AISettingsView.as_view(), name="admin-ai-settings"),
    path("settings/ai/test/", AITestView.as_view(), name="admin-ai-test"),
]
