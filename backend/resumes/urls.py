from django.urls import path
from .views import ResumeListCreateView, ResumeDetailDestroyView, ResumeParseView

urlpatterns = [
    path('', ResumeListCreateView.as_view(), name='resume-list-create'),
    path('<int:pk>/', ResumeDetailDestroyView.as_view(), name='resume-detail-destroy'),
    path('<int:pk>/parse/', ResumeParseView.as_view(), name='resume-parse'),
]
