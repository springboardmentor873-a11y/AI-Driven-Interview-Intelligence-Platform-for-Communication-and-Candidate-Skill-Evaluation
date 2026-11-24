"""
SmartHire AI - Secure Login & JWT Authentication Verification Suite
Tests:
1. Candidate registration followed by login
2. Valid credential verification & JWT token generation
3. Invalid password handling (401)
4. Non-existent email handling (401 uniform message)
5. Inactive / Suspended account handling (403)
6. Access protected endpoint (/api/v1/auth/me) with valid token (200)
7. Missing token rejection (401)
8. Tampered / Malformed token rejection (401)
9. Expired token rejection (401)
10. Role-Based Access Control (RBAC): Candidate blocked from recruiter endpoint (403)
11. Recruiter login and successful access to recruiter endpoint (200)
12. Logout & Token Revocation (subsequent request rejected with 401)
"""

import os
import sys
import uuid
from datetime import timedelta

# Set in-memory SQLite database before loading settings
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import jwt

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.database.database import Base, get_db
from app.models.user import User, AccountStatus
from app.models.session import UserSession

# Isolated in-memory database for reproducible test execution
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


def run_all_jwt_tests():
    print("=" * 70)
    print("SMARTHIRE AI - JWT AUTHENTICATION & LOGIN TEST SUITE")
    print("=" * 70)

    unique_suffix = uuid.uuid4().hex[:6]
    test_email = f"candidate.jwt.{unique_suffix}@smarthire.ai"
    test_password = "SecurePassword@2026!"
    candidate_name = f"JWT Candidate {unique_suffix}"

    # -------------------------------------------------------------
    # Test 1: User Registration
    # -------------------------------------------------------------
    print("\n[Test 1] Candidate User Registration...")
    reg_payload = {
        "full_name": candidate_name,
        "email": test_email,
        "phone_number": "+919876543210",
        "password": test_password,
        "confirm_password": test_password,
        "role": "candidate",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    user_id = reg_data["user"]["id"]
    print(f" PASS: Registered user {test_email} (ID: {user_id})")

    # -------------------------------------------------------------
    # Test 2: Login with Valid Credentials
    # -------------------------------------------------------------
    print("\n[Test 2] Login with Valid Credentials...")
    login_payload = {
        "email": test_email,
        "password": test_password,
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token_data = login_resp.json()

    assert "access_token" in token_data, "Missing access_token in response"
    assert token_data["token_type"] == "bearer", f"Unexpected token_type: {token_data['token_type']}"
    assert token_data["role"] == "candidate", f"Unexpected role: {token_data['role']}"
    assert token_data["user_id"] == user_id, f"User ID mismatch"
    assert token_data["full_name"] == candidate_name, f"Name mismatch"
    assert token_data["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    assert token_data["user"]["email"] == test_email
    assert token_data["user"]["role"] == "candidate"

    # Cryptographically decode the access token to verify claims
    token_str = token_data["access_token"]
    decoded = jwt.decode(token_str, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == user_id, f"Token sub mismatch: {decoded['sub']} != {user_id}"
    assert decoded["role"] == "candidate", f"Token role mismatch: {decoded['role']}"
    assert decoded["email"] == test_email, f"Token email mismatch: {decoded['email']}"
    assert decoded["exp"] > decoded["iat"], "Token exp must be after iat"

    print(f" PASS: Login returned valid JWT token with subject: {decoded['sub']}, expires_in: {token_data['expires_in']}s")

    # -------------------------------------------------------------
    # Test 3: Login with Invalid Password
    # -------------------------------------------------------------
    print("\n[Test 3] Login with Incorrect Password...")
    bad_pwd_resp = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": "WrongPassword123!",
    })
    assert bad_pwd_resp.status_code == 401, f"Expected 401, got {bad_pwd_resp.status_code}"
    assert "Invalid email or password" in bad_pwd_resp.json()["detail"]
    assert "WWW-Authenticate" in bad_pwd_resp.headers
    print(f" PASS: Rejected with 401 Unauthorized ('{bad_pwd_resp.json()['detail']}')")

    # -------------------------------------------------------------
    # Test 4: Login with Non-Existent Email
    # -------------------------------------------------------------
    print("\n[Test 4] Login with Non-Existent Email...")
    bad_email_resp = client.post("/api/v1/auth/login", json={
        "email": f"nonexistent.{unique_suffix}@smarthire.ai",
        "password": test_password,
    })
    assert bad_email_resp.status_code == 401, f"Expected 401, got {bad_email_resp.status_code}"
    assert "Invalid email or password" in bad_email_resp.json()["detail"]
    print(" PASS: Rejected with 401 Unauthorized (safe uniform error message)")

    # -------------------------------------------------------------
    # Test 5: Inactive / Suspended Account Login
    # -------------------------------------------------------------
    print("\n[Test 5] Login with Suspended / Inactive Account...")
    db = TestingSessionLocal()
    try:
        user_db = db.query(User).filter(User.id == user_id).first()
        user_db.account_status = AccountStatus.SUSPENDED.value
        db.commit()
    finally:
        db.close()

    suspended_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert suspended_resp.status_code == 403, f"Expected 403 for suspended user, got {suspended_resp.status_code}"
    assert "Access denied" in suspended_resp.json()["detail"]
    print(f" PASS: Suspended user rejected with 403 Forbidden ('{suspended_resp.json()['detail']}')")

    # Restore user to active
    db = TestingSessionLocal()
    try:
        user_db = db.query(User).filter(User.id == user_id).first()
        user_db.account_status = AccountStatus.ACTIVE.value
        db.commit()
    finally:
        db.close()

    # Re-login to get a fresh active token
    fresh_login = client.post("/api/v1/auth/login", json=login_payload)
    candidate_token = fresh_login.json()["access_token"]
    candidate_headers = {"Authorization": f"Bearer {candidate_token}"}

    # -------------------------------------------------------------
    # Test 6: Access Protected Endpoint (/api/v1/auth/me) with Valid JWT
    # -------------------------------------------------------------
    print("\n[Test 6] Access Protected Profile (/api/v1/auth/me) with Bearer Token...")
    me_resp = client.get("/api/v1/auth/me", headers=candidate_headers)
    assert me_resp.status_code == 200, f"Failed to access /auth/me: {me_resp.text}"
    profile = me_resp.json()
    assert profile["email"] == test_email
    assert profile["role"] == "candidate"
    print(f" PASS: Authenticated access granted. User: {profile['full_name']} ({profile['email']})")

    # -------------------------------------------------------------
    # Test 7: Access Protected Endpoint Without Token
    # -------------------------------------------------------------
    print("\n[Test 7] Access Protected Endpoint Without Authorization Header...")
    no_auth_resp = client.get("/api/v1/auth/me")
    assert no_auth_resp.status_code == 401, f"Expected 401, got {no_auth_resp.status_code}"
    print(f" PASS: Missing token rejected with 401 ('{no_auth_resp.json()['detail']}')")

    # -------------------------------------------------------------
    # Test 8: Access Protected Endpoint with Tampered Token
    # -------------------------------------------------------------
    print("\n[Test 8] Access Protected Endpoint with Tampered / Malformed Token...")
    tampered_headers = {"Authorization": f"Bearer {candidate_token}tampered_suffix"}
    tampered_resp = client.get("/api/v1/auth/me", headers=tampered_headers)
    assert tampered_resp.status_code == 401, f"Expected 401, got {tampered_resp.status_code}"
    assert "Invalid authentication token" in tampered_resp.json()["detail"]
    print(f" PASS: Tampered token rejected with 401 ('{tampered_resp.json()['detail']}')")

    # -------------------------------------------------------------
    # Test 9: Access Protected Endpoint with Expired Token
    # -------------------------------------------------------------
    print("\n[Test 9] Access Protected Endpoint with Expired Token...")
    expired_token = create_access_token(
        subject=user_id,
        role="candidate",
        email=test_email,
        expires_delta=timedelta(minutes=-30),  # expired 30 minutes ago
    )
    expired_headers = {"Authorization": f"Bearer {expired_token}"}
    expired_resp = client.get("/api/v1/auth/me", headers=expired_headers)
    assert expired_resp.status_code == 401, f"Expected 401, got {expired_resp.status_code}"
    assert "expired" in expired_resp.json()["detail"].lower()
    print(f" PASS: Expired token rejected with 401 ('{expired_resp.json()['detail']}')")

    # -------------------------------------------------------------
    # Test 10: Role-Based Access Control (RBAC) - Candidate -> Recruiter route
    # -------------------------------------------------------------
    print("\n[Test 10] RBAC: Candidate attempting to access Recruiter-only endpoint...")
    rbac_resp = client.get("/api/v1/users/candidates", headers=candidate_headers)
    assert rbac_resp.status_code == 403, f"Expected 403 for candidate on recruiter route, got {rbac_resp.status_code}"
    assert "Access forbidden" in rbac_resp.json()["detail"]
    print(f" PASS: Candidate blocked from recruiter endpoint with 403 Forbidden")

    # -------------------------------------------------------------
    # Test 11: Recruiter Registration, Login & Endpoint Access
    # -------------------------------------------------------------
    print("\n[Test 11] Recruiter Registration, Login & Route Access...")
    recruiter_email = f"recruiter.{unique_suffix}@techcorp.com"
    rec_reg = client.post("/api/v1/auth/register", json={
        "full_name": f"Recruiter {unique_suffix}",
        "email": recruiter_email,
        "phone_number": "+919876543299",
        "password": test_password,
        "confirm_password": test_password,
        "role": "recruiter",
    })
    assert rec_reg.status_code == 201, f"Recruiter registration failed: {rec_reg.text}"

    rec_login = client.post("/api/v1/auth/login", json={
        "email": recruiter_email,
        "password": test_password,
    })
    assert rec_login.status_code == 200, f"Recruiter login failed: {rec_login.text}"
    recruiter_token = rec_login.json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # Recruiter accesses candidate search
    candidates_resp = client.get("/api/v1/users/candidates", headers=recruiter_headers)
    assert candidates_resp.status_code == 200, f"Recruiter candidate search failed: {candidates_resp.text}"
    print(f" PASS: Recruiter accessed candidate list successfully (returned {len(candidates_resp.json())} candidate records)")

    # -------------------------------------------------------------
    # Test 12: Session Logout & Token Revocation
    # -------------------------------------------------------------
    print("\n[Test 12] Session Logout & Token Revocation...")
    logout_resp = client.post("/api/v1/auth/logout", headers=candidate_headers)
    assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
    assert logout_resp.json()["status"] == "success"
    print(f" PASS: Logout succeeded ('{logout_resp.json()['message']}')")

    # Attempt to use the logged-out token again
    revoked_resp = client.get("/api/v1/auth/me", headers=candidate_headers)
    assert revoked_resp.status_code == 401, f"Expected 401 for revoked token, got {revoked_resp.status_code}"
    assert "revoked" in revoked_resp.json()["detail"].lower()
    print(f" PASS: Revoked token was rejected with 401 ('{revoked_resp.json()['detail']}')")

    print("\n" + "=" * 70)
    print("ALL 12/12 JWT AUTHENTICATION & LOGIN TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    try:
        run_all_jwt_tests()
    except Exception as e:
        print(f"\n[ERROR] Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
