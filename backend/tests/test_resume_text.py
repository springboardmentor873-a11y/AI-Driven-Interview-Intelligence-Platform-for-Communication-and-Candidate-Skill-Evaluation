import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.resumes.models import Resume
from apps.resumes.text_extract import extract_text

from .pdf_helper import make_pdf

URL = "/api/resumes/"


@pytest.fixture(autouse=True)
def temp_media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def test_extract_text_reads_pdf():
    assert "Python Django developer" in extract_text(io.BytesIO(make_pdf()))


def test_extract_text_never_raises_on_bad_pdf():
    assert extract_text(io.BytesIO(b"%PDF-1.4 broken")) == ""


def test_upload_stores_extracted_text(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    f = SimpleUploadedFile("cv.pdf", make_pdf("React and Node.js"), content_type="application/pdf")
    res = client.post(URL, {"file": f}, format="multipart")
    assert res.status_code == 201
    assert "React and Node.js" in Resume.objects.get(id=res.data["id"]).extracted_text


def test_unreadable_pdf_still_uploads(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    f = SimpleUploadedFile("cv.pdf", b"%PDF-1.4\nnot really a pdf", content_type="application/pdf")
    res = client.post(URL, {"file": f}, format="multipart")
    assert res.status_code == 201
    assert Resume.objects.get(id=res.data["id"]).extracted_text == ""
