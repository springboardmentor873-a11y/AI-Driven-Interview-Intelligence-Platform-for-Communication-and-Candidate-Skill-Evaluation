from django.urls import path

from .views import GenerateQuestionsView

urlpatterns = [
    path("interviews/generate-questions/", GenerateQuestionsView.as_view(), name="generate-questions"),
]
