"""Operator commands. Run from the backend folder:

    python -m app.cli seed-roles
    python -m app.cli create-admin --email you@example.com --full-name "Your Name"
    python -m app.cli create-admin --email existing@example.com --promote-existing

`create-admin` asks for the password with getpass (not echoed, not stored in shell history,
never printed). There is deliberately no public admin registration.

Promoting an ALREADY-REGISTERED account requires --promote-existing. Emails are not verified, so
someone else could have registered that address first; only promote accounts you know are yours.
"""

import argparse
import asyncio
import getpass
import sys

from pydantic import TypeAdapter, ValidationError

from app.auth.schemas import Email, FullName, NewPassword
from app.core.config import get_settings
from app.db.session import create_engine, create_session_factory
from app.users import repository as users_repo
from app.users.bootstrap import create_admin_user, seed_roles
from app.users.models import RoleName

_email = TypeAdapter(Email)
_name = TypeAdapter(FullName)
_password = TypeAdapter(NewPassword)


def _fail(message: str) -> int:
    print(f"error: {message}", file=sys.stderr)
    return 1


def _prompt_password() -> str | None:
    first = getpass.getpass("Admin password: ")
    if getpass.getpass("Repeat password: ") != first:
        return None
    return first


async def _run(args: argparse.Namespace) -> int:
    engine = create_engine(get_settings())

    try:
        async with create_session_factory(engine)() as db:
            if args.command == "seed-roles":
                created = await seed_roles(db)
                print(
                    "Created roles: " + ", ".join(created)
                    if created
                    else "All roles already exist."
                )
                return 0

            try:
                email = _email.validate_python(args.email)
                full_name = _name.validate_python(args.full_name)
            except ValidationError as exc:
                return _fail(exc.errors()[0]["msg"])

            password: str | None = None
            existing = await users_repo.get_by_email(db, email)

            if (
                existing is not None
                and not args.promote_existing
                and not any(role.name == RoleName.ADMIN.value for role in existing.roles)
            ):
                return _fail(
                    "an account with this email already exists. If it is really yours, "
                    "re-run with --promote-existing"
                )

            if existing is None:
                password = args.password if getattr(args, "password", None) else _prompt_password()

                if password is None:
                    return _fail("passwords do not match")

                try:
                    _password.validate_python(password)
                except ValidationError:
                    return _fail("password must be 10-128 characters")

            result = await create_admin_user(
                db,
                email=email,
                full_name=full_name,
                password=password,
                promote_existing=args.promote_existing,
            )

            if result.created:
                print(f"Created admin account {result.user.email} (id {result.user.id}).")
            elif result.granted:
                print(f"Granted the admin role to existing account {result.user.email}.")
            else:
                print(f"{result.user.email} is already an admin; nothing to do.")

            return 0

    finally:
        await engine.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli",
        description="SmartHire operator commands",
    )

    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser(
        "seed-roles",
        help="create any missing platform roles (idempotent)",
    )

    admin = commands.add_parser(
        "create-admin",
        help="create the first admin account",
    )

    admin.add_argument("--email", required=True)
    admin.add_argument("--full-name", default="Platform Admin")
    admin.add_argument("--password", help="admin password (if omitted, prompts interactively)")
    admin.add_argument(
        "--promote-existing",
        action="store_true",
        help="grant admin to an already-registered account with this email",
    )

    return asyncio.run(_run(parser.parse_args(argv)))


if __name__ == "__main__":
    sys.exit(main())
