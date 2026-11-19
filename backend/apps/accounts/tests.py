from io import BytesIO
import tempfile
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.storage import default_storage
from django.test import TestCase, override_settings
from pypdf import PdfWriter
from rest_framework.test import APIClient

from apps.ai_services import AIResult
from .services import ResumeParseError, extract_resume_text

User = get_user_model()


class AccountAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registration_creates_candidate_with_hashed_password(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "new-candidate",
                "email": "candidate@example.com",
                "password": "StrongPass123!",
                "role": User.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username="new-candidate")
        self.assertEqual(user.role, User.Role.CANDIDATE)
        self.assertTrue(user.check_password("StrongPass123!"))
        self.assertNotIn("role", response.data)

    def test_login_returns_jwt_and_profile_requires_that_token(self):
        User.objects.create_user(
            username="candidate",
            email="candidate@example.com",
            password="StrongPass123!",
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "candidate",
                "password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertIn("access", login_response.data)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        profile_response = self.client.get("/api/auth/profile/")

        self.assertEqual(profile_response.status_code, 200)
        self.assertEqual(profile_response.data["role"], User.Role.CANDIDATE)

    def test_profile_rejects_anonymous_requests(self):
        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.status_code, 401)


class ResumeApiTests(TestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        settings_override = override_settings(
            MEDIA_ROOT=self.media_directory.name
        )
        settings_override.enable()
        self.addCleanup(settings_override.disable)

        self.client = APIClient()
        self.candidate = User.objects.create_user(
            username="candidate",
            email="candidate@example.com",
            password="StrongPass123!",
            role=User.Role.CANDIDATE,
        )
        self.other_candidate = User.objects.create_user(
            username="other-candidate",
            email="other@example.com",
            password="StrongPass123!",
            role=User.Role.CANDIDATE,
        )

    def _pdf_upload(self, name="resume.pdf", content=b"%PDF-1.7\nresume"):
        return SimpleUploadedFile(
            name,
            content,
            content_type="application/pdf",
        )

    def test_candidate_can_upload_list_download_and_delete_resume(self):
        self.client.force_authenticate(self.candidate)
        upload_response = self.client.post(
            "/api/auth/resumes/",
            {"file": self._pdf_upload()},
            format="multipart",
        )

        self.assertEqual(upload_response.status_code, 201)
        resume_id = upload_response.data["id"]
        resume = self.candidate.resumes.get(pk=resume_id)
        stored_file = resume.file.name

        list_response = self.client.get("/api/auth/resumes/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

        download_response = self.client.get(
            f"/api/auth/resumes/{resume_id}/download/"
        )
        self.assertEqual(download_response.status_code, 200)
        self.assertIn("attachment", download_response["Content-Disposition"])
        self.assertEqual(
            b"".join(download_response.streaming_content),
            b"%PDF-1.7\nresume",
        )

        delete_response = self.client.delete(
            f"/api/auth/resumes/{resume_id}/"
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(default_storage.exists(stored_file))

    def test_candidate_can_extract_and_persist_resume_profile(self):
        self.client.force_authenticate(self.candidate)
        upload_response = self.client.post(
            "/api/auth/resumes/",
            {"file": self._pdf_upload()},
            format="multipart",
        )
        resume_id = upload_response.data["id"]

        with (
            patch(
                "apps.accounts.services.extract_resume_text",
                return_value="Python and Django experience",
            ),
            patch(
                "apps.accounts.services.extract_resume_profile_from_text",
                return_value=AIResult(
                    data={
                        "skills": ["Python", "Django"],
                        "qualifications": ["BSc Computer Science"],
                        "experience": [
                            {
                                "role": "Developer",
                                "organization": "",
                                "duration": "",
                                "highlights": ["Built APIs"],
                            }
                        ],
                        "projects": [
                            {
                                "name": "Interview app",
                                "technologies": ["Python"],
                                "description": "Built an interview app.",
                            }
                        ],
                    },
                    source="gemini",
                ),
            ),
        ):
            response = self.client.post(
                f"/api/auth/resumes/{resume_id}/extract-skills/",
                {"ai_consent": True},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["extracted_skills"], ["Python", "Django"])
        self.assertEqual(
            response.data["extracted_qualifications"],
            ["BSc Computer Science"],
        )
        self.assertEqual(response.data["extracted_projects"][0]["name"], "Interview app")
        self.assertEqual(response.data["extraction_source"], "gemini")
        self.assertIsNotNone(response.data["skills_extracted_at"])

    def test_resume_extraction_without_consent_uses_local_fallback(self):
        self.client.force_authenticate(self.candidate)
        upload_response = self.client.post(
            "/api/auth/resumes/",
            {"file": self._pdf_upload()},
            format="multipart",
        )
        resume_id = upload_response.data["id"]

        with (
            patch(
                "apps.accounts.services.extract_resume_text",
                return_value="Python and Django experience",
            ),
            patch("apps.ai_services.genai.Client") as gemini_client,
            override_settings(
                GEMINI_API_KEY="test-key",
                AI_DETERMINISTIC_FALLBACK=False,
            ),
        ):
            response = self.client.post(
                f"/api/auth/resumes/{resume_id}/extract-skills/",
                {"ai_consent": False},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["extracted_skills"], ["Python", "Django"])
        self.assertEqual(response.data["extraction_source"], "fallback")
        gemini_client.assert_not_called()

    def test_resume_parser_rejects_a_pdf_without_selectable_text(self):
        pdf_file = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        writer.write(pdf_file)
        pdf_file.seek(0)

        with self.assertRaisesMessage(
            ResumeParseError,
            "No selectable text was found",
        ):
            extract_resume_text(pdf_file)

    def test_resume_api_rejects_non_pdf_and_invalid_pdf_content(self):
        self.client.force_authenticate(self.candidate)

        wrong_extension = self.client.post(
            "/api/auth/resumes/",
            {"file": self._pdf_upload(name="resume.txt")},
            format="multipart",
        )
        invalid_content = self.client.post(
            "/api/auth/resumes/",
            {
                "file": self._pdf_upload(
                    content=b"not a pdf document"
                )
            },
            format="multipart",
        )
        oversized_file = self.client.post(
            "/api/auth/resumes/",
            {
                "file": self._pdf_upload(
                    content=b"%PDF-" + b"x" * (10 * 1024 * 1024)
                )
            },
            format="multipart",
        )

        self.assertEqual(wrong_extension.status_code, 400)
        self.assertEqual(invalid_content.status_code, 400)
        self.assertEqual(oversized_file.status_code, 400)
        self.assertEqual(self.candidate.resumes.count(), 0)

    def test_candidate_cannot_access_another_users_resume(self):
        self.client.force_authenticate(self.other_candidate)
        upload_response = self.client.post(
            "/api/auth/resumes/",
            {"file": self._pdf_upload()},
            format="multipart",
        )
        resume_id = upload_response.data["id"]

        self.client.force_authenticate(self.candidate)
        list_response = self.client.get("/api/auth/resumes/")
        detail_response = self.client.get(
            f"/api/auth/resumes/{resume_id}/"
        )
        download_response = self.client.get(
            f"/api/auth/resumes/{resume_id}/download/"
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data, [])
        self.assertEqual(detail_response.status_code, 404)
        self.assertEqual(download_response.status_code, 404)

    def test_non_candidate_cannot_manage_resumes(self):
        recruiter = User.objects.create_user(
            username="recruiter",
            email="recruiter@example.com",
            password="StrongPass123!",
            role=User.Role.RECRUITER,
        )
        self.client.force_authenticate(recruiter)

        response = self.client.post(
            "/api/auth/resumes/",
            {"file": self._pdf_upload()},
            format="multipart",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(recruiter.resumes.count(), 0)
