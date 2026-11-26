from django.urls import path
from .views import (
    InterviewSessionListCreateView,
    InterviewSessionDetailView,
    SubmitQuestionAnswerView,
    CompleteSessionView,
)

urlpatterns = [
    path('sessions/', InterviewSessionListCreateView.as_view(), name='session-list-create'),
    path('sessions/<int:pk>/', InterviewSessionDetailView.as_view(), name='session-detail'),
    path('sessions/<int:session_pk>/questions/<int:question_pk>/answer/', SubmitQuestionAnswerView.as_view(), name='question-answer'),
    path('sessions/<int:pk>/complete/', CompleteSessionView.as_view(), name='session-complete'),
]
