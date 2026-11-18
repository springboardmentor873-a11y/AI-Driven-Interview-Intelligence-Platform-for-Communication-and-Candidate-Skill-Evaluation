import pytest
from django.contrib.auth import get_user_model

from .conftest import PASSWORD

LOGIN = "/api/auth/login/"
GOOGLE = "/api/auth/google/"
ROLES = ["candidate", "recruiter", "admin"]
User = get_user_model()


@pytest.fixture
def accounts(make_user):
    return {role: make_user(f"{role}@example.com", role=role) for role in ROLES}


def sign_in(api, role_account, as_role):
    body = {"email": f"{role_account}@example.com", "password": PASSWORD}
    if as_role is not None:
        body["role"] = as_role
    return api.post(LOGIN, body, format="json")


@pytest.mark.parametrize("account", ROLES)
@pytest.mark.parametrize("login_as", ROLES)
def test_each_login_only_accepts_its_own_role(api, accounts, account, login_as):
    res = sign_in(api, account, login_as)
    if account == login_as:
        assert res.status_code == 200
        assert res.data["user"]["role"] == account and res.data["access"]
    else:
        assert res.status_code == 403
        assert "access" not in res.data
        assert account.capitalize() in res.data["detail"]


def test_login_without_role_still_works(api, accounts):
    assert sign_in(api, "recruiter", None).status_code == 200


def test_wrong_password_is_not_reported_as_wrong_role(api, accounts):
    res = api.post(LOGIN, {"email": "candidate@example.com", "password": "wrong", "role": "admin"}, format="json")
    assert res.status_code == 401  # nothing about the account's role is revealed


def test_unknown_role_is_rejected(api, accounts):
    assert sign_in(api, "candidate", "superuser").status_code == 400


def test_superuser_counts_as_admin(api, db):
    User.objects.create_superuser(username="root", email="root@example.com", password=PASSWORD)
    body = {"email": "root@example.com", "password": PASSWORD}
    assert api.post(LOGIN, {**body, "role": "admin"}, format="json").status_code == 200
    assert api.post(LOGIN, {**body, "role": "candidate"}, format="json").status_code == 403


@pytest.fixture
def google_as(settings, monkeypatch):
    settings.GOOGLE_CLIENT_ID = "test-client-id"

    def _set(email):
        monkeypatch.setattr(
            "apps.accounts.views.google_id_token.verify_oauth2_token",
            lambda token, request, audience: {"email": email, "email_verified": True, "given_name": "G"},
        )
    return _set


def test_google_existing_account_must_match_role(api, accounts, google_as):
    google_as("recruiter@example.com")
    assert api.post(GOOGLE, {"id_token": "x", "role": "candidate"}, format="json").status_code == 403
    res = api.post(GOOGLE, {"id_token": "x", "role": "recruiter"}, format="json")
    assert res.status_code == 200 and res.data["user"]["role"] == "recruiter"


def test_google_new_email_can_sign_in_as_candidate(api, db, google_as):
    google_as("new@example.com")
    res = api.post(GOOGLE, {"id_token": "x", "role": "candidate"}, format="json")
    assert res.status_code == 200 and res.data["user"]["role"] == "candidate"


@pytest.mark.parametrize("role", ["recruiter", "admin"])
def test_google_never_creates_recruiter_or_admin(api, db, google_as, role):
    google_as("new@example.com")
    res = api.post(GOOGLE, {"id_token": "x", "role": role}, format="json")
    assert res.status_code == 403 and role.capitalize() in res.data["detail"]
    assert not User.objects.filter(email="new@example.com").exists()


def test_google_unknown_role_is_rejected(api, db, google_as):
    google_as("new@example.com")
    assert api.post(GOOGLE, {"id_token": "x", "role": "root"}, format="json").status_code == 400
