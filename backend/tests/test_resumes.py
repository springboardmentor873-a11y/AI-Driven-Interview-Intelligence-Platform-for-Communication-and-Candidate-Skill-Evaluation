import os

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.resumes.models import Resume

URL = "/api/resumes/"
PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"


@pytest.fixture(autouse=True)
def temp_media(settings, tmp_path):
    # Uploaded test files go to a temp folder, not backend/media
    settings.MEDIA_ROOT = tmp_path


def pdf(name="cv.pdf", content=PDF_BYTES):
    return SimpleUploadedFile(name, content, content_type="application/pdf")


def upload(client, f):
    return client.post(URL, {"file": f}, format="multipart")


def test_first_resume_is_primary(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    res = upload(client, pdf())
    assert res.status_code == 201
    assert res.data["is_primary"] is True


def test_set_primary_switches(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    first = upload(client, pdf("one.pdf")).data
    second = upload(client, pdf("two.pdf")).data
    assert second["is_primary"] is False

    res = client.post(f"{URL}{second['id']}/set-primary/")
    assert res.status_code == 200
    assert Resume.objects.get(id=first["id"]).is_primary is False
    assert Resume.objects.get(id=second["id"]).is_primary is True


def test_rejects_wrong_extension(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    res = upload(client, SimpleUploadedFile("cv.docx", PDF_BYTES))
    assert res.status_code == 400
    assert "file" in res.data


def test_rejects_fake_pdf(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    res = upload(client, pdf("fake.pdf", b"this is just text"))
    assert res.status_code == 400
    assert "file" in res.data


def test_rejects_large_file(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    big = b"%PDF-" + b"0" * (5 * 1024 * 1024 + 1)
    res = upload(client, pdf("big.pdf", big))
    assert res.status_code == 400


def test_limit_of_five_resumes(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    for i in range(5):
        assert upload(client, pdf(f"cv{i}.pdf")).status_code == 201
    assert upload(client, pdf("cv6.pdf")).status_code == 400


def test_users_only_see_their_own_resumes(auth_client, make_user):
    owner = auth_client(make_user("a@example.com"))
    other = auth_client(make_user("b@example.com"))
    resume_id = upload(owner, pdf()).data["id"]

    assert other.get(URL).data == []
    assert other.get(f"{URL}{resume_id}/download/").status_code == 404
    assert other.delete(f"{URL}{resume_id}/").status_code == 404
    assert Resume.objects.filter(id=resume_id).exists()


def test_download_returns_pdf(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    resume_id = upload(client, pdf()).data["id"]
    res = client.get(f"{URL}{resume_id}/download/")
    assert res.status_code == 200
    assert b"".join(res.streaming_content).startswith(b"%PDF-")


def test_delete_removes_file_and_promotes_another(auth_client, make_user):
    client = auth_client(make_user("a@example.com"))
    first = upload(client, pdf("one.pdf")).data
    second = upload(client, pdf("two.pdf")).data

    path = Resume.objects.get(id=first["id"]).file.path
    assert os.path.exists(path)

    assert client.delete(f"{URL}{first['id']}/").status_code == 204
    assert not os.path.exists(path)
    assert Resume.objects.get(id=second["id"]).is_primary is True


def test_recruiter_cannot_use_resumes(auth_client, make_user):
    client = auth_client(make_user("r@example.com", role="recruiter"))
    assert client.get(URL).status_code == 403


def test_resumes_require_login(api):
    assert api.get(URL).status_code == 401