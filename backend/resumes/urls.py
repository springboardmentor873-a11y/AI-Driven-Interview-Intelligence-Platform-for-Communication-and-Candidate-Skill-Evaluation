from django.urls import path
from .views import ResumeListCreateView, ResumeDetailDestroyView

urlpatterns = [
    path('', ResumeListCreateView.as_view(), name='resume-list-create'),
    path('<int:pk>/', ResumeDetailDestroyView.as_view(), name='resume-detail-destroy'),
]
