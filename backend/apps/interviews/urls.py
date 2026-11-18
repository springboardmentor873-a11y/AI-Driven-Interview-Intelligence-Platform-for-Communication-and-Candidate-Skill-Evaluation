from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import GenerateQuestionsView, SessionViewSet

router = SimpleRouter()
router.register("interviews/sessions", SessionViewSet, basename="interview-session")

urlpatterns = [
    path("interviews/generate-questions/", GenerateQuestionsView.as_view(), name="generate-questions"),
    *router.urls,
]
