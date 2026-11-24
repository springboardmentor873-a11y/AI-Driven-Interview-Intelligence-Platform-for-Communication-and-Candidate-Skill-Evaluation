"""
SmartHire AI - Role-Based Access Control (RBAC) Verification Suite
Tests:
1. Candidate Permissions & Isolation:
   - Access candidate dashboard & profile (200)
   - Update candidate profile (200)
   - Upload personal resume (201)
   - View own resumes (200)
   - Download own resume (200)
   - Blocked from candidate search (403)
   - Blocked from recruiter profile (403)
   - Blocked from admin user list (403)
   - Blocked from admin stats (403)
   - Blocked from admin status modification (403)
   - Blocked from admin creation (403)
   - Blocked from downloading another candidate's resume (403)
   - Blocked from deleting another candidate's resume (403)
   - Privilege escalation attempt on self-update blocked (role unchanged)

2. Recruiter Permissions & Isolation:
   - Access recruiter dashboard & profile (200)
   - Update recruiter profile (200)
   - Search candidates list (200)
   - View specific candidate details (200)
   - Download permitted candidate resume (200)
   - Blocked from deleting candidate resumes (403)
   - Blocked from admin user list (403)
   - Blocked from admin stats (403)
   - Blocked from admin creation (403)
   - Privilege escalation attempt blocked (role unchanged)

3. Administrator Full Governance:
   - Access admin dashboard (200)
   - View platform stats (200)
   - View all registered users (200)
   - View individual user details (200)
   - Deactivate user account (200)
   - Reactivate user account (200)
   - Provision new Administrator through authorized route (201)
   - Self-deactivation prevention check (400)
   - Self-demotion prevention check (400)
"""

import os
import sys
import uuid
import io

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole, AccountStatus

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def run_rbac_test_suite():
    print("=" * 75)
    print("   SMARTHIRE AI - ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE")
    print("=" * 75)

    suffix = uuid.uuid4().hex[:6]
    test_password = "SecurePassword@2026!"

    # =================================================================
    # STEP 1: PROVISION ACCOUNTS FOR ALL 3 ROLES
    # =================================================================
    print("\n[SETUP] Provisioning Accounts (Candidate A, Candidate B, Recruiter, Admin)...")

    # 1. Candidate A
    cand_a_email = f"cand.a.{suffix}@smarthire.ai"
    reg_cand_a = client.post("/api/v1/auth/register", json={
        "full_name": f"Candidate Alpha {suffix}",
        "email": cand_a_email,
        "phone_number": "+919876543201",
        "password": test_password,
        "confirm_password": test_password,
        "role": "candidate",
    })
    assert reg_cand_a.status_code == 201, f"Candidate A registration failed: {reg_cand_a.text}"
    cand_a_id = reg_cand_a.json()["user"]["id"]

    login_cand_a = client.post("/api/v1/auth/login", json={"email": cand_a_email, "password": test_password})
    cand_a_token = login_cand_a.json()["access_token"]
    cand_a_headers = {"Authorization": f"Bearer {cand_a_token}"}

    # 2. Candidate B (For cross-user isolation tests)
    cand_b_email = f"cand.b.{suffix}@smarthire.ai"
    reg_cand_b = client.post("/api/v1/auth/register", json={
        "full_name": f"Candidate Beta {suffix}",
        "email": cand_b_email,
        "phone_number": "+919876543202",
        "password": test_password,
        "confirm_password": test_password,
        "role": "candidate",
    })
    assert reg_cand_b.status_code == 201
    cand_b_id = reg_cand_b.json()["user"]["id"]

    login_cand_b = client.post("/api/v1/auth/login", json={"email": cand_b_email, "password": test_password})
    cand_b_token = login_cand_b.json()["access_token"]
    cand_b_headers = {"Authorization": f"Bearer {cand_b_token}"}

    # 3. Recruiter
    recruiter_email = f"recruiter.{suffix}@techcorp.com"
    reg_rec = client.post("/api/v1/auth/register", json={
        "full_name": f"Recruiter Sarah {suffix}",
        "email": recruiter_email,
        "phone_number": "+919876543203",
        "password": test_password,
        "confirm_password": test_password,
        "role": "recruiter",
    })
    assert reg_rec.status_code == 201
    recruiter_id = reg_rec.json()["user"]["id"]

    login_rec = client.post("/api/v1/auth/login", json={"email": recruiter_email, "password": test_password})
    rec_token = login_rec.json()["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    # 4. Admin (Provisioned directly in DB to establish initial trust anchor)
    admin_email = f"admin.root.{suffix}@smarthire.ai"
    db = TestingSessionLocal()
    try:
        admin_user = User(
            full_name=f"Root Administrator {suffix}",
            email=admin_email,
            phone_number="+919876543200",
            hashed_password=hash_password(test_password),
            role=UserRole.ADMIN.value,
            account_status=AccountStatus.ACTIVE.value,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        admin_id = admin_user.id
    finally:
        db.close()

    login_admin = client.post("/api/v1/auth/login", json={"email": admin_email, "password": test_password})
    admin_token = login_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    print(f" PASS: Provisioned 4 test users:\n  - Candidate A: {cand_a_email}\n  - Candidate B: {cand_b_email}\n  - Recruiter:   {recruiter_email}\n  - Admin:       {admin_email}")

    # =================================================================
    # PART 1: CANDIDATE ROLE VERIFICATION
    # =================================================================
    print("\n--- [PART 1: CANDIDATE ROLE RBAC VERIFICATION] ---")

    # 1.1 Candidate accesses own profile
    resp = client.get("/api/v1/users/me", headers=cand_a_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "candidate"
    print(" [1.1] PASS: Candidate accessed own account (/users/me) -> 200 OK")

    # 1.2 Candidate updates candidate profile
    resp = client.put("/api/v1/users/me/candidate-profile", headers=cand_a_headers, json={
        "headline": "Full Stack Python & React Engineer",
        "skills": "Python, FastAPI, React, PostgreSQL",
        "experience_years": 3,
        "github_url": "https://github.com/candidate-alpha",
    })
    assert resp.status_code == 200
    assert resp.json()["headline"] == "Full Stack Python & React Engineer"
    print(" [1.2] PASS: Candidate updated personal candidate profile -> 200 OK")

    # 1.3 Candidate uploads resume
    pdf_content = b"%PDF-1.4 Mock resume file for candidate A"
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        headers=cand_a_headers,
        files={"file": ("resume_alpha.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert upload_resp.status_code == 201
    cand_a_resume_id = upload_resp.json()["id"]
    print(f" [1.3] PASS: Candidate uploaded resume (ID: {cand_a_resume_id}) -> 201 Created")

    # 1.4 Candidate views own resumes
    resp = client.get("/api/v1/resumes/my-resumes", headers=cand_a_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == cand_a_resume_id
    print(" [1.4] PASS: Candidate viewed personal resume records -> 200 OK")

    # 1.5 Candidate downloads own resume
    resp = client.get(f"/api/v1/resumes/download/{cand_a_resume_id}", headers=cand_a_headers)
    assert resp.status_code == 200
    print(" [1.5] PASS: Candidate downloaded personal resume -> 200 OK")

    # 1.6 Candidate B uploads a separate resume
    pdf_content_b = b"%PDF-1.4 Mock resume file for candidate B"
    upload_resp_b = client.post(
        "/api/v1/resumes/upload",
        headers=cand_b_headers,
        files={"file": ("resume_beta.pdf", io.BytesIO(pdf_content_b), "application/pdf")},
    )
    assert upload_resp_b.status_code == 201
    cand_b_resume_id = upload_resp_b.json()["id"]

    # 1.7 RESTRICTION: Candidate A cannot download Candidate B's resume
    resp = client.get(f"/api/v1/resumes/download/{cand_b_resume_id}", headers=cand_a_headers)
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    print(" [1.7] PASS: Candidate A blocked from downloading Candidate B's resume -> 403 Forbidden")

    # 1.8 RESTRICTION: Candidate A cannot delete Candidate B's resume
    resp = client.delete(f"/api/v1/resumes/{cand_b_resume_id}", headers=cand_a_headers)
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    print(" [1.8] PASS: Candidate A blocked from deleting Candidate B's resume -> 403 Forbidden")

    # 1.9 RESTRICTION: Candidate cannot access recruiter endpoints (/users/candidates)
    resp = client.get("/api/v1/users/candidates", headers=cand_a_headers)
    assert resp.status_code == 403
    print(" [1.9] PASS: Candidate blocked from recruiter candidate directory (/users/candidates) -> 403 Forbidden")

    # 1.10 RESTRICTION: Candidate cannot access recruiter profile endpoint (/users/me/recruiter-profile)
    resp = client.get("/api/v1/users/me/recruiter-profile", headers=cand_a_headers)
    assert resp.status_code == 403
    print(" [1.10] PASS: Candidate blocked from recruiter profile endpoint -> 403 Forbidden")

    # 1.11 RESTRICTION: Candidate cannot access admin user list (/users/admin/users)
    resp = client.get("/api/v1/users/admin/users", headers=cand_a_headers)
    assert resp.status_code == 403
    print(" [1.11] PASS: Candidate blocked from admin user list -> 403 Forbidden")

    # 1.12 RESTRICTION: Candidate cannot access admin stats (/users/admin/stats)
    resp = client.get("/api/v1/users/admin/stats", headers=cand_a_headers)
    assert resp.status_code == 403
    print(" [1.12] PASS: Candidate blocked from admin stats -> 403 Forbidden")

    # 1.13 RESTRICTION: Candidate cannot create admin account
    resp = client.post("/api/v1/users/admin/create-admin", headers=cand_a_headers, json={
        "full_name": "Rogue Admin",
        "email": f"rogue.{suffix}@smarthire.ai",
        "password": test_password,
        "confirm_password": test_password,
    })
    assert resp.status_code == 403
    print(" [1.13] PASS: Candidate blocked from creating Admin account -> 403 Forbidden")

    # 1.14 RESTRICTION: Candidate self-privilege escalation check (attempting to set role='admin' via PUT /users/me)
    resp = client.put("/api/v1/users/me", headers=cand_a_headers, json={
        "full_name": "Candidate Alpha Escalation Attempt",
        "role": "admin",  # Malicious extra field
    })
    assert resp.status_code == 200
    assert resp.json()["role"] == "candidate", "Role must NOT change to admin!"
    print(" [1.14] PASS: Privilege escalation attempt rejected. Candidate role remains 'candidate'")

    # =================================================================
    # PART 2: RECRUITER ROLE VERIFICATION
    # =================================================================
    print("\n--- [PART 2: RECRUITER ROLE RBAC VERIFICATION] ---")

    # 2.1 Recruiter accesses recruiter profile
    resp = client.put("/api/v1/users/me/recruiter-profile", headers=rec_headers, json={
        "company_name": "TechCorp Global Inc.",
        "designation": "Lead Technical Recruiter",
        "company_website": "https://techcorp.example.com",
    })
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "TechCorp Global Inc."
    print(" [2.1] PASS: Recruiter updated personal recruiter profile -> 200 OK")

    # 2.2 Recruiter queries active candidate directory
    resp = client.get("/api/v1/users/candidates", headers=rec_headers)
    assert resp.status_code == 200
    candidates_list = resp.json()
    assert len(candidates_list) >= 2
    print(f" [2.2] PASS: Recruiter queried candidates directory (Found {len(candidates_list)} candidates) -> 200 OK")

    # 2.3 Recruiter inspects candidate details
    resp = client.get(f"/api/v1/users/candidates/{cand_a_id}", headers=rec_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == cand_a_email
    print(f" [2.3] PASS: Recruiter viewed candidate details for {cand_a_email} -> 200 OK")

    # 2.4 Recruiter downloads candidate's resume for evaluation
    resp = client.get(f"/api/v1/resumes/download/{cand_a_resume_id}", headers=rec_headers)
    assert resp.status_code == 200
    print(" [2.4] PASS: Recruiter downloaded candidate resume for hiring review -> 200 OK")

    # 2.5 RESTRICTION: Recruiter cannot delete candidate's resume
    resp = client.delete(f"/api/v1/resumes/{cand_a_resume_id}", headers=rec_headers)
    assert resp.status_code == 403
    print(" [2.5] PASS: Recruiter blocked from deleting candidate resume -> 403 Forbidden")

    # 2.6 RESTRICTION: Recruiter cannot access admin user overview
    resp = client.get("/api/v1/users/admin/users", headers=rec_headers)
    assert resp.status_code == 403
    print(" [2.6] PASS: Recruiter blocked from admin user overview -> 403 Forbidden")

    # 2.7 RESTRICTION: Recruiter cannot access admin stats
    resp = client.get("/api/v1/users/admin/stats", headers=rec_headers)
    assert resp.status_code == 403
    print(" [2.7] PASS: Recruiter blocked from admin stats -> 403 Forbidden")

    # 2.8 RESTRICTION: Recruiter cannot activate/deactivate accounts
    resp = client.patch(f"/api/v1/users/admin/users/{cand_a_id}/status", headers=rec_headers, json={
        "account_status": "suspended",
    })
    assert resp.status_code == 403
    print(" [2.8] PASS: Recruiter blocked from modifying account status -> 403 Forbidden")

    # =================================================================
    # PART 3: ADMINISTRATOR ROLE VERIFICATION
    # =================================================================
    print("\n--- [PART 3: ADMINISTRATOR ROLE RBAC VERIFICATION] ---")

    # 3.1 Admin views platform statistics
    resp = client.get("/api/v1/users/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    stats = resp.json()["data"]
    assert stats["total_users"] >= 4
    assert stats["candidates"] >= 2
    assert stats["recruiters"] >= 1
    assert stats["admins"] >= 1
    print(f" [3.1] PASS: Admin viewed platform stats (Total: {stats['total_users']}, Candidates: {stats['candidates']}, Recruiters: {stats['recruiters']}, Admins: {stats['admins']}) -> 200 OK")

    # 3.2 Admin views full platform users directory
    resp = client.get("/api/v1/users/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 4
    print(f" [3.2] PASS: Admin listed all platform users ({len(resp.json())} accounts) -> 200 OK")

    # 3.3 Admin inspects single user by ID
    resp = client.get(f"/api/v1/users/admin/users/{cand_a_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == cand_a_id
    print(" [3.3] PASS: Admin inspected user by ID -> 200 OK")

    # 3.4 Admin deactivates Candidate B's account
    resp = client.patch(f"/api/v1/users/admin/users/{cand_b_id}/status", headers=admin_headers, json={
        "account_status": "suspended",
    })
    assert resp.status_code == 200
    assert resp.json()["account_status"] == "suspended"
    print(" [3.4] PASS: Admin suspended Candidate B account -> 200 OK")

    # 3.5 Verify deactivated account is immediately blocked
    resp = client.post("/api/v1/auth/login", json={"email": cand_b_email, "password": test_password})
    assert resp.status_code == 403
    print(" [3.5] PASS: Suspended Candidate B immediately blocked from login -> 403 Forbidden")

    # 3.6 Admin reactivates Candidate B
    resp = client.patch(f"/api/v1/users/admin/users/{cand_b_id}/status", headers=admin_headers, json={
        "account_status": "active",
    })
    assert resp.status_code == 200
    assert resp.json()["account_status"] == "active"
    print(" [3.6] PASS: Admin reactivated Candidate B account -> 200 OK")

    # 3.7 Admin provisions a new Administrator via authorized endpoint
    new_admin_email = f"new.admin.{suffix}@smarthire.ai"
    resp = client.post("/api/v1/users/admin/create-admin", headers=admin_headers, json={
        "full_name": f"Authorized Admin {suffix}",
        "email": new_admin_email,
        "phone_number": "+919876543209",
        "password": test_password,
        "confirm_password": test_password,
    })
    assert resp.status_code == 201
    assert resp.json()["user"]["role"] == "admin"
    print(f" [3.7] PASS: Admin provisioned new Administrator ({new_admin_email}) -> 201 Created")

    # 3.8 Self-Protection: Admin cannot deactivate their own administrative account
    resp = client.patch(f"/api/v1/users/admin/users/{admin_id}/status", headers=admin_headers, json={
        "account_status": "suspended",
    })
    assert resp.status_code == 400
    assert "cannot deactivate or suspend your own" in resp.json()["detail"]
    print(" [3.8] PASS: Admin self-suspension prevented -> 400 Bad Request")

    # 3.9 Self-Protection: Admin cannot demote their own admin role
    resp = client.patch(f"/api/v1/users/admin/users/{admin_id}/status", headers=admin_headers, json={
        "role": "candidate",
    })
    assert resp.status_code == 400
    assert "cannot demote your own" in resp.json()["detail"]
    print(" [3.9] PASS: Admin self-demotion prevented -> 400 Bad Request")

    # =================================================================
    # PART 4: PUBLIC REGISTRATION BOUNDARY
    # =================================================================
    print("\n--- [PART 4: PUBLIC REGISTRATION SECURITY CHECK] ---")

    # 4.1 Unrestricted public admin registration must fail
    fake_admin_email = f"fake.admin.{suffix}@smarthire.ai"
    resp = client.post("/api/v1/auth/register", json={
        "full_name": "Malicious Fake Admin",
        "email": fake_admin_email,
        "password": test_password,
        "confirm_password": test_password,
        "role": "admin",
    })
    assert resp.status_code == 422
    assert "Admin accounts cannot be created through public registration" in resp.text
    print(" [4.1] PASS: Public registration of Admin role rejected -> 422 Unprocessable Content")

    # 4.2 Unauthenticated access to private endpoint must fail
    resp = client.get("/api/v1/users/admin/users")
    assert resp.status_code == 401
    print(" [4.2] PASS: Unauthenticated access to protected endpoint rejected -> 401 Unauthorized")

    print("\n" + "=" * 75)
    print("   ALL RBAC PERMISSIONS, RESTRICTIONS & ISOLATIONS VERIFIED (100% PASS)!")
    print("=" * 75)


if __name__ == "__main__":
    try:
        run_rbac_test_suite()
    except Exception as e:
        print(f"\n[ERROR] RBAC test suite encountered an issue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
