from tests.conftest import PASSWORD

REGISTER = "/api/auth/register/"
LOGIN = "/api/auth/login/"
REFRESH = "/api/auth/refresh/"
LOGOUT = "/api/auth/logout/"
ME = "/api/auth/me/"


def test_health(api):
    assert api.get("/api/health/").status_code == 200


def test_register_creates_candidate(api):
    res = api.post(
        REGISTER,
        {"email": "New@Example.com", "password": PASSWORD, "first_name": "New"},
        format="json",
    )
    assert res.status_code == 201
    assert res.data["user"]["role"] == "candidate"
    assert res.data["user"]["email"] == "new@example.com"
    assert "access" in res.data and "refresh" in res.data


def test_register_cannot_choose_admin_role(api):
    res = api.post(
        REGISTER,
        {"email": "a@example.com", "password": PASSWORD, "first_name": "A", "role": "admin"},
        format="json",
    )
    assert res.status_code == 400
    assert "role" in res.data


def test_register_duplicate_email(api, make_user):
    make_user("dup@example.com")
    res = api.post(
        REGISTER,
        {"email": "dup@example.com", "password": PASSWORD, "first_name": "D"},
        format="json",
    )
    assert res.status_code == 400
    assert "email" in res.data


def test_register_weak_password(api):
    res = api.post(
        REGISTER,
        {"email": "weak@example.com", "password": "123", "first_name": "W"},
        format="json",
    )
    assert res.status_code == 400
    assert "password" in res.data


def test_login_with_email(api, make_user):
    make_user("a@example.com")
    res = api.post(LOGIN, {"email": "a@example.com", "password": PASSWORD}, format="json")
    assert res.status_code == 200
    assert {"access", "refresh", "user"} <= set(res.data)
    assert res.data["user"]["role"] == "candidate"


def test_login_wrong_password(api, make_user):
    make_user("a@example.com")
    res = api.post(LOGIN, {"email": "a@example.com", "password": "wrong"}, format="json")
    assert res.status_code == 401


def test_me_requires_login(api):
    assert api.get(ME).status_code == 401


def test_me_returns_current_user(api, make_user):
    make_user("a@example.com")
    tokens = api.post(LOGIN, {"email": "a@example.com", "password": PASSWORD}, format="json").data
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    res = api.get(ME)
    assert res.status_code == 200
    assert res.data["email"] == "a@example.com"


def test_refresh_rotates_token(api, make_user):
    make_user("a@example.com")
    tokens = api.post(LOGIN, {"email": "a@example.com", "password": PASSWORD}, format="json").data
    res = api.post(REFRESH, {"refresh": tokens["refresh"]}, format="json")
    assert res.status_code == 200
    assert res.data["refresh"] != tokens["refresh"]


def test_logout_blacklists_refresh_token(api, make_user):
    make_user("a@example.com")
    tokens = api.post(LOGIN, {"email": "a@example.com", "password": PASSWORD}, format="json").data
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    assert api.post(LOGOUT, {"refresh": tokens["refresh"]}, format="json").status_code == 204
    api.credentials()
    assert api.post(REFRESH, {"refresh": tokens["refresh"]}, format="json").status_code == 401


def test_google_login_creates_candidate(api, settings, monkeypatch):
    settings.GOOGLE_CLIENT_ID = "test-client-id"
    monkeypatch.setattr(
        "apps.accounts.views.google_id_token.verify_oauth2_token",
        lambda token, request, audience: {
            "email": "g@example.com",
            "email_verified": True,
            "given_name": "G",
            "family_name": "User",
        },
    )
    res = api.post("/api/auth/google/", {"id_token": "anything"}, format="json")
    assert res.status_code == 200
    assert res.data["user"]["email"] == "g@example.com"
    assert res.data["user"]["role"] == "candidate"


def test_google_login_rejects_bad_token(api, settings, monkeypatch):
    settings.GOOGLE_CLIENT_ID = "test-client-id"

    def bad(token, request, audience):
        raise ValueError("bad token")

    monkeypatch.setattr("apps.accounts.views.google_id_token.verify_oauth2_token", bad)
    res = api.post("/api/auth/google/", {"id_token": "fake"}, format="json")
    assert res.status_code == 401