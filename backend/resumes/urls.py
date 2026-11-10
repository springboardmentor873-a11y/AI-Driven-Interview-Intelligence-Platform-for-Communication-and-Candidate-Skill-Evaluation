from django.urls import path

from .views import ResumeListCreateView

urlpatterns = [
    path('resumes/', ResumeListCreateView.as_view()),
]