import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.candidate.models import InterviewSession, Resume
from app.users.models import Role, RoleName, User, UserStatus, user_roles


async def list_candidates(
    db: AsyncSession,
    *,
    q: str | None = None,
    status: UserStatus | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    candidate_role_id = (
        select(Role.id).where(Role.name == RoleName.CANDIDATE.value).scalar_subquery()
    )
    candidate_user_ids = (
        select(user_roles.c.user_id)
        .where(user_roles.c.role_id == candidate_role_id)
    )

    conditions = [User.id.in_(candidate_user_ids)]
    if q:
        escaped = q.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        conditions.append(
            (User.email.like(f"%{escaped}%", escape="\\"))
            | (User.full_name.ilike(f"%{escaped}%"))
        )
    if status is not None:
        conditions.append(User.status == status.value)

    total = (
        await db.execute(select(func.count()).select_from(User).where(*conditions))
    ).scalar_one()

    stmt = (
        select(User)
        .where(*conditions)
        .order_by(User.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    users = list((await db.execute(stmt)).scalars())

    items = []
    for u in users:
        resume_cnt = (
            await db.execute(
                select(func.count()).select_from(Resume).where(Resume.user_id == u.id)
            )
        ).scalar_one()

        interview_stmt = select(InterviewSession.score).where(
            InterviewSession.user_id == u.id, InterviewSession.score.is_not(None)
        )
        scores = list((await db.execute(interview_stmt)).scalars())
        total_interviews = (
            await db.execute(
                select(func.count())
                .select_from(InterviewSession)
                .where(InterviewSession.user_id == u.id)
            )
        ).scalar_one()

        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        items.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "status": u.status,
            "created_at": u.created_at,
            "resume_count": resume_cnt,
            "interview_count": total_interviews,
            "average_score": avg_score,
        })

    return items, total


async def get_candidate_detail(db: AsyncSession, candidate_id: uuid.UUID) -> dict | None:
    stmt = (
        select(User)
        .where(User.id == candidate_id)
        .options(selectinload(User.roles))
    )
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        return None

    resumes = list(
        (
            await db.execute(
                select(Resume)
                .where(Resume.user_id == candidate_id)
                .order_by(Resume.created_at.desc())
            )
        ).scalars()
    )
    interviews = list(
        (
            await db.execute(
                select(InterviewSession)
                .where(InterviewSession.user_id == candidate_id)
                .order_by(InterviewSession.created_at.desc())
            )
        ).scalars()
    )

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "status": user.status,
        "created_at": user.created_at,
        "roles": [r.name for r in user.roles],
        "resumes": resumes,
        "interviews": interviews,
    }


async def get_recruiter_stats(db: AsyncSession) -> dict:
    candidate_role_id = (
        select(Role.id).where(Role.name == RoleName.CANDIDATE.value).scalar_subquery()
    )
    candidate_user_ids = (
        select(user_roles.c.user_id)
        .where(user_roles.c.role_id == candidate_role_id)
    )

    total_candidates = (
        await db.execute(
            select(func.count()).select_from(User).where(User.id.in_(candidate_user_ids))
        )
    ).scalar_one()

    active_candidates = (
        await db.execute(
            select(func.count()).select_from(User).where(
                User.id.in_(candidate_user_ids), User.status == UserStatus.ACTIVE.value
            )
        )
    ).scalar_one()

    total_interviews = (
        await db.execute(select(func.count()).select_from(InterviewSession))
    ).scalar_one()

    scores = list(
        (
            await db.execute(
                select(InterviewSession.score).where(InterviewSession.score.is_not(None))
            )
        ).scalars()
    )
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    return {
        "total_candidates": total_candidates,
        "active_candidates": active_candidates,
        "total_interviews": total_interviews,
        "average_candidate_score": avg_score,
    }
