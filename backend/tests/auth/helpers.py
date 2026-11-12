from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

import jwt
from sqlalchemy import delete, select, update

from app.auth.models import RefreshSession
from app.core.config import get_settings
from app.core.security import hash_password
from app.users.models import Role, User, user_roles
from tests.db.factories import get_role

PASSWORD = "correct-horse-battery-1"
NEW_PASSWORD = "another-strong-passphrase-2"
EMAIL = "alice@example.com"


class Mailbox:
    """Stands in for an email provider and records what would have been sent."""

    def __init__(self):
        self.sent: list[tuple[str, str]] = []

    async def send_password_reset(self, to_email: str, reset_url: str) -> None:
        self.sent.append((to_email, reset_url))

    def token(self, index: int = -1) -> str:
        return parse_qs(urlparse(self.sent[index][1]).query)["token"][0]


async def create_user(
    session,
    email=EMAIL,
    password=PASSWORD,
    *,
    status="active",
    roles=("candidate",),
    **kwargs,
) -> User:
    password_hash = kwargs.pop("password_hash", None) or await hash_password(password)
    user = User(
        email=email,
        full_name="Alice Test",
        status=status,
        password_hash=password_hash,
        **kwargs,
    )
    user.roles = [await get_role(session, role) for role in roles]
    session.add(user)
    await session.commit()
    return user


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def cookie_value(response, name: str = "refresh_token") -> str | None:
    for header in response.headers.get_list("set-cookie"):
        if header.startswith(f"{name}="):
            return header.split(";", 1)[0].split("=", 1)[1]
    return None


def cookie_header(token: str) -> dict[str, str]:
    return {"Cookie": f"refresh_token={token}"}


async def login(client, email=EMAIL, password=PASSWORD, **headers):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=headers,
    )
    client.cookies.clear()
    return response


async def login_ok(client, email=EMAIL, password=PASSWORD) -> tuple[str, str]:
    """Return (access_token, refresh_token) for a successful login."""
    response = await login(client, email, password)
    assert response.status_code == 200, response.text
    return response.json()["access_token"], cookie_value(response)


async def refresh(client, token: str, **headers):
    response = await client.post(
        "/api/v1/auth/refresh",
        headers={**cookie_header(token), **headers},
    )
    client.cookies.clear()
    return response


def session_id_of(access_token: str) -> str:
    return jwt.decode(
        access_token,
        options={"verify_signature": False},
    )["sid"]


async def sessions_of(session, user_id) -> list[RefreshSession]:
    stmt = (
        select(RefreshSession)
        .where(RefreshSession.user_id == user_id)
        .order_by(RefreshSession.created_at)
        .execution_options(populate_existing=True)
    )
    return list((await session.execute(stmt)).scalars())


async def update_sessions(session, user_id, **values) -> None:
    await session.execute(
        update(RefreshSession).where(RefreshSession.user_id == user_id).values(**values)
    )
    await session.commit()


def now() -> datetime:
    return datetime.now(UTC)


def forge_token(
    *,
    user_id,
    session_id,
    secret=None,
    algorithm="HS256",
    iss=None,
    aud=None,
    typ="access",
    expires_in=timedelta(minutes=5),
    drop=(),
) -> str:
    """Build a JWT with chosen defects, to prove the verifier rejects them."""
    settings = get_settings()
    claims = {
        "sub": str(user_id),
        "sid": str(session_id),
        "iss": iss or settings.jwt_issuer,
        "aud": aud or settings.jwt_audience,
        "iat": now() - timedelta(minutes=1),
        "exp": now() + expires_in,
        "typ": typ,
    }

    for key in drop:
        claims.pop(key)

    key = secret or settings.jwt_secret_key.get_secret_value()

    if algorithm == "none":
        return jwt.encode(claims, None, algorithm="none")

    return jwt.encode(claims, key, algorithm=algorithm)


# ---------------------------------------------------------------------------
# Stage 4: Role-based access control helpers
# ---------------------------------------------------------------------------

ADMIN_EMAIL = "admin@example.com"

PING = {
    "candidate": "/api/v1/candidate/ping",
    "recruiter": "/api/v1/recruiter/ping",
    "admin": "/api/v1/admin/ping",
}


async def ping(client, area: str, token: str | None = None, **kwargs):
    headers = bearer(token) if token else {}
    return await client.get(
        PING[area],
        headers={**headers, **kwargs.pop("headers", {})},
        **kwargs,
    )


async def user_with_token(client, session, roles, email=EMAIL):
    """Create a user holding `roles`, log in, and return (user, access_token)."""
    user = await create_user(session, email=email, roles=roles)
    access, _ = await login_ok(client, email)
    return user, access


async def role_names(session, user_id) -> list[str]:
    stmt = (
        select(Role.name)
        .join(user_roles, user_roles.c.role_id == Role.id)
        .where(user_roles.c.user_id == user_id)
        .order_by(Role.name)
    )
    return list((await session.execute(stmt)).scalars())


async def give_role(session, user_id, role: str) -> None:
    """Assign a role directly in the database."""
    role = await get_role(session, role)
    await session.execute(
        user_roles.insert().values(
            user_id=user_id,
            role_id=role.id,
        )
    )
    await session.commit()


async def take_role(session, user_id, role: str) -> None:
    role_record = await get_role(session, role)
    await session.execute(
        delete(user_roles).where(
            user_roles.c.user_id == user_id,
            user_roles.c.role_id == role_record.id,
        )
    )
    await session.commit()


async def set_status_sql(session, user_id, status: str) -> None:
    await session.execute(update(User).where(User.id == user_id).values(status=status))
    await session.commit()
