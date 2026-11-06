from django.urls import path

from .views import (
    AnswerCreateView,
    InterviewDetailView,
    InterviewListCreateView,
    QuestionListCreateView,
)


urlpatterns = [
    path(
        "",
        InterviewListCreateView.as_view(),
        name="interview-list-create",
    ),
    path(
        "<int:pk>/",
        InterviewDetailView.as_view(),
        name="interview-detail",
    ),
    path(
        "<int:pk>/questions/",
        QuestionListCreateView.as_view(),
        name="question-list-create",
    ),
    path(
        "questions/<int:pk>/answer/",
        AnswerCreateView.as_view(),
        name="answer-create",
    ),
]