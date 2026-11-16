import io
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from pypdf import PdfWriter
from users.models import User
from .models import Resume


def generate_sample_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    return SimpleUploadedFile(
        "test_resume.pdf",
        buf.read(),
        content_type="application/pdf"
    )


class ResumeWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cand_a = User.objects.create_user('cand_a', 'a@test.com', 'Pass1234', role='candidate')
        self.cand_b = User.objects.create_user('cand_b', 'b@test.com', 'Pass1234', role='candidate')
        self.recruiter = User.objects.create_user('rec_x', 'x@test.com', 'Pass1234', role='recruiter')

    def test_12_resume_upload_success(self):
        self.client.force_authenticate(user=self.cand_a)
        pdf_file = generate_sample_pdf()
        res = self.client.post('/api/resumes/', {'file': pdf_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', res.data)
        self.assertEqual(res.data['file_name'], 'test_resume.pdf')
        self.assertTrue(Resume.objects.filter(user=self.cand_a).exists())

    def test_12_resume_upload_invalid_type_rejected(self):
        self.client.force_authenticate(user=self.cand_a)
        txt_file = SimpleUploadedFile("resume.txt", b"plain text", content_type="text/plain")
        res = self.client.post('/api/resumes/', {'file': txt_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_12_recruiter_cannot_upload_resumes(self):
        self.client.force_authenticate(user=self.recruiter)
        pdf_file = generate_sample_pdf()
        res = self.client.post('/api/resumes/', {'file': pdf_file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_13_resume_listing(self):
        self.client.force_authenticate(user=self.cand_a)
        # Upload 2 resumes
        self.client.post('/api/resumes/', {'file': generate_sample_pdf()}, format='multipart')
        self.client.post('/api/resumes/', {'file': generate_sample_pdf()}, format='multipart')

        list_res = self.client.get('/api/resumes/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 2)

    def test_14_resume_ownership_restrictions(self):
        # Candidate A uploads a resume
        self.client.force_authenticate(user=self.cand_a)
        upload_res = self.client.post('/api/resumes/', {'file': generate_sample_pdf()}, format='multipart')
        resume_id = upload_res.data['id']

        # Candidate B authenticates
        self.client.force_authenticate(user=self.cand_b)

        # B's list should be empty
        list_res = self.client.get('/api/resumes/')
        self.assertEqual(len(list_res.data), 0)

        # B cannot retrieve A's resume
        detail_res = self.client.get(f'/api/resumes/{resume_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)

        # B cannot delete A's resume
        del_res = self.client.delete(f'/api/resumes/{resume_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_15_resume_deletion(self):
        self.client.force_authenticate(user=self.cand_a)
        upload_res = self.client.post('/api/resumes/', {'file': generate_sample_pdf()}, format='multipart')
        resume_id = upload_res.data['id']

        # Candidate A deletes their resume
        del_res = self.client.delete(f'/api/resumes/{resume_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Resume.objects.filter(id=resume_id).exists())
