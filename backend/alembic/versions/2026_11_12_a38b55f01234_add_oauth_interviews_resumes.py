"""add google oauth columns, interview sessions, and resumes tables

Revision ID: a38b55f01234
Revises: 990c619bba4a
Create Date: 2026-11-12 11:30:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a38b55f01234"
down_revision: str | None = "990c619bba4a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Users OAuth columns
    op.add_column("users", sa.Column("google_id", sa.String(length=100), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "auth_provider",
            sa.String(length=30),
            server_default="local",
            nullable=False,
        ),
    )
    op.add_column("users", sa.Column("avatar_url", sa.String(length=1024), nullable=True))
    op.create_index(
        op.f("ix_users_google_id"), "users", ["google_id"], unique=True
    )

    # Interview sessions table
    op.create_table(
        "interview_sessions",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column(
            "difficulty",
            sa.String(length=30),
            server_default="Intermediate",
            nullable=False,
        ),
        sa.Column("question_count", sa.Integer(), server_default="5", nullable=False),
        sa.Column("duration_seconds", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "status", sa.String(length=30), server_default="completed", nullable=False
        ),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("responses", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_interview_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_interview_sessions")),
    )
    op.create_index(
        op.f("ix_interview_sessions_user_id"),
        "interview_sessions",
        ["user_id"],
        unique=False,
    )

    # Resumes table
    op.create_table(
        "resumes",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_size", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "content_type",
            sa.String(length=100),
            server_default="application/pdf",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=60),
            server_default="uploaded_pending_parsing",
            nullable=False,
        ),
        sa.Column("extracted_skills", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_resumes_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_resumes")),
    )
    op.create_index(
        op.f("ix_resumes_user_id"), "resumes", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_resumes_user_id"), table_name="resumes")
    op.drop_table("resumes")
    op.drop_index(
        op.f("ix_interview_sessions_user_id"), table_name="interview_sessions"
    )
    op.drop_table("interview_sessions")
    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "google_id")

