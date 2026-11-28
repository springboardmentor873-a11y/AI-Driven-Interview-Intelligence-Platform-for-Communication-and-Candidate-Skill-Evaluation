from django.urls import path

from . import views

urlpatterns = [
    path("analytics/candidate/", views.CandidateAnalyticsView.as_view(), name="candidate-analytics"),
    path("analytics/recruiter/", views.RecruiterOverviewView.as_view(), name="recruiter-overview"),
    path("analytics/recruiter/candidates/", views.RecruiterCandidatesView.as_view(), name="recruiter-candidates"),
    path("analytics/recruiter/candidates/<int:candidate_id>/", views.RecruiterCandidateReportView.as_view(), name="recruiter-candidate-report"),
    path("analytics/recruiter/compare/", views.RecruiterCompareView.as_view(), name="recruiter-compare"),
    path("analytics/recruiter/sessions/", views.RecruiterSessionsView.as_view(), name="recruiter-sessions"),
]
