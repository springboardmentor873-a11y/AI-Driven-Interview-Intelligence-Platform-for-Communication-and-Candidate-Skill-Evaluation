from tests.conftest import PASSWORD

USERS = "/api/auth/users/"


def test_candidate_cannot_list_users(auth_client, make_user):
    client = auth_client(make_user("c@example.com"))
    assert client.get(USERS).status_code == 403


def test_recruiter_cannot_list_users(auth_client, make_user):
    client = auth_client(make_user("r@example.com", role="recruiter"))
    assert client.get(USERS).status_code == 403


def test_admin_can_list_and_change_role(auth_client, make_user):
    admin = make_user("admin@example.com", role="admin")
    candidate = make_user("c@example.com")
    client = auth_client(admin)

    res = client.get(USERS)
    assert res.status_code == 200
    assert len(res.data) == 2

    res = client.patch(f"{USERS}{candidate.id}/", {"role": "recruiter"}, format="json")
    assert res.status_code == 200
    candidate.refresh_from_db()
    assert candidate.role == "recruiter"


def test_admin_cannot_demote_self(auth_client, make_user):
    admin = make_user("admin@example.com", role="admin")
    client = auth_client(admin)
    res = client.patch(f"{USERS}{admin.id}/", {"role": "candidate"}, format="json")
    assert res.status_code == 400
    admin.refresh_from_db()
    assert admin.role == "admin"


def test_update_profile(auth_client, make_user):
    client = auth_client(make_user("c@example.com"))
    res = client.patch("/api/auth/me/", {"first_name": "Tester"}, format="json")
    assert res.status_code == 200
    assert res.data["first_name"] == "Tester"


def test_change_password(api, auth_client, make_user):
    client = auth_client(make_user("c@example.com"))
    res = client.post(
        "/api/auth/change-password/",
        {"old_password": PASSWORD, "new_password": "An0ther!Pass456"},
        format="json",
    )
    assert res.status_code == 200
    login = api.post(
        "/api/auth/login/",
        {"email": "c@example.com", "password": "An0ther!Pass456"},
        format="json",
    )
    assert login.status_code == 200


def test_change_password_wrong_old_password(auth_client, make_user):
    client = auth_client(make_user("c@example.com"))
    res = client.post(
        "/api/auth/change-password/",
        {"old_password": "nope", "new_password": "An0ther!Pass456"},
        format="json",
    )
    assert res.status_code == 400