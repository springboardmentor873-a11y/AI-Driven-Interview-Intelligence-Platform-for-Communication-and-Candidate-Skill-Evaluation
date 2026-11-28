from django.urls import path

from .views import ResumeDetailView, ResumeListCreateView, ResumeReanalyseView

urlpatterns = [
    path('resumes/', ResumeListCreateView.as_view()),
    path('resumes/<int:pk>/', ResumeDetailView.as_view()),
    path('resumes/<int:pk>/reanalyse/', ResumeReanalyseView.as_view()),
]
