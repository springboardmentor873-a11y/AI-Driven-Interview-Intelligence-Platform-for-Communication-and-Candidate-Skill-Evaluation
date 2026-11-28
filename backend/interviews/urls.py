from django.urls import path

from .views import (
    InterviewAnswerView,
    InterviewCompleteView,
    InterviewDetailView,
    InterviewListCreateView,
    InterviewStartView,
    QuestionSkipView,
    QuestionStartView,
)

urlpatterns = [
    path('interviews/', InterviewListCreateView.as_view()),
    path('interviews/<int:pk>/', InterviewDetailView.as_view()),
    path('interviews/<int:pk>/start/', InterviewStartView.as_view()),
    path('interviews/<int:pk>/answers/', InterviewAnswerView.as_view()),
    path('interviews/<int:pk>/complete/', InterviewCompleteView.as_view()),
    path('interviews/<int:pk>/questions/<int:qid>/start/', QuestionStartView.as_view()),
    path('interviews/<int:pk>/questions/<int:qid>/skip/', QuestionSkipView.as_view()),
]
