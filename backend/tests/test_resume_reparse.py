import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.ai import gemini
from apps.resumes.models import Resume

from .pdf_helper import make_pdf

URL = "/api/resumes/"


@pytest.fixture(autouse=True)
def temp_media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.GEMINI_API_KEY = ""


def upload(client, text="Python Django React", name="cv.pdf"):
    f = SimpleUploadedFile(name, make_pdf(text), content_type="application/pdf")
    return client.post(URL, {"file": f}, format="multipart")


def test_upload_reports_basic_source_without_key(auth_client, make_user):
    res = upload(auth_client(make_user("a@example.com")))
    assert res.data["parse_source"] == "basic"
    assert res.data["has_text"] is True


def test_unreadable_pdf_has_no_text_and_no_source(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    f = SimpleUploadedFile("cv.pdf", b"%PDF-1.4\nbroken", content_type="application/pdf")
    res = client.post(URL, {"file": f}, format="multipart")
    assert res.status_code == 201
    assert res.data["has_text"] is False and res.data["parse_source"] == ""


def test_reparse_upgrades_basic_result_to_ai(auth_client, make_user, monkeypatch, settings):
    client = auth_client(make_user("a@example.com"))
    rid = upload(client).data["id"]
    settings.GEMINI_API_KEY = "test-key"
    monkeypatch.setattr(gemini, "generate_json", lambda *a, **k: {
        "skills": ["Leadership"], "technologies": ["Go"], "experience": [],
        "education": [], "summary": "AI summary.",
    })
    res = client.post(f"{URL}{rid}/reparse/")
    assert res.status_code == 200
    assert res.data["parse_source"] == "ai"
    assert res.data["technologies"] == ["Go"] and res.data["summary"] == "AI summary."


def test_reparse_recovers_a_resume_that_was_never_parsed(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    rid = upload(client).data["id"]
    Resume.objects.filter(id=rid).update(extracted_text="", skills=[], technologies=[], parse_source="")
    res = client.post(f"{URL}{rid}/reparse/")
    assert res.status_code == 200
    assert "Python" in res.data["technologies"] and res.data["parse_source"] == "basic"


def test_cannot_reparse_someone_elses_resume(auth_client, make_user):
    rid = upload(auth_client(make_user("a@example.com"))).data["id"]
    other = auth_client(make_user("b@example.com"))
    assert other.post(f"{URL}{rid}/reparse/").status_code == 404


def test_recruiter_cannot_reparse(auth_client, make_user):
    rid = upload(auth_client(make_user("a@example.com"))).data["id"]
    recruiter = auth_client(make_user("r@example.com", role="recruiter"))
    assert recruiter.post(f"{URL}{rid}/reparse/").status_code == 403


def test_resume_deleted_during_reanalysis_gives_404_not_a_crash(auth_client, make_user, monkeypatch):
    client = auth_client(make_user("a@example.com"))
    rid = upload(client).data["id"]

    def analyse_then_vanish(text):
        Resume.objects.filter(id=rid).delete()  # the person deletes it while the AI call is running
        return {"skills": [], "technologies": [], "experience": [], "education": [], "summary": ""}, "basic"

    monkeypatch.setattr("apps.resumes.parsing.analyze", analyse_then_vanish)
    res = client.post(f"{URL}{rid}/reparse/")
    assert res.status_code == 404 and "no longer exists" in res.data["detail"]
