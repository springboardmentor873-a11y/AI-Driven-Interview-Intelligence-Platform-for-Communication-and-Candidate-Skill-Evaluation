"""
SmartHire AI - Registration Functionality Test Suite
Usage: python test_registration.py
Tests all requirements: field validation, password strength, confirmation check,
duplicate email prevention, secure bcrypt hashing, public role restriction, and authorized admin creation.
"""

import os
import sys

# Set in-memory SQLite database before imports
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.models.user import User

# Use isolated test database
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


def run_registration_tests():
    print("=" * 65)
    print("   SmartHire AI - User Registration Functionality Test Suite   ")
    print("=" * 65)

    # ---------------------------------------------------------
    # TEST 1: Successful Candidate Registration
    # ---------------------------------------------------------
    print("\n[TEST 1] Valid Candidate Registration...")
    cand_payload = {
        "full_name": "Rohan Sharma",
        "email": "rohan.sharma@example.com",
        "phone_number": "+91-9876543210",
        "password": "StrongPassword123!",
        "confirm_password": "StrongPassword123!",
        "role": "candidate"
    }
    res = client.post("/api/v1/auth/register", json=cand_payload)
    assert res.status_code == 201, f"Failed: {res.text}"
    body = res.json()
    assert body["status"] == "success"
    assert body["user"]["email"] == "rohan.sharma@example.com"
    assert body["user"]["role"] == "candidate"
    assert body["user"]["phone_number"] == "+91-9876543210"
    assert "hashed_password" not in body["user"]  # Never leaks
    print("  -> Candidate registered successfully (HTTP 201).")

    # ---------------------------------------------------------
    # TEST 2: Successful Recruiter Registration
    # ---------------------------------------------------------
    print("\n[TEST 2] Valid Recruiter Registration...")
    rec_payload = {
        "full_name": "Priya Nair",
        "email": "priya.nair@techcorp.com",
        "phone_number": "+91-9123456789",
        "password": "RecruiterSecret123@",
        "confirm_password": "RecruiterSecret123@",
        "role": "recruiter"
    }
    res = client.post("/api/v1/auth/register", json=rec_payload)
    assert res.status_code == 201, f"Failed: {res.text}"
    body = res.json()
    assert body["user"]["role"] == "recruiter"
    print("  -> Recruiter registered successfully (HTTP 201).")

    # ---------------------------------------------------------
    # TEST 3: SECURITY CHECK - Public Admin Registration Blocked
    # ---------------------------------------------------------
    print("\n[TEST 3] Security Restriction: Public Admin Registration MUST Fail...")
    admin_public_payload = {
        "full_name": "Hacker Attacker",
        "email": "hacker@evil.com",
        "phone_number": "+91-9999999999",
        "password": "AdminPassword123!",
        "confirm_password": "AdminPassword123!",
        "role": "admin"
    }
    res = client.post("/api/v1/auth/register", json=admin_public_payload)
    assert res.status_code == 422, f"Expected 422 Unprocessable Entity, got {res.status_code}: {res.text}"
    assert "Admin accounts cannot be created through public registration" in res.text
    print("  -> Public Admin creation successfully BLOCKED (HTTP 422).")

    # ---------------------------------------------------------
    # TEST 4: Duplicate Email Prevention
    # ---------------------------------------------------------
    print("\n[TEST 4] Duplicate Email Rejection...")
    dup_payload = {
        "full_name": "Rohan Clone",
        "email": "rohan.sharma@example.com",  # Same as Test 1
        "phone_number": "+91-9876543211",
        "password": "DifferentPass123!",
        "confirm_password": "DifferentPass123!",
        "role": "candidate"
    }
    res = client.post("/api/v1/auth/register", json=dup_payload)
    assert res.status_code == 400, f"Expected 400 Bad Request, got {res.status_code}"
    assert "already exists" in res.json()["detail"]
    print("  -> Duplicate email correctly rejected (HTTP 400).")

    # ---------------------------------------------------------
    # TEST 5: Password Mismatch Check
    # ---------------------------------------------------------
    print("\n[TEST 5] Password & Confirm Password Mismatch...")
    mismatch_payload = {
        "full_name": "Anita Verma",
        "email": "anita@example.com",
        "password": "StrongPassword123!",
        "confirm_password": "WrongPassword999!",
        "role": "candidate"
    }
    res = client.post("/api/v1/auth/register", json=mismatch_payload)
    assert res.status_code == 422
    assert "Password and Confirm Password do not match" in res.text
    print("  -> Password mismatch rejected (HTTP 422).")

    # ---------------------------------------------------------
    # TEST 6: Password Strength Validation
    # ---------------------------------------------------------
    print("\n[TEST 6] Password Strength Validation...")
    # Too short (< 8 chars)
    short_pw = {"full_name": "Test", "email": "t1@ex.com", "password": "Ab1!", "confirm_password": "Ab1!"}
    res = client.post("/api/v1/auth/register", json=short_pw)
    assert res.status_code == 422
    assert "at least 8 characters" in res.text

    # No uppercase
    no_upper = {"full_name": "Test", "email": "t2@ex.com", "password": "password123!", "confirm_password": "password123!"}
    res = client.post("/api/v1/auth/register", json=no_upper)
    assert res.status_code == 422
    assert "uppercase" in res.text

    # No number
    no_digit = {"full_name": "Test", "email": "t3@ex.com", "password": "Password!", "confirm_password": "Password!"}
    res = client.post("/api/v1/auth/register", json=no_digit)
    assert res.status_code == 422
    assert "digit" in res.text

    # No special character
    no_special = {"full_name": "Test", "email": "t4@ex.com", "password": "Password123", "confirm_password": "Password123"}
    res = client.post("/api/v1/auth/register", json=no_special)
    assert res.status_code == 422
    assert "special character" in res.text
    print("  -> All 4 password strength rules enforced (length, upper, digit, special).")

    # ---------------------------------------------------------
    # TEST 7: Phone Number Format Validation
    # ---------------------------------------------------------
    print("\n[TEST 7] Phone Number Format Validation...")
    bad_phone = {
        "full_name": "Rahul",
        "email": "rahul@ex.com",
        "phone_number": "not-a-number-abc",
        "password": "ValidPassword123!",
        "confirm_password": "ValidPassword123!"
    }
    res = client.post("/api/v1/auth/register", json=bad_phone)
    assert res.status_code == 422
    assert "Invalid phone number format" in res.text
    print("  -> Invalid phone number rejected (HTTP 422).")

    # ---------------------------------------------------------
    # TEST 8: Database Bcrypt Password Storage Verification
    # ---------------------------------------------------------
    print("\n[TEST 8] Verifying Database Security (Bcrypt Storage)...")
    db = TestingSessionLocal()
    user_in_db = db.query(User).filter(User.email == "rohan.sharma@example.com").first()
    assert user_in_db is not None
    assert user_in_db.hashed_password != "StrongPassword123!"
    assert user_in_db.hashed_password.startswith("$2b$")  # Bcrypt signature
    db.close()
    print(f"  -> Plain-text password is NEVER stored.")
    print(f"  -> Secure hash stored in DB: {user_in_db.hashed_password[:20]}...")

    # ---------------------------------------------------------
    # TEST 9: Authorized Admin Creation Process
    # ---------------------------------------------------------
    print("\n[TEST 9] Authorized Administrative Process for Admin Creation...")
    # First, seed initial root admin directly
    db = TestingSessionLocal()
    from app.core.security import hash_password
    root_admin = User(
        full_name="Root Administrator",
        email="root.admin@smarthire.ai",
        hashed_password=hash_password("RootAdmin123!"),
        role="admin",
        account_status="active",
    )
    db.add(root_admin)
    db.commit()
    db.close()

    # Log in as root admin to get token
    login_res = client.post("/api/v1/auth/login", json={"email": "root.admin@smarthire.ai", "password": "RootAdmin123!"})
    assert login_res.status_code == 200
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Now create new admin via authorized endpoint
    new_admin_payload = {
        "full_name": "Operations Admin",
        "email": "ops.admin@smarthire.ai",
        "phone_number": "+91-9988776655",
        "password": "SecureAdminPass123!",
        "confirm_password": "SecureAdminPass123!"
    }
    admin_create_res = client.post("/api/v1/users/admin/create-admin", json=new_admin_payload, headers=admin_headers)
    assert admin_create_res.status_code == 201, f"Failed: {admin_create_res.text}"
    created_admin = admin_create_res.json()["user"]
    assert created_admin["role"] == "admin"
    assert created_admin["email"] == "ops.admin@smarthire.ai"
    print("  -> New Admin created successfully via authorized admin process (HTTP 201).")

    # Unauthenticated / non-admin attempt MUST FAIL
    cand_login_res = client.post("/api/v1/auth/login", json={"email": "rohan.sharma@example.com", "password": "StrongPassword123!"})
    cand_token = cand_login_res.json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}
    unauthorized_res = client.post("/api/v1/users/admin/create-admin", json=new_admin_payload, headers=cand_headers)
    assert unauthorized_res.status_code == 403
    print("  -> Candidate blocked from creating Admin account (HTTP 403 Forbidden).")

    print("\n" + "=" * 65)
    print("   ALL REGISTRATION & SECURITY TESTS PASSED SUCCESSFULLY!    ")
    print("=" * 65)


if __name__ == "__main__":
    run_registration_tests()

