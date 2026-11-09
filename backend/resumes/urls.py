from django.urls import path
from .views import ResumeListCreate

urlpatterns = [
    path('', ResumeListCreate.as_view(), name='resume-list-create'),
]
