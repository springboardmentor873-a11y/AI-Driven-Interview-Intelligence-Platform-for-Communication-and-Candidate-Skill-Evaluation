import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from .pdf_helper import make_pdf

URL = "/api/interviews/generate-questions/"


@pytest.fixture(autouse=True)
def setup(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.GEMINI_API_KEY = ""


def upload(client, text="Python Django React"):
    f = SimpleUploadedFile("cv.pdf", make_pdf(text), content_type="application/pdf")
    return client.post("/api/resumes/", {"file": f}, format="multipart").data["id"]


def test_generates_from_primary_resume(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    rid = upload(client)
    res = client.post(URL, {"interview_type": "technical", "difficulty": "easy", "question_count": 5}, format="json")
    assert res.status_code == 200
    assert res.data["resume_id"] == rid and res.data["source"] == "basic"
    assert len(res.data["questions"]) == 5
    assert {"text", "category", "time_limit_seconds"} <= set(res.data["questions"][0])


def test_works_without_a_resume(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    res = client.post(URL, {"interview_type": "aptitude"}, format="json")
    assert res.status_code == 200 and res.data["resume_id"] is None
    assert len(res.data["questions"]) == 10 and res.data["difficulty"] == "medium"


def test_other_users_resume_is_rejected(auth_client, make_user):
    rid = upload(auth_client(make_user("a@example.com")))
    other = auth_client(make_user("b@example.com"))
    res = other.post(URL, {"interview_type": "hr", "resume_id": rid}, format="json")
    assert res.status_code == 400 and "resume_id" in res.data


@pytest.mark.parametrize("body", [
    {}, {"interview_type": "nope"}, {"interview_type": "hr", "difficulty": "insane"},
    {"interview_type": "hr", "question_count": 0}, {"interview_type": "hr", "question_count": 21},
    {"interview_type": "hr", "domain": "x" * 101},
])
def test_invalid_input_is_rejected(auth_client, make_user, body):
    client = auth_client(make_user("a@example.com"))
    assert client.post(URL, body, format="json").status_code == 400


def test_only_candidates_can_generate(auth_client, make_user, api):
    recruiter = auth_client(make_user("r@example.com", role="recruiter"))
    assert recruiter.post(URL, {"interview_type": "hr"}, format="json").status_code == 403
    assert api.post(URL, {"interview_type": "hr"}, format="json").status_code == 401
