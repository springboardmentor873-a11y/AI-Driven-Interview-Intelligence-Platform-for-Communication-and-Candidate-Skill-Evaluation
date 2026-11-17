import os
import tempfile
import uuid
from io import BytesIO

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["GOOGLE_CLIENT_ID"] = ""
os.environ["GOOGLE_CLIENT_SECRET"] = ""

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def make_pdf() -> bytes:
    w = PdfWriter()
    w.add_blank_page(width=200, height=200)
    buf = BytesIO()
    w.write(buf)
    return buf.getvalue()


@pytest.fixture
def pdf_bytes():
    return make_pdf()


def _register(client, role="candidate", password="password123"):
    email = f"{role}-{uuid.uuid4().hex[:8]}@test.com"
    r = client.post("/api/auth/register", json={"full_name": "Test User", "email": email,
                                                 "password": password, "role": role})
    assert r.status_code == 201, r.text
    d = r.json()
    return {"email": email, "password": password, "id": d["user"]["id"], "tokens": d,
            "h": {"Authorization": f"Bearer {d['access_token']}"}}


@pytest.fixture
def candidate(client):
    return _register(client, "candidate")


@pytest.fixture
def candidate2(client):
    return _register(client, "candidate")


@pytest.fixture
def recruiter(client):
    return _register(client, "recruiter")


@pytest.fixture(scope="session")
def admin(client):
    r = client.post("/api/auth/login", json={"email": "admin@smarthire.ai", "password": "Admin@12345"})
    assert r.status_code == 200
    return {"h": {"Authorization": f"Bearer {r.json()['access_token']}"}}
