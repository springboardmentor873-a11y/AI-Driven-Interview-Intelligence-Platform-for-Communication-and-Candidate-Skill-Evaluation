import uuid

import pytest
from sqlalchemy import func, select

from app.main import create_app
from app.users.models import User, user_roles
from tests.auth.helpers import PASSWORD, bearer, login_ok, ping, role_names

URL = "/api/v1/auth/register"
BASE = {"email": "new@example.com", "password": PASSWORD, "full_name": "New User"}

PRIVILEGED_FIELDS = [
    {"role": "admin"},
    {"role": "recruiter"},
    {"Role": "admin"},
    {"roles": ["admin"]},
    {"roles": ["recruiter", "admin"]},
    {"role_id": str(uuid.uuid4())},
    {"role_ids": [str(uuid.uuid4())]},
    {"is_admin": True},
    {"is_superuser": True},
    {"scope": "admin"},
    {"permissions": ["*"]},
    {"user_roles": [{"role": "admin"}]},
    {"status": "active"},
    {"email_verified": True},
    {"id": str(uuid.uuid4())},
]


@pytest.mark.parametrize(
    "extra",
    PRIVILEGED_FIELDS,
    ids=[f"{i}-{next(iter(extra))}" for i, extra in enumerate(PRIVILEGED_FIELDS)],
)
async def test_privileged_fields_are_rejected_and_nothing_is_created(client, session, extra):
    response = await client.post(URL, json={**BASE, **extra})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert (await session.execute(select(func.count()).select_from(User))).scalar_one() == 0


async def test_registration_always_creates_exactly_a_candidate(client, session):
    response = await client.post(URL, json=BASE)
    assert response.status_code == 201
    assert response.json()["roles"] == ["candidate"]
    user = (await session.execute(select(User))).scalar_one()
    assert await role_names(session, user.id) == ["candidate"]
    assert (await session.execute(select(func.count()).select_from(user_roles))).scalar_one() == 1


async def test_roles_in_headers_or_query_string_are_ignored(client, session):
    response = await client.post(
        URL,
        json=BASE,
        params={"role": "admin", "roles": "admin"},
        headers={"X-Role": "admin", "X-User-Role": "admin", "X-Roles": "admin,recruiter"},
    )
    assert response.status_code == 201
    assert response.json()["roles"] == ["candidate"]
    user = (await session.execute(select(User))).scalar_one()
    assert await role_names(session, user.id) == ["candidate"]


async def test_a_self_registered_user_cannot_reach_privileged_endpoints(client):
    await client.post(URL, json={**BASE, "full_name": "New User"})
    access, _ = await login_ok(client, BASE["email"], PASSWORD)
    assert (await ping(client, "candidate", access)).status_code == 200
    assert (await ping(client, "recruiter", access)).status_code == 403
    assert (await ping(client, "admin", access)).status_code == 403
    users = await client.get("/api/v1/admin/users", headers=bearer(access))
    assert users.status_code == 403


def test_no_public_or_self_service_route_can_change_roles_or_status():
    spec = create_app().openapi()
    # There is no profile-update endpoint at all, so nothing like PATCH /users/me exists.
    assert set(spec["paths"]["/api/v1/users/me"]) == {"get"}
    for path, operations in spec["paths"].items():
        for method, operation in operations.items():
            if method in {"post", "put", "patch", "delete"} and (
                "role" in path or "status" in path
            ):
                assert path.startswith("/api/v1/admin/"), (method, path)
                assert operation["security"], (method, path)
