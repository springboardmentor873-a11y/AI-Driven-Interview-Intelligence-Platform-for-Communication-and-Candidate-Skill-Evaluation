from datetime import timedelta
from typing import Annotated

import jwt
import pytest
from fastapi import Depends

from app.auth.dependencies import AuthContext, require_role, require_roles
from app.core.config import get_settings
from app.core.security import create_access_token
from app.main import create_app
from tests.auth.helpers import (
    PING,
    bearer,
    give_role,
    now,
    ping,
    session_id_of,
    set_status_sql,
    take_role,
    update_sessions,
    user_with_token,
)

# --------------------------------------------------------------------------- the 7 required cases


async def test_candidate_can_access_candidate_endpoint(client, session):
    user, token = await user_with_token(client, session, ("candidate",))
    response = await ping(client, "candidate", token)
    assert response.status_code == 200
    assert response.json() == {"area": "candidate", "user_id": str(user.id), "roles": ["candidate"]}


async def test_candidate_cannot_access_recruiter_endpoint(client, session):
    _, token = await user_with_token(client, session, ("candidate",))
    assert (await ping(client, "recruiter", token)).status_code == 403


async def test_candidate_cannot_access_admin_endpoint(client, session):
    _, token = await user_with_token(client, session, ("candidate",))
    assert (await ping(client, "admin", token)).status_code == 403


async def test_recruiter_can_access_recruiter_endpoint(client, session):
    _, token = await user_with_token(client, session, ("recruiter",))
    response = await ping(client, "recruiter", token)
    assert response.status_code == 200 and response.json()["area"] == "recruiter"


async def test_recruiter_cannot_access_admin_endpoint(client, session):
    _, token = await user_with_token(client, session, ("recruiter",))
    assert (await ping(client, "admin", token)).status_code == 403


async def test_admin_can_access_admin_endpoint(client, session):
    _, token = await user_with_token(client, session, ("admin",))
    response = await ping(client, "admin", token)
    assert response.status_code == 200 and response.json()["area"] == "admin"


@pytest.mark.parametrize("area", ["candidate", "recruiter", "admin"])
async def test_unauthenticated_access_is_401(client, area):
    response = await ping(client, area)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"
    assert response.headers["www-authenticate"] == "Bearer"


# --------------------------------------------------------------------------- full role matrix

MATRIX = {
    (): {"candidate": 403, "recruiter": 403, "admin": 403},
    ("candidate",): {"candidate": 200, "recruiter": 403, "admin": 403},
    ("recruiter",): {"candidate": 403, "recruiter": 200, "admin": 403},
    ("admin",): {"candidate": 403, "recruiter": 403, "admin": 200},  # no implicit hierarchy
    ("candidate", "recruiter"): {"candidate": 200, "recruiter": 200, "admin": 403},
    ("candidate", "admin"): {"candidate": 200, "recruiter": 403, "admin": 200},
    ("recruiter", "admin"): {"candidate": 403, "recruiter": 200, "admin": 200},
    ("candidate", "recruiter", "admin"): {"candidate": 200, "recruiter": 200, "admin": 200},
}


@pytest.mark.parametrize("area", ["candidate", "recruiter", "admin"])
@pytest.mark.parametrize("roles", list(MATRIX), ids=lambda r: "+".join(r) or "no-roles")
async def test_role_matrix_including_multiple_roles(client, session, roles, area):
    _, token = await user_with_token(client, session, roles)
    response = await ping(client, area, token)
    assert response.status_code == MATRIX[roles][area]
    if response.status_code == 200:
        assert response.json()["roles"] == sorted(roles)


async def test_forbidden_response_uses_error_envelope_and_does_not_leak_roles(client, session):
    _, token = await user_with_token(client, session, ("candidate",))
    response = await ping(client, "admin", token)
    assert response.json() == {
        "error": {
            "code": "forbidden",
            "message": "You do not have permission to perform this action.",
        }
    }
    assert "www-authenticate" not in response.headers  # 403 is not a challenge


async def test_responses_never_contain_secrets(client, session):
    _, token = await user_with_token(client, session, ("candidate",))
    text = (await ping(client, "candidate", token)).text.lower()
    for forbidden in ("password", "hash", "refresh", "token"):
        assert forbidden not in text


# --------------------------------------------------------------------------- roles come from the DB


async def test_removed_role_loses_access_on_the_next_request(client, session):
    user, token = await user_with_token(client, session, ("candidate", "recruiter"))
    assert (await ping(client, "recruiter", token)).status_code == 200
    await take_role(session, user.id, "recruiter")
    assert (await ping(client, "recruiter", token)).status_code == 403  # same token, no re-login
    assert (await ping(client, "candidate", token)).status_code == 200  # other role unaffected


async def test_newly_granted_role_works_immediately_with_the_same_token(client, session):
    user, token = await user_with_token(client, session, ("candidate",))
    assert (await ping(client, "recruiter", token)).status_code == 403
    await give_role(session, user.id, "recruiter")
    assert (await ping(client, "recruiter", token)).status_code == 200


async def test_role_claims_inside_the_jwt_are_ignored(client, session):
    user, token = await user_with_token(client, session, ("candidate",))
    settings = get_settings()
    claims = {
        "sub": str(user.id),
        "sid": session_id_of(token),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now() - timedelta(minutes=1),
        "exp": now() + timedelta(minutes=5),
        "typ": "access",
        "role": "admin",
        "roles": ["admin"],
        "is_admin": True,
        "scope": "admin",
    }
    # Correctly signed, live session, but claims a role the database does not grant.
    forged = jwt.encode(claims, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    assert (await ping(client, "admin", forged)).status_code == 403
    assert (await ping(client, "candidate", forged)).status_code == 200


async def test_roles_in_headers_or_query_are_ignored(client, session):
    _, token = await user_with_token(client, session, ("candidate",))
    response = await ping(
        client,
        "admin",
        token,
        headers={"X-Role": "admin", "X-User-Role": "admin", "X-Roles": "admin,recruiter"},
        params={"role": "admin", "roles": "admin"},
    )
    assert response.status_code == 403


# --------------------------------------------------------------------------- authentication layer


@pytest.mark.parametrize("area", ["candidate", "recruiter", "admin"])
async def test_suspended_users_are_rejected_on_every_protected_endpoint(client, session, area):
    user, token = await user_with_token(client, session, ("candidate", "recruiter", "admin"))
    assert (await ping(client, area, token)).status_code == 200
    await set_status_sql(session, user.id, "suspended")
    response = await ping(client, area, token)
    assert response.status_code == 401  # even though they still hold the role
    await set_status_sql(session, user.id, "active")
    assert (await ping(client, area, token)).status_code == 200  # reactivation restores access


@pytest.mark.parametrize("area", ["candidate", "recruiter", "admin"])
async def test_revoked_expired_and_garbage_credentials_are_401(client, session, area):
    user, token = await user_with_token(client, session, ("candidate", "recruiter", "admin"))
    assert (await ping(client, area, "not.a.jwt")).status_code == 401
    expired, _ = create_access_token(
        user_id=user.id,
        session_id=session_id_of(token),
        settings=get_settings(),
        now=now() - timedelta(hours=1),
    )
    response = await ping(client, area, expired)
    assert response.status_code == 401 and response.json()["error"]["code"] == "token_expired"
    await update_sessions(session, user.id, revoked_at=now(), revoked_reason="logout")
    assert (await ping(client, area, token)).status_code == 401


async def test_logout_all_removes_access_to_role_endpoints(client, session):
    _, token = await user_with_token(client, session, ("candidate",))
    assert (await client.post("/api/v1/auth/logout-all", headers=bearer(token))).status_code == 204
    assert (await ping(client, "candidate", token)).status_code == 401


# --------------------------------------------------------------------------- the dependency itself


def test_require_roles_rejects_misuse_when_the_route_is_defined():
    with pytest.raises(ValueError):
        require_roles()  # nothing required would mean "everyone"
    for bad in ("superuser", "Admin", "", "candidate "):
        with pytest.raises(ValueError):
            require_role(bad)


def test_require_role_accepts_strings_and_enum_members():
    from app.users.models import RoleName

    assert require_role("admin").__name__ == require_role(RoleName.ADMIN).__name__
    assert require_roles("recruiter", "candidate").__name__ == "require_candidate_or_recruiter"


EITHER = require_roles("candidate", "recruiter")


async def _either_route(ctx: Annotated[AuthContext, Depends(EITHER)]) -> dict[str, bool]:
    return {"ok": isinstance(ctx, AuthContext)}


@pytest.mark.parametrize(
    ("roles", "expected"),
    [
        (("candidate",), 200),
        (("recruiter",), 200),
        (("candidate", "recruiter"), 200),
        (("admin",), 403),
        ((), 403),
    ],
)
async def test_any_of_several_roles(app, client, session, roles, expected):
    # A route written the way a future module would: either role is enough.
    app.add_api_route("/api/v1/test-only/either", _either_route, methods=["GET"])
    _, token = await user_with_token(client, session, roles)
    response = await client.get("/api/v1/test-only/either", headers=bearer(token))
    assert response.status_code == expected


# --------------------------------------------------------------------------- inventory / OpenAPI

PUBLIC = {
    ("GET", "/api/v1/health"),
    ("GET", "/api/v1/health/ready"),
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/google"),
    ("POST", "/api/v1/auth/refresh"),  # authenticated by the refresh cookie, not a bearer token
    ("POST", "/api/v1/auth/logout"),  # idempotent; acts only on the presented cookie
    ("POST", "/api/v1/auth/password/forgot"),
    ("POST", "/api/v1/auth/password/reset"),  # authorised by the one-time token
}


def _operations():
    spec = create_app().openapi()
    for path, ops in spec["paths"].items():
        for method, op in ops.items():
            yield method.upper(), path, op


def test_every_operation_is_explicitly_public_or_requires_credentials():
    operations = {(m, p): op for m, p, op in _operations()}
    unprotected = {key for key, op in operations.items() if "security" not in op}
    assert unprotected == PUBLIC  # a new unauthenticated route fails this test until reviewed


def test_protected_demo_endpoints_are_documented_in_openapi():
    spec = create_app().openapi()
    for area, path in PING.items():
        operation = spec["paths"][path]["get"]
        assert operation["security"], area
        assert {"401", "403"} <= set(operation["responses"]), area
    admin_ops = [(m, p) for m, p, _ in _operations() if p.startswith("/api/v1/admin/")]
    assert len(admin_ops) >= 6


async def test_swagger_ui_is_served(client):
    assert (await client.get("/docs")).status_code == 200


def _fill(path: str) -> str:
    return path.replace("{user_id}", "00000000-0000-0000-0000-000000000001").replace(
        "{role}", "candidate"
    )


ADMIN_OPERATIONS = [(m, p) for m, p, _ in _operations() if p.startswith("/api/v1/admin/")]


@pytest.mark.parametrize(("method", "path"), ADMIN_OPERATIONS, ids=lambda v: v)
async def test_every_admin_operation_denies_non_admins(client, session, method, path):
    _, candidate = await user_with_token(client, session, ("candidate",), "c@example.com")
    _, recruiter = await user_with_token(client, session, ("recruiter",), "r@example.com")
    url, body = _fill(path), ({"json": {}} if method in {"POST", "PATCH"} else {})
    assert (await client.request(method, url, **body)).status_code == 401
    assert (await client.request(method, url, headers=bearer(candidate), **body)).status_code == 403
    assert (await client.request(method, url, headers=bearer(recruiter), **body)).status_code == 403
