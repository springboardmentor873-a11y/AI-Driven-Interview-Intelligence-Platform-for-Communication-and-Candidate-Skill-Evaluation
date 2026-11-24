import io
import os
import sys

# Set DATABASE_URL to in-memory SQLite before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db, engine

# Use an in-memory SQLite database specifically for automated testing
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Create all tables in the test database
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def run_all_tests():
    print("==================================================")
    print("   SmartHire AI - Milestone 1 Verification Suite   ")
    print("==================================================")

    # 1. Health & Root Endpoints
    print("\n[TEST 1] Root and Health Endpoints...")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert res.json()["status"] == "online"
    print("  -> Root endpoint OK.")

    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["api_status"] == "healthy"
    print("  -> Health check OK.")

    # 2. Candidate Registration
    print("\n[TEST 2] Candidate Registration...")
    candidate_data = {
        "email": "candidate1@example.com",
        "full_name": "Rohan Sharma",
        "phone_number": "+91-9876543210",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "candidate",
    }
    res = client.post("/api/v1/auth/register", json=candidate_data)
    assert res.status_code == 201, f"Failed candidate register: {res.text}"
    user_cand = res.json()["user"]
    assert user_cand["email"] == "candidate1@example.com"
    assert user_cand["role"] == "candidate"
    assert "hashed_password" not in user_cand  # Password must never leak
    print(f"  -> Candidate registered successfully with ID: {user_cand['id']}")

    # 3. Duplicate Email Prevention
    print("\n[TEST 3] Duplicate Email Rejection...")
    res = client.post("/api/v1/auth/register", json=candidate_data)
    assert res.status_code == 400, "Should reject duplicate email with 400 Bad Request"
    print("  -> Duplicate registration prevented correctly (HTTP 400).")

    # 4. Recruiter & Admin Registration
    print("\n[TEST 4] Recruiter Registration & Admin Security...")
    recruiter_data = {
        "email": "recruiter1@techcorp.com",
        "full_name": "Priya Nair",
        "phone_number": "+91-9123456789",
        "password": "RecruiterPass123!",
        "confirm_password": "RecruiterPass123!",
        "role": "recruiter",
    }
    res_rec = client.post("/api/v1/auth/register", json=recruiter_data)
    assert res_rec.status_code == 201
    print("  -> Recruiter registered successfully.")

    # Public registration of admin MUST be blocked
    admin_public_data = {
        "email": "admin_attempt@smarthire.ai",
        "full_name": "Fake Admin",
        "password": "AdminSecretPass123!",
        "confirm_password": "AdminSecretPass123!",
        "role": "admin",
    }
    res_blocked = client.post("/api/v1/auth/register", json=admin_public_data)
    assert res_blocked.status_code == 422
    print("  -> Public Admin creation successfully blocked.")

    # Seed root admin for admin tests
    from app.models.user import User, AccountStatus
    from app.core.security import hash_password
    db = TestingSessionLocal()
    admin_user = User(
        email="admin@smarthire.ai",
        full_name="System Admin",
        phone_number="+91-9000000000",
        hashed_password=hash_password("AdminSecretPass123!"),
        role="admin",
        account_status=AccountStatus.ACTIVE.value,
    )
    db.add(admin_user)
    db.commit()
    db.close()
    print("  -> Admin provisioned via authorized setup.")

    # 5. User Login & JWT Issuance
    print("\n[TEST 5] Candidate Login & JWT Authentication...")
    login_data = {"email": "candidate1@example.com", "password": "Password123!"}
    res = client.post("/api/v1/auth/login", json=login_data)
    assert res.status_code == 200, f"Login failed: {res.text}"
    token_resp = res.json()
    assert "access_token" in token_resp
    assert token_resp["token_type"] == "bearer"
    assert token_resp["role"] == "candidate"
    cand_token = token_resp["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}
    print("  -> JWT issued successfully.")

    # Recruiter login
    res_rec_login = client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter1@techcorp.com", "password": "RecruiterPass123!"},
    )
    assert res_rec_login.status_code == 200
    rec_token = res_rec_login.json()["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    # Admin login
    res_adm_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarthire.ai", "password": "AdminSecretPass123!"},
    )
    assert res_adm_login.status_code == 200
    adm_token = res_adm_login.json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    # 6. Current User Profile (/auth/me)
    print("\n[TEST 6] Current User Profile (/auth/me)...")
    res = client.get("/api/v1/auth/me", headers=cand_headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "Rohan Sharma"
    print("  -> Candidate /auth/me verified.")

    # 7. Role-Based Access Control (RBAC) Verification
    print("\n[TEST 7] RBAC Security Restrictions...")
    # Candidate trying to access Admin endpoint -> MUST RETURN 403 FORBIDDEN
    res_forbidden = client.get("/api/v1/users/admin/users", headers=cand_headers)
    assert res_forbidden.status_code == 403, f"Expected 403, got {res_forbidden.status_code}"
    print("  -> RBAC Guard Blocked Candidate from Admin route (HTTP 403 Forbidden).")

    # Recruiter accessing Candidate search -> SHOULD SUCCEED (200 OK)
    res_candidates = client.get("/api/v1/users/candidates", headers=rec_headers)
    assert res_candidates.status_code == 200
    assert len(res_candidates.json()) >= 1
    print("  -> Recruiter successfully queried candidate directory (HTTP 200 OK).")

    # Admin accessing Admin users list -> SHOULD SUCCEED (200 OK)
    res_admin_users = client.get("/api/v1/users/admin/users", headers=adm_headers)
    assert res_admin_users.status_code == 200
    assert len(res_admin_users.json()) == 3
    print("  -> Admin successfully accessed admin overview (HTTP 200 OK).")

    # 8. Candidate Profile Update
    print("\n[TEST 8] Candidate Profile Update...")
    cand_profile_payload = {
        "headline": "Aspiring Full Stack & AI Developer",
        "phone_number": "+91-9876543210",
        "skills": "Python, FastAPI, React, PostgreSQL, Docker",
        "experience_years": 1,
        "education": "B.Tech in Computer Science",
        "github_url": "https://github.com/rohan-sharma",
        "linkedin_url": "https://linkedin.com/in/rohan-sharma",
    }
    res_prof = client.put(
        "/api/v1/users/me/candidate-profile",
        json=cand_profile_payload,
        headers=cand_headers,
    )
    assert res_prof.status_code == 200, f"Profile update failed: {res_prof.text}"
    updated_prof = res_prof.json()
    assert updated_prof["headline"] == "Aspiring Full Stack & AI Developer"
    assert updated_prof["experience_years"] == 1
    print("  -> Candidate profile updated successfully.")

    # 9. Recruiter Profile Update
    print("\n[TEST 9] Recruiter Profile Update...")
    rec_profile_payload = {
        "company_name": "TechCorp Global Solutions",
        "company_website": "https://techcorp.example.com",
        "designation": "Lead Talent Acquisition",
        "phone_number": "+91-9988776655",
    }
    res_rec_prof = client.put(
        "/api/v1/users/me/recruiter-profile",
        json=rec_profile_payload,
        headers=rec_headers,
    )
    assert res_rec_prof.status_code == 200
    assert res_rec_prof.json()["company_name"] == "TechCorp Global Solutions"
    print("  -> Recruiter profile updated successfully.")

    # 10. Resume Upload & Management Workflow
    print("\n[TEST 10] Resume Upload, Download, and Delete Workflow...")
    # Create a mock PDF file in memory
    mock_pdf_bytes = b"%PDF-1.4 Mock resume content for Rohan Sharma..."
    files = {
        "file": ("rohan_sharma_resume.pdf", io.BytesIO(mock_pdf_bytes), "application/pdf")
    }
    data = {"is_primary": "true"}

    # Upload
    res_upload = client.post("/api/v1/resumes/upload", headers=cand_headers, files=files, data=data)
    assert res_upload.status_code == 201, f"Resume upload failed: {res_upload.text}"
    resume_meta = res_upload.json()
    resume_id = resume_meta["id"]
    assert resume_meta["original_filename"] == "rohan_sharma_resume.pdf"
    assert resume_meta["upload_status"] == "uploaded"
    print(f"  -> Resume uploaded successfully with ID: {resume_id}")

    # List Candidate Resumes
    res_list = client.get("/api/v1/resumes/my-resumes", headers=cand_headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    print("  -> Candidate successfully listed uploaded resumes.")

    # Recruiter Downloads/Views Resume
    res_dl = client.get(f"/api/v1/resumes/download/{resume_id}", headers=rec_headers)
    assert res_dl.status_code == 200
    assert res_dl.content == mock_pdf_bytes
    print("  -> Recruiter successfully downloaded candidate resume.")

    # Candidate Deletes Resume
    res_del = client.delete(f"/api/v1/resumes/{resume_id}", headers=cand_headers)
    assert res_del.status_code == 200
    print("  -> Candidate successfully deleted resume.")

    # Verify resume no longer in list
    res_list_after = client.get("/api/v1/resumes/my-resumes", headers=cand_headers)
    assert len(res_list_after.json()) == 0
    print("  -> Resume list verified empty after deletion.")

    print("\n==================================================")
    print("   ALL 10 MILESTONE 1 VERIFICATION TESTS PASSED!  ")
    print("==================================================")


if __name__ == "__main__":
    run_all_tests()

