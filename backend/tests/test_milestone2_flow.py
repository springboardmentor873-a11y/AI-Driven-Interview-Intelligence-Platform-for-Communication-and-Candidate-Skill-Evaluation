"""One test that walks the whole Milestone 2 journey, the way the app does."""
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.interviews.models import Question

from .pdf_helper import make_pdf


def test_resume_to_recorded_interview(settings, tmp_path, auth_client, make_user):
    settings.MEDIA_ROOT = tmp_path
    settings.GEMINI_API_KEY = ""  # rule-based fallback, so no network is needed
    recruiter = auth_client(make_user("r@example.com", role="recruiter", first_name="Rita"))
    candidate = auth_client(make_user("c@example.com"))

    # 1. The recruiter publishes a template
    template = recruiter.post("/api/interviews/templates/", {
        "title": "Backend screening", "interview_type": "technical", "difficulty": "easy",
        "domain": "fintech", "duration_minutes": 10, "question_count": 3,
    }, format="json").data

    # 2. The candidate uploads a resume; skills are extracted
    pdf = SimpleUploadedFile("cv.pdf", make_pdf("Python Django React PostgreSQL"), content_type="application/pdf")
    resume = candidate.post("/api/resumes/", {"file": pdf}, format="multipart").data
    assert {"Python", "Django"} <= set(resume["technologies"])

    # 3. They pick the template and get questions built from their resume
    assert [t["id"] for t in candidate.get("/api/interviews/templates/").data] == [template["id"]]
    session = candidate.post("/api/interviews/sessions/", {"template_id": template["id"]}, format="json").data
    sid = session["id"]
    assert session["question_total"] == 3 and session["resume"] == resume["id"]
    texts = " ".join(Question.objects.filter(session_id=sid).values_list("text", flat=True))
    assert any(tech in texts for tech in ("Python", "Django", "React", "PostgreSQL"))

    # 4. They run the interview
    base = f"/api/interviews/sessions/{sid}/"
    assert candidate.post(base + "start/").data["status"] == "in_progress"
    for _ in range(3):
        q = candidate.get(base + "next-question/").data["question"]
        assert q["time_limit_seconds"] == 200  # 10 minutes over 3 questions, rounded down
        res = candidate.post(base + "answer/", {"question_id": q["id"], "duration_seconds": 40}, format="json")
        assert res.status_code == 200
    assert res.data["status"] == "completed"

    # 5. The recording is saved and only the candidate can get it back
    video = SimpleUploadedFile("video.webm", b"\x1a\x45\xdf\xa3" + b"\x00" * 64)
    assert candidate.post(base + "recording/", {"video": video}, format="multipart").data["has_video"]
    assert candidate.get(base + "recording/").status_code == 200
    assert recruiter.get(base + "recording/").status_code == 403

    # 6. History shows the finished interview with the template and its answers
    row = candidate.get("/api/interviews/sessions/").data[0]
    assert (row["status"], row["answered_count"], row["template_title"], row["has_video"]) == (
        "completed", 3, "Backend screening", True)
    assert recruiter.get(f"/api/interviews/templates/{template['id']}/").data["session_count"] == 1
