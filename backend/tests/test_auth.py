from app.models.user import UserRole

def test_register_and_login_candidate(client):
    # 1. Register candidate
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test_candidate@smarthire.ai",
            "password": "Password123!",
            "full_name": "Test Candidate",
            "role": "candidate",
            "phone": "1234567890",
            "organization": "Test University"
        }
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test_candidate@smarthire.ai"
    assert data["user"]["role"] == "candidate"

    # 2. Duplicate registration should fail
    dup_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test_candidate@smarthire.ai",
            "password": "Password123!",
            "full_name": "Duplicate User",
            "role": "candidate"
        }
    )
    assert dup_response.status_code == 400

    # 3. Login with correct credentials
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test_candidate@smarthire.ai",
            "password": "Password123!"
        }
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    token = login_data["access_token"]
    assert token

    # 4. Access protected /me route
    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test_candidate@smarthire.ai"

def test_invalid_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@smarthire.ai",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401

def test_role_based_access_control(client):
    # Register candidate
    cand_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "rbac_cand@smarthire.ai",
            "password": "Password123!",
            "full_name": "RBAC Candidate",
            "role": "candidate"
        }
    )
    cand_token = cand_resp.json()["access_token"]

    # Register recruiter
    rec_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "rbac_recruiter@smarthire.ai",
            "password": "Password123!",
            "full_name": "RBAC Recruiter",
            "role": "recruiter"
        }
    )
    rec_token = rec_resp.json()["access_token"]

    # Candidate should NOT be able to access Admin metrics
    cand_metrics = client.get(
        "/api/v1/admin/metrics",
        headers={"Authorization": f"Bearer {cand_token}"}
    )
    assert cand_metrics.status_code == 403

    # Candidate should NOT be able to create an interview template
    cand_create_tpl = client.post(
        "/api/v1/interviews/templates",
        headers={"Authorization": f"Bearer {cand_token}"},
        json={
            "title": "Unauthorized Template",
            "domain": "Software Engineering"
        }
    )
    assert cand_create_tpl.status_code == 403

    # Recruiter CAN create interview template
    rec_create_tpl = client.post(
        "/api/v1/interviews/templates",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "title": "Backend Engineering Screening",
            "description": "Standard screening for Python/FastAPI developers",
            "interview_type": "technical",
            "difficulty": "mid",
            "domain": "Software Engineering",
            "duration_minutes": 45,
            "questions": [
                {"question": "Explain FastAPI dependency injection.", "expected_keywords": ["Depends", "yield"]}
            ]
        }
    )
    assert rec_create_tpl.status_code == 201
    assert rec_create_tpl.json()["title"] == "Backend Engineering Screening"
