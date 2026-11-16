from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class CandidateInterviewAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.candidate = User.objects.create_user(
            username="candidate",
            email="candidate@example.com",
            password="StrongPass123!",
            role=User.Role.CANDIDATE,
        )
        self.recruiter = User.objects.create_user(
            username="recruiter",
            email="recruiter@example.com",
            password="StrongPass123!",
            role=User.Role.RECRUITER,
        )
        self.other_candidate = User.objects.create_user(
            username="other-candidate",
            email="other@example.com",
            password="StrongPass123!",
            role=User.Role.CANDIDATE,
        )

    def test_only_candidates_can_create_interviews(self):
        self.client.force_authenticate(self.candidate)
        candidate_response = self.client.post(
            "/api/interviews/",
            {"interview_type": "TECHNICAL"},
            format="json",
        )

        self.assertEqual(candidate_response.status_code, 201)
        self.assertEqual(
            candidate_response.data["candidate"],
            self.candidate.pk,
        )

        self.client.force_authenticate(self.recruiter)
        recruiter_response = self.client.post(
            "/api/interviews/",
            {"interview_type": "TECHNICAL"},
            format="json",
        )

        self.assertEqual(recruiter_response.status_code, 403)

    def test_candidate_cannot_read_another_candidates_interview(self):
        self.client.force_authenticate(self.candidate)
        create_response = self.client.post(
            "/api/interviews/",
            {"interview_type": "TECHNICAL"},
            format="json",
        )
        interview_id = create_response.data["id"]

        self.client.force_authenticate(self.other_candidate)
        response = self.client.get(f"/api/interviews/{interview_id}/")

        self.assertEqual(response.status_code, 404)
