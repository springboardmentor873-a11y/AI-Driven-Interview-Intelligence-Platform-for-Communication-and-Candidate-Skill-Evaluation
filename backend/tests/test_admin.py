import asyncio
import logging
import uuid
from dataclasses import dataclass

import pytest
from sqlalchemy import delete, select, text

from app.admin import service as admin_service
from app.admin.repository import ADMIN_CHANGE_LOCK_KEY
from app.auth.dependencies import AuthContext
from app.core.exceptions import LastAdminError
from app.users.models import RoleName, User, user_roles
from tests.auth.helpers import (
    ADMIN_EMAIL,
    EMAIL,
    PASSWORD,
    bearer,
    create_user,
    login,
    login_ok,
    ping,
    refresh,
    role_names,
    sessions_of,
    take_role,
    user_with_token,
)
from tests.db.factories import get_role

USERS = "/api/v1/admin/users"


@dataclass
class Actor:
    user: User
    token: str
    refresh: str


@pytest.fixture
async def admin(client, session) -> Actor:
    user = await create_user(session, email=ADMIN_EMAIL, roles=("admin",))
    access, refresh_token = await login_ok(client, ADMIN_EMAIL)
    return Actor(user, access, refresh_token)


async def _call(client, method, path, token, **kwargs):
    return await client.request(method, path, headers=bearer(token), **kwargs)


def _roles_url(user_id, role=None) -> str:
    return f"{USERS}/{user_id}/roles" + (f"/{role}" if role else "")


# --------------------------------------------------------------------------- privilege escalation


async def test_candidate_cannot_promote_themselves(client, session):
    user, token = await user_with_token(client, session, ("candidate",))
    for role in ("recruiter", "admin"):
        response = await _call(client, "POST", _roles_url(user.id), token, json={"role": role})
        assert response.status_code == 403
    assert await role_names(session, user.id) == ["candidate"]
    assert (await ping(client, "admin", token)).status_code == 403


async def test_recruiter_cannot_manage_users_or_roles(client, session):
    user, token = await user_with_token(client, session, ("recruiter",))
    other = await create_user(session, email="other@example.com")
    assert (await _call(client, "GET", USERS, token)).status_code == 403
    r = await _call(client, "POST", _roles_url(other.id), token, json={"role": "admin"})
    assert r.status_code == 403
    r = await _call(
        client, "PATCH", f"{USERS}/{other.id}/status", token, json={"status": "suspended"}
    )
    assert r.status_code == 403
    assert await role_names(session, other.id) == ["candidate"]


# --------------------------------------------------------------------------- listing / reading


async def test_list_users_pagination_ordering_and_totals(client, session, admin):
    for i in range(5):
        await create_user(session, email=f"user{i}@example.com")
    first = await _call(client, "GET", USERS, admin.token, params={"limit": 2})
    assert first.status_code == 200
    body = first.json()
    assert (body["total"], body["limit"], body["offset"]) == (6, 2, 0)
    assert [u["email"] for u in body["items"]] == ["user4@example.com", "user3@example.com"]
    last = await _call(client, "GET", USERS, admin.token, params={"limit": 2, "offset": 4})
    assert [u["email"] for u in last.json()["items"]] == ["user0@example.com", ADMIN_EMAIL]
    beyond = await _call(client, "GET", USERS, admin.token, params={"offset": 50})
    assert beyond.json()["items"] == [] and beyond.json()["total"] == 6


async def test_list_users_filters(client, session, admin):
    await create_user(session, email="rec@example.com", roles=("recruiter",))
    await create_user(session, email="gone@example.com", status="suspended")
    await create_user(session, email="Plain@example.com".lower())

    def emails(response):
        return sorted(u["email"] for u in response.json()["items"])

    r = await _call(client, "GET", USERS, admin.token, params={"role": "recruiter"})
    assert emails(r) == ["rec@example.com"]
    r = await _call(client, "GET", USERS, admin.token, params={"status": "suspended"})
    assert emails(r) == ["gone@example.com"]
    r = await _call(client, "GET", USERS, admin.token, params={"q": "PLAIN"})
    assert emails(r) == ["plain@example.com"]
    r = await _call(client, "GET", USERS, admin.token, params={"q": "%"})  # literal, not a wildcard
    assert r.json()["total"] == 0
    r = await _call(client, "GET", USERS, admin.token, params={"q": "_"})
    assert r.json()["total"] == 0


@pytest.mark.parametrize(
    "params",
    [{"limit": 0}, {"limit": 101}, {"offset": -1}, {"role": "superuser"}, {"status": "deleted"}],
)
async def test_list_users_rejects_invalid_parameters(client, admin, params):
    assert (await _call(client, "GET", USERS, admin.token, params=params)).status_code == 422


async def test_user_representations_never_expose_secrets(client, session, admin):
    await login_ok(client, ADMIN_EMAIL)  # creates an extra refresh session
    text_ = (await _call(client, "GET", USERS, admin.token)).text.lower()
    for forbidden in ("password", "hash", "argon2", "refresh", "token_", "session"):
        assert forbidden not in text_


async def test_get_user(client, session, admin):
    user = await create_user(session, email="x@example.com", roles=("candidate", "recruiter"))
    response = await _call(client, "GET", f"{USERS}/{user.id}", admin.token)
    assert response.status_code == 200
    assert response.json()["roles"] == ["candidate", "recruiter"]
    missing = await _call(client, "GET", f"{USERS}/{uuid.uuid4()}", admin.token)
    assert missing.status_code == 404 and missing.json()["error"]["code"] == "not_found"
    assert (await _call(client, "GET", f"{USERS}/not-a-uuid", admin.token)).status_code == 422


# --------------------------------------------------------------------------- granting roles


async def test_admin_can_promote_a_candidate_to_recruiter(client, session, admin):
    user, token = await user_with_token(client, session, ("candidate",), "cand@example.com")
    assert (await ping(client, "recruiter", token)).status_code == 403

    response = await _call(
        client, "POST", _roles_url(user.id), admin.token, json={"role": "recruiter"}
    )
    assert response.status_code == 200
    assert response.json()["roles"] == ["candidate", "recruiter"]  # existing role kept
    assert (await ping(client, "recruiter", token)).status_code == 200  # same token, immediately

    row = (
        await session.execute(
            select(user_roles).where(
                user_roles.c.user_id == user.id,
                user_roles.c.role_id == (await get_role(session, "recruiter")).id,
            )
        )
    ).one()
    assert row.assigned_by == admin.user.id and row.assigned_at is not None


async def test_grant_admin_and_multiple_roles(client, session, admin):
    user, token = await user_with_token(client, session, ("candidate",), "cand@example.com")
    for role in ("recruiter", "admin"):
        assert (
            await _call(client, "POST", _roles_url(user.id), admin.token, json={"role": role})
        ).status_code == 200
    assert await role_names(session, user.id) == ["admin", "candidate", "recruiter"]
    for area in ("candidate", "recruiter", "admin"):
        assert (await ping(client, area, token)).status_code == 200


async def test_grant_errors(client, session, admin):
    user = await create_user(session, email="cand@example.com")
    ok = await _call(client, "POST", _roles_url(user.id), admin.token, json={"role": "recruiter"})
    assert ok.status_code == 200
    dup = await _call(client, "POST", _roles_url(user.id), admin.token, json={"role": "recruiter"})
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "role_already_assigned"
    unknown = await _call(
        client, "POST", _roles_url(uuid.uuid4()), admin.token, json={"role": "recruiter"}
    )
    assert unknown.status_code == 404
    for body in ({"role": "superuser"}, {"role": "Admin"}, {}, {"role": "admin", "extra": 1}):
        r = await _call(client, "POST", _roles_url(user.id), admin.token, json=body)
        assert r.status_code == 422, body
    assert await role_names(session, user.id) == ["candidate", "recruiter"]


async def test_grant_does_not_touch_other_users(client, session, admin):
    a = await create_user(session, email="a@example.com")
    b = await create_user(session, email="b@example.com")
    await _call(client, "POST", _roles_url(a.id), admin.token, json={"role": "recruiter"})
    assert await role_names(session, b.id) == ["candidate"]


# --------------------------------------------------------------------------- revoking roles


async def test_revoked_role_takes_effect_on_the_next_request(client, session, admin):
    user, token = await user_with_token(
        client, session, ("candidate", "recruiter"), "rec@example.com"
    )
    assert (await ping(client, "recruiter", token)).status_code == 200
    response = await _call(client, "DELETE", _roles_url(user.id, "recruiter"), admin.token)
    assert response.status_code == 200 and response.json()["roles"] == ["candidate"]
    assert (await ping(client, "recruiter", token)).status_code == 403
    assert (await ping(client, "candidate", token)).status_code == 200


async def test_revoke_errors(client, session, admin):
    user = await create_user(session, email="cand@example.com")
    r = await _call(client, "DELETE", _roles_url(user.id, "recruiter"), admin.token)
    assert r.status_code == 404 and r.json()["error"]["code"] == "role_not_assigned"
    assert (
        await _call(client, "DELETE", _roles_url(uuid.uuid4(), "recruiter"), admin.token)
    ).status_code == 404
    assert (
        await _call(client, "DELETE", _roles_url(user.id, "superuser"), admin.token)
    ).status_code == 422


async def test_admin_cannot_remove_their_own_admin_role(client, session, admin):
    other = await create_user(session, email="admin2@example.com", roles=("admin",))
    assert other  # a second admin exists, so only the self-protection rule applies
    r = await _call(client, "DELETE", _roles_url(admin.user.id, "admin"), admin.token)
    assert r.status_code == 400 and r.json()["error"]["code"] == "cannot_modify_self"
    assert (await ping(client, "admin", admin.token)).status_code == 200


async def test_one_admin_can_demote_another(client, session, admin):
    other, other_token = await user_with_token(client, session, ("admin",), "admin2@example.com")
    r = await _call(client, "DELETE", _roles_url(other.id, "admin"), admin.token)
    assert r.status_code == 200
    assert (await ping(client, "admin", other_token)).status_code == 403
    assert (await ping(client, "admin", admin.token)).status_code == 200


async def test_suspended_admin_can_be_demoted(client, session, admin):
    other = await create_user(
        session, email="admin2@example.com", roles=("admin",), status="suspended"
    )
    r = await _call(client, "DELETE", _roles_url(other.id, "admin"), admin.token)
    assert r.status_code == 200 and r.json()["roles"] == []


def _stale_actor(user: User) -> AuthContext:
    """An admin whose request was authorised moments ago, before another change removed them."""
    return AuthContext(user=user, session_id=uuid.uuid4())


async def test_last_active_admin_cannot_be_demoted(session, client):
    only = await create_user(session, email="only@example.com", roles=("admin",))
    ex_admin = await create_user(session, email="ex@example.com", roles=("admin",))
    only_id = only.id  # rollback() below expires loaded objects
    stale = _stale_actor(ex_admin)
    await take_role(session, ex_admin.id, "admin")  # the actor lost admin after being authorised
    with pytest.raises(LastAdminError):
        await admin_service.revoke_role(session, stale, only_id, RoleName.ADMIN)
    await session.rollback()
    assert await role_names(session, only_id) == ["admin"]


async def test_last_active_admin_cannot_be_suspended(session, client):
    only = await create_user(session, email="only@example.com", roles=("admin",))
    ex_admin = await create_user(session, email="ex@example.com", roles=("admin",))
    stale = _stale_actor(ex_admin)
    await take_role(session, ex_admin.id, "admin")
    with pytest.raises(LastAdminError):
        await admin_service.set_status(session, stale, only.id, admin_service.UserStatus.SUSPENDED)
    await session.rollback()
    await session.refresh(only)
    assert only.status == "active"


async def test_admin_removal_waits_for_the_admin_lock_and_recounts(client, session, engine, admin):
    """Deterministic proof of the advisory lock (the double-demotion race).

    While another transaction holds the lock, a demotion request must wait. When that
    transaction removes the acting admin's own role and commits, the waiting request must
    re-count and refuse. Without the lock it would finish at once and leave zero admins.
    """
    other = await create_user(session, email="admin2@example.com", roles=("admin",))
    admin_role_id = (await get_role(session, "admin")).id
    async with engine.connect() as holder:
        await holder.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": ADMIN_CHANGE_LOCK_KEY})
        task = asyncio.create_task(
            _call(client, "DELETE", _roles_url(other.id, "admin"), admin.token)
        )
        await asyncio.sleep(0.5)
        assert not task.done()  # blocked behind the lock
        await holder.execute(
            delete(user_roles).where(
                user_roles.c.user_id == admin.user.id, user_roles.c.role_id == admin_role_id
            )
        )
        await holder.commit()
        response = await asyncio.wait_for(task, timeout=5)
    assert response.status_code == 400 and response.json()["error"]["code"] == "last_admin"
    assert await role_names(session, other.id) == ["admin"]


# --------------------------------------------------------------------------- suspension


async def test_suspending_a_user_ends_all_their_sessions_immediately(client, session, admin):
    user, token = await user_with_token(client, session, ("candidate",), "cand@example.com")
    _, other_refresh = await login_ok(client, "cand@example.com")

    r = await _call(
        client, "PATCH", f"{USERS}/{user.id}/status", admin.token, json={"status": "suspended"}
    )
    assert r.status_code == 200 and r.json()["status"] == "suspended"

    assert (await ping(client, "candidate", token)).status_code == 401
    assert (await refresh(client, other_refresh)).status_code == 401
    assert all(s.revoked_reason == "admin_suspended" for s in await sessions_of(session, user.id))
    blocked = await login(client, "cand@example.com", PASSWORD)
    assert blocked.status_code == 403 and blocked.json()["error"]["code"] == "account_suspended"


async def test_reactivated_user_can_log_in_again(client, session, admin):
    user = await create_user(session, email="cand@example.com", status="suspended")
    r = await _call(
        client, "PATCH", f"{USERS}/{user.id}/status", admin.token, json={"status": "active"}
    )
    assert r.status_code == 200 and r.json()["status"] == "active"
    assert (await login(client, "cand@example.com", PASSWORD)).status_code == 200


async def test_status_update_is_idempotent_and_validated(client, session, admin):
    user = await create_user(session, email="cand@example.com")
    for _ in range(2):
        r = await _call(
            client, "PATCH", f"{USERS}/{user.id}/status", admin.token, json={"status": "active"}
        )
        assert r.status_code == 200
    for body in ({"status": "deleted"}, {"status": "ACTIVE"}, {}, {"status": "active", "x": 1}):
        r = await _call(client, "PATCH", f"{USERS}/{user.id}/status", admin.token, json=body)
        assert r.status_code == 422, body
    unknown = await _call(
        client, "PATCH", f"{USERS}/{uuid.uuid4()}/status", admin.token, json={"status": "suspended"}
    )
    assert unknown.status_code == 404


async def test_admin_cannot_suspend_themselves(client, admin):
    r = await _call(
        client,
        "PATCH",
        f"{USERS}/{admin.user.id}/status",
        admin.token,
        json={"status": "suspended"},
    )
    assert r.status_code == 400 and r.json()["error"]["code"] == "cannot_modify_self"
    assert (await ping(client, "admin", admin.token)).status_code == 200


async def test_suspending_another_admin_removes_their_admin_access(client, session, admin):
    other, other_token = await user_with_token(client, session, ("admin",), "admin2@example.com")
    r = await _call(
        client, "PATCH", f"{USERS}/{other.id}/status", admin.token, json={"status": "suspended"}
    )
    assert r.status_code == 200
    assert (await ping(client, "admin", other_token)).status_code == 401


async def test_role_changes_are_audit_logged_without_personal_data(client, session, admin, caplog):
    user = await create_user(session, email="cand@example.com")
    with caplog.at_level(logging.INFO, logger="app.admin.service"):
        await _call(client, "POST", _roles_url(user.id), admin.token, json={"role": "recruiter"})
    assert f"target={user.id}" in caplog.text and f"actor={admin.user.id}" in caplog.text
    assert "cand@example.com" not in caplog.text and PASSWORD not in caplog.text
    assert EMAIL not in caplog.text
