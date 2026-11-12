import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.candidate.models import InterviewSession, Resume


async def list_interviews(
    db: AsyncSession, user_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[InterviewSession]:
    stmt = (
        select(InterviewSession)
        .where(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list((await db.execute(stmt)).scalars())


async def get_interview(
    db: AsyncSession, interview_id: uuid.UUID, user_id: uuid.UUID
) -> InterviewSession | None:
    stmt = select(InterviewSession).where(
        InterviewSession.id == interview_id, InterviewSession.user_id == user_id
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_interview(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    category: str,
    difficulty: str,
    question_count: int,
    duration_seconds: int,
    responses: list[dict],
    score: int | None,
    notes: str | None,
) -> InterviewSession:
    interview = InterviewSession(
        user_id=user_id,
        category=category,
        difficulty=difficulty,
        question_count=question_count,
        duration_seconds=duration_seconds,
        responses=responses,
        score=score,
        notes=notes,
        status="completed",
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return interview


async def list_resumes(db: AsyncSession, user_id: uuid.UUID) -> list[Resume]:
    stmt = select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc())
    return list((await db.execute(stmt)).scalars())


async def create_resume(
    db: AsyncSession, *, user_id: uuid.UUID, filename: str, file_size: int, content_type: str
) -> Resume:
    resume = Resume(
        user_id=user_id,
        filename=filename,
        file_size=file_size,
        content_type=content_type,
        status="uploaded_pending_parsing",
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def delete_resume(db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    stmt = (
        delete(Resume)
        .where(Resume.id == resume_id, Resume.user_id == user_id)
        .returning(Resume.id)
    )
    deleted_id = (await db.execute(stmt)).scalar_one_or_none()
    await db.commit()
    return deleted_id is not None


async def get_candidate_stats(db: AsyncSession, user_id: uuid.UUID) -> dict:
    interviews = await list_interviews(db, user_id, limit=100)
    resumes_count = (
        await db.execute(
            select(func.count()).select_from(Resume).where(Resume.user_id == user_id)
        )
    ).scalar_one()

    total_time = sum(i.duration_seconds for i in interviews)
    scored = [i.score for i in interviews if i.score is not None]
    avg_score = round(sum(scored) / len(scored), 1) if scored else None

    return {
        "interviews_completed": len(interviews),
        "resumes_uploaded": resumes_count,
        "total_practice_time_seconds": total_time,
        "average_score": avg_score,
        "latest_interview": interviews[0] if interviews else None,
    }

