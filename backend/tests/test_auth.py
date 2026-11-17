def test_register_and_me(client, candidate):
    r = client.get("/api/auth/me", headers=candidate["h"])
    assert r.status_code == 200 and r.json()["role"] == "candidate"


def test_duplicate_email_rejected(client, candidate):
    r = client.post("/api/auth/register", json={"full_name": "Dup User", "email": candidate["email"],
                                                 "password": "password123"})
    assert r.status_code == 409


def test_short_password_rejected(client):
    r = client.post("/api/auth/register", json={"full_name": "Short Pw", "email": "a@b.com", "password": "123"})
    assert r.status_code == 422


def test_cannot_self_register_as_admin(client):
    r = client.post("/api/auth/register", json={"full_name": "Evil User", "email": "evil@b.com",
                                                 "password": "password123", "role": "admin"})
    assert r.status_code == 422


def test_login_success_and_wrong_password(client, candidate):
    ok = client.post("/api/auth/login", json={"email": candidate["email"], "password": candidate["password"]})
    assert ok.status_code == 200 and "access_token" in ok.json()
    bad = client.post("/api/auth/login", json={"email": candidate["email"], "password": "wrongpass1"})
    assert bad.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_refresh_flow_and_token_type_separation(client, candidate):
    t = candidate["tokens"]
    r = client.post("/api/auth/refresh", json={"refresh_token": t["refresh_token"]})
    assert r.status_code == 200
    # a refresh token must not work as an access token
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {t['refresh_token']}"}).status_code == 401
    # an access token must not work as a refresh token
    assert client.post("/api/auth/refresh", json={"refresh_token": t["access_token"]}).status_code == 401


def test_rbac(client, candidate, recruiter, admin):
    assert client.get("/api/users", headers=candidate["h"]).status_code == 403
    assert client.get("/api/users", headers=recruiter["h"]).status_code == 403
    assert client.get("/api/users", headers=admin["h"]).status_code == 200
    assert client.get("/api/users/candidates", headers=candidate["h"]).status_code == 403
    assert client.get("/api/users/candidates", headers=recruiter["h"]).status_code == 200


def test_admin_can_disable_user(client, candidate, admin):
    r = client.patch(f"/api/users/{candidate['id']}/active", params={"is_active": False}, headers=admin["h"])
    assert r.status_code == 200 and r.json()["is_active"] is False
    login = client.post("/api/auth/login", json={"email": candidate["email"], "password": candidate["password"]})
    assert login.status_code == 403
    assert client.get("/api/auth/me", headers=candidate["h"]).status_code == 401  # old token dies too


def test_update_profile_and_change_password(client, candidate):
    r = client.patch("/api/auth/me", json={"full_name": "New Name"}, headers=candidate["h"])
    assert r.status_code == 200 and r.json()["full_name"] == "New Name"
    bad = client.post("/api/auth/change-password", headers=candidate["h"],
                      json={"current_password": "nope12345", "new_password": "brandnew123"})
    assert bad.status_code == 400
    ok = client.post("/api/auth/change-password", headers=candidate["h"],
                     json={"current_password": candidate["password"], "new_password": "brandnew123"})
    assert ok.status_code == 204
    assert client.post("/api/auth/login", json={"email": candidate["email"], "password": "brandnew123"}).status_code == 200


def test_google_disabled_when_not_configured(client):
    assert client.get("/api/auth/providers").json() == {"google": False}
    assert client.get("/api/auth/google/login", follow_redirects=False).status_code == 501
