import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthContext, require_recruiter
from app.candidate.schemas import InterviewRead, ResumeRead
from app.db.session import get_session
from app.recruiter import repository
from app.recruiter.schemas import CandidateDetail, CandidatePage, CandidateSummary, RecruiterStats
from app.users.models import UserStatus

router = APIRouter(
    prefix="/recruiter",
    tags=["recruiter"],
    dependencies=[Depends(require_recruiter)],
    responses={
        401: {"description": "Missing, invalid or expired credentials"},
        403: {"description": "Authenticated, but lacks the recruiter role"},
    },
)

DB = Annotated[AsyncSession, Depends(get_session)]
Actor = Annotated[AuthContext, Depends(require_recruiter)]


@router.get("/stats", response_model=RecruiterStats, summary="Recruiter platform metrics")
async def get_stats(db: DB) -> RecruiterStats:
    stats = await repository.get_recruiter_stats(db)
    return RecruiterStats(**stats)


@router.get("/candidates", response_model=CandidatePage, summary="Discover and list candidates")
async def list_candidates(
    db: DB,
    q: Annotated[str | None, Query(max_length=100, description="Search name or email")] = None,
    status_filter: Annotated[UserStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CandidatePage:
    items, total = await repository.list_candidates(
        db, q=q, status=status_filter, limit=limit, offset=offset
    )
    return CandidatePage(
        items=[CandidateSummary(**item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/candidates/{candidate_id}",
    response_model=CandidateDetail,
    summary="Get candidate profile, resumes, and assessments",
)
async def get_candidate(candidate_id: uuid.UUID, db: DB) -> CandidateDetail:
    candidate = await repository.get_candidate_detail(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    return CandidateDetail(
        id=candidate["id"],
        email=candidate["email"],
        full_name=candidate["full_name"],
        status=candidate["status"],
        created_at=candidate["created_at"],
        roles=candidate["roles"],
        resumes=[
            ResumeRead(
                id=r.id,
                user_id=r.user_id,
                filename=r.filename,
                file_size=r.file_size,
                content_type=r.content_type,
                status=r.status,
                extracted_skills=r.extracted_skills,
                created_at=r.created_at,
            )
            for r in candidate["resumes"]
        ],
        interviews=[
            InterviewRead(
                id=i.id,
                user_id=i.user_id,
                category=i.category,
                difficulty=i.difficulty,
                question_count=i.question_count,
                duration_seconds=i.duration_seconds,
                status=i.status,
                score=i.score,
                responses=i.responses,
                notes=i.notes,
                created_at=i.created_at,
            )
            for i in candidate["interviews"]
        ],
    )

