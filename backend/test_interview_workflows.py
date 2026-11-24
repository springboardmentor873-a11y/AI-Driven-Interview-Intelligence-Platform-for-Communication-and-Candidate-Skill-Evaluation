import os
import sys
import unittest

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db, seed_default_data
from app.models.user import User, UserRole
from app.core.security import create_access_token

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)

with TestingSessionLocal() as session:
    seed_default_data(session)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_interviews_end_to_end():
    print("\n" + "=" * 70)
    print("RUNNING INTERVIEW & AI ASSESSMENT END-TO-END TEST SUITE")
    print("=" * 70)

    # 1. Login as Candidate
    cand_resp = client.post("/api/v1/auth/login", json={
        "email": "candidate@smarthire.ai",
        "password": "CandidatePass123!",
    })
    assert cand_resp.status_code == 200, f"Candidate login failed: {cand_resp.text}"
    cand_token = cand_resp.json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}
    print(" PASS: Candidate login successful")

    # 2. Practice Questions Library
    questions_resp = client.get("/api/v1/interviews/practice-questions", headers=cand_headers)
    assert questions_resp.status_code == 200, f"Get questions failed: {questions_resp.text}"
    questions = questions_resp.json()
    assert len(questions) >= 6, f"Expected at least 6 questions, got {len(questions)}"
    print(f" PASS: Retrieved {len(questions)} practice questions")

    # Filter by category
    behavioral_resp = client.get("/api/v1/interviews/practice-questions?category=Behavioral", headers=cand_headers)
    assert behavioral_resp.status_code == 200
    assert len(behavioral_resp.json()) >= 2
    print(f" PASS: Filter by category=Behavioral returned {len(behavioral_resp.json())} questions")

    # 3. Start Mock Interview Session
    start_resp = client.post("/api/v1/interviews/sessions/start", json={
        "role_title": "Full Stack Engineer",
        "difficulty": "Medium",
        "questions_count": 2,
    }, headers=cand_headers)
    assert start_resp.status_code == 201, f"Start interview failed: {start_resp.text}"
    start_data = start_resp.json()
    session_id = start_data["session_id"]
    assert session_id is not None
    assert len(start_data["questions"]) == 2
    print(f" PASS: Mock interview session started with ID: {session_id}")

    # 4. Submit Answer with AI Rubric Evaluation
    answer_payload = {
        "question_id": start_data["questions"][0]["id"],
        "question_text": start_data["questions"][0]["question_text"],
        "category": "Behavioral",
        "transcript": (
            "In my previous project, we were facing critical latency issues on the payment microservice. "
            "My task was to diagnose the root cause and restore 99.9% uptime within 48 hours. "
            "I led the performance debugging effort, implemented distributed Redis caching, and refactored our database query pool. "
            "As a result, we reduced endpoint latency by 65% and successfully handled over two million transactions during the holiday surge."
        ),
        "duration_seconds": 65,
    }
    submit_resp = client.post(f"/api/v1/interviews/sessions/{session_id}/submit-answer", json=answer_payload, headers=cand_headers)
    assert submit_resp.status_code == 200, f"Submit answer failed: {submit_resp.text}"
    ans_data = submit_resp.json()
    assert ans_data["score"] > 70
    assert ans_data["wpm"] > 50
    assert "STAR" in ans_data["ai_feedback"] or "Optimal" in ans_data["ai_feedback"]
    print(f" PASS: Answer evaluated: Score={ans_data['score']}, WPM={ans_data['wpm']}, Feedback: {ans_data['ai_feedback'][:60]}...")

    # 5. Complete Interview & Generate Report
    complete_resp = client.post(f"/api/v1/interviews/sessions/{session_id}/complete", headers=cand_headers)
    assert complete_resp.status_code == 200, f"Complete interview failed: {complete_resp.text}"
    report_data = complete_resp.json()
    assert report_data["status"] == "completed"
    assert report_data["overall_score"] > 70
    assert len(report_data["strengths"]) > 0
    assert len(report_data["recommendations"]) > 0
    print(f" PASS: Interview completed! Overall Score={report_data['overall_score']}")

    # 6. Retrieve Report by Session ID
    get_report_resp = client.get(f"/api/v1/interviews/sessions/{session_id}/report", headers=cand_headers)
    assert get_report_resp.status_code == 200
    assert get_report_resp.json()["session_id"] == session_id
    print(" PASS: Retrieved assessment report by ID successfully")

    # 7. Candidate History
    history_resp = client.get("/api/v1/interviews/my-history", headers=cand_headers)
    assert history_resp.status_code == 200
    assert len(history_resp.json()) >= 1
    print(f" PASS: Candidate history returned {len(history_resp.json())} sessions")

    print("\n" + "=" * 70)
    print("ALL 7/7 INTERVIEW WORKFLOW TESTS PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    test_interviews_end_to_end()

