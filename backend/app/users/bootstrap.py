"""Role seeding and admin bootstrap: out-of-band operations run by an operator (see app/cli.py).

None of this is reachable from the public API: admin accounts can only be created by someone
with shell access to the server and database credentials.
"""

from dataclasses import dataclass

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.users import repository as users_repo
from app.users.models import Role, RoleName, User, user_roles

ROLE_DESCRIPTIONS: dict[RoleName, str] = {
    RoleName.CANDIDATE: "Practises interviews and tracks own progress",
    RoleName.RECRUITER: "Reviews candidates and manages interview templates",
    RoleName.ADMIN: "Manages users, roles and platform settings",
}


async def seed_roles(db: AsyncSession) -> list[str]:
    """Ensure the three platform roles exist. Safe to run any number of times, concurrently.

    Uses INSERT ... ON CONFLICT DO NOTHING on the unique role name, so existing rows (and
    therefore every existing user-role assignment and any edited description) are untouched.
    Returns the names of roles that were actually created by this call.
    """
    stmt = (
        pg_insert(Role)
        .values(
            [{"name": name.value, "description": text} for name, text in ROLE_DESCRIPTIONS.items()]
        )
        .on_conflict_do_nothing(index_elements=["name"])
        .returning(Role.name)
    )
    created = sorted((await db.execute(stmt)).scalars())
    await db.commit()
    return created


@dataclass(frozen=True)
class AdminBootstrapResult:
    user: User
    created: bool  # a brand-new account was created
    granted: bool  # the admin role was newly added to an existing account


async def create_admin_user(
    db: AsyncSession,
    *,
    email: str,
    full_name: str,
    password: str | None,
    promote_existing: bool = False,
) -> AdminBootstrapResult:
    """Create an admin account or explicitly authorize promotion of an existing account.

    `email` must already be normalised. `password` is only required when the account
    does not exist yet. An existing account keeps its current password.
    Promoting an existing non-admin account requires promote_existing=True.
    """
    await seed_roles(db)
    admin_role = await users_repo.get_role_by_name(db, RoleName.ADMIN.value)
    assert admin_role is not None  # just seeded  # noqa: S101

    existing = await users_repo.get_by_email(db, email)

    if existing is not None:
        if any(role.name == RoleName.ADMIN.value for role in existing.roles):
            return AdminBootstrapResult(existing, created=False, granted=False)

        if not promote_existing:
            raise ValueError("Promoting an existing account requires explicit authorization")

        await db.execute(
            user_roles.insert().values(
                user_id=existing.id,
                role_id=admin_role.id,
            )
        )
        await db.commit()

        existing = await users_repo.get_by_email(db, email)
        assert existing is not None  # noqa: S101

        return AdminBootstrapResult(existing, created=False, granted=True)

    if password is None:
        raise ValueError("A password is required to create a new admin account")

    user = User(
        email=email,
        full_name=full_name,
        password_hash=await hash_password(password),
    )
    user.roles = [admin_role]
    db.add(user)
    await db.commit()

    return AdminBootstrapResult(user, created=True, granted=False)
