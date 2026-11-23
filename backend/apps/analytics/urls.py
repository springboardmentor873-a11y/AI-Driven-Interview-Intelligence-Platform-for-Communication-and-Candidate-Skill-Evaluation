from django.urls import path

from .views import CandidateAnalyticsView

urlpatterns = [
    path("analytics/candidate/", CandidateAnalyticsView.as_view(), name="candidate-analytics"),
]
