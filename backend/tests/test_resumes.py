def _upload(client, user, pdf, name="resume.pdf"):
    return client.post("/api/resumes", headers=user["h"], files={"file": (name, pdf, "application/pdf")})


def test_upload_list_and_first_is_primary(client, candidate, pdf_bytes):
    r = _upload(client, candidate, pdf_bytes)
    assert r.status_code == 201
    body = r.json()
    assert body["is_active"] is True and body["page_count"] == 1
    assert len(client.get("/api/resumes", headers=candidate["h"]).json()) == 1


def test_rejects_non_pdf_and_oversize(client, candidate):
    assert _upload(client, candidate, b"hello world", "x.pdf").status_code == 400
    big = b"%PDF" + b"0" * (6 * 1024 * 1024)
    assert _upload(client, candidate, big).status_code == 413


def test_rejects_corrupt_pdf(client, candidate):
    assert _upload(client, candidate, b"%PDF-1.4 not really a pdf").status_code == 400


def test_set_primary_and_delete_promotes_next(client, candidate, pdf_bytes):
    a = _upload(client, candidate, pdf_bytes, "a.pdf").json()
    b = _upload(client, candidate, pdf_bytes, "b.pdf").json()
    assert b["is_active"] is False
    r = client.patch(f"/api/resumes/{b['id']}/active", headers=candidate["h"])
    assert r.json()["is_active"] is True
    lst = {x["id"]: x["is_active"] for x in client.get("/api/resumes", headers=candidate["h"]).json()}
    assert lst[a["id"]] is False and lst[b["id"]] is True
    assert client.delete(f"/api/resumes/{b['id']}", headers=candidate["h"]).status_code == 204
    lst = client.get("/api/resumes", headers=candidate["h"]).json()
    assert len(lst) == 1 and lst[0]["is_active"] is True


def test_resume_limit(client, candidate, pdf_bytes):
    for i in range(5):
        assert _upload(client, candidate, pdf_bytes, f"{i}.pdf").status_code == 201
    assert _upload(client, candidate, pdf_bytes, "6.pdf").status_code == 400


def test_access_control(client, candidate, candidate2, recruiter, pdf_bytes):
    rid = _upload(client, candidate, pdf_bytes).json()["id"]
    assert client.get(f"/api/resumes/{rid}/download", headers=candidate["h"]).status_code == 200
    assert client.get(f"/api/resumes/{rid}/download", headers=recruiter["h"]).status_code == 200
    assert client.get(f"/api/resumes/{rid}/download", headers=candidate2["h"]).status_code == 404
    assert client.delete(f"/api/resumes/{rid}", headers=candidate2["h"]).status_code == 404
    assert client.get(f"/api/resumes/candidate/{candidate['id']}", headers=recruiter["h"]).status_code == 200
    assert client.get(f"/api/resumes/candidate/{candidate['id']}", headers=candidate2["h"]).status_code == 403
    assert _upload(client, recruiter, pdf_bytes).status_code == 403  # only candidates upload
    assert client.get(f"/api/resumes/{rid}/download").status_code == 401
