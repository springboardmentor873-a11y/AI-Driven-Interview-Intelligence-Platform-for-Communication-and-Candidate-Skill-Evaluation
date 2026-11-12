import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthContext, get_auth_context
from app.candidate import repository
from app.candidate.schemas import (
    CandidateStats,
    InterviewCreateRequest,
    InterviewRead,
    ResumeRead,
    ResumeUploadRequest,
)
from app.db.session import get_session

router = APIRouter(
    prefix="/candidate",
    tags=["candidate"],
    responses={
        401: {"description": "Missing, invalid or expired credentials"},
    },
)

DB = Annotated[AsyncSession, Depends(get_session)]
Auth = Annotated[AuthContext, Depends(get_auth_context)]


@router.get("/stats", response_model=CandidateStats, summary="Get candidate dashboard statistics")
async def get_stats(auth: Auth, db: DB) -> CandidateStats:
    stats = await repository.get_candidate_stats(db, auth.user.id)
    return CandidateStats(**stats)


@router.get("/interviews", response_model=list[InterviewRead], summary="List candidate interviews")
async def list_interviews(
    auth: Auth,
    db: DB,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[InterviewRead]:
    items = await repository.list_interviews(db, auth.user.id, limit=limit, offset=offset)
    return [
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
        for i in items
    ]


@router.post(
    "/interviews",
    response_model=InterviewRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record completed mock interview",
)
async def create_interview(
    body: InterviewCreateRequest, auth: Auth, db: DB
) -> InterviewRead:
    serialized_responses = [r.model_dump() for r in body.responses]
    interview = await repository.create_interview(
        db,
        user_id=auth.user.id,
        category=body.category,
        difficulty=body.difficulty,
        question_count=body.question_count,
        duration_seconds=body.duration_seconds,
        responses=serialized_responses,
        score=body.score,
        notes=body.notes,
    )
    return InterviewRead(
        id=interview.id,
        user_id=interview.user_id,
        category=interview.category,
        difficulty=interview.difficulty,
        question_count=interview.question_count,
        duration_seconds=interview.duration_seconds,
        status=interview.status,
        score=interview.score,
        responses=interview.responses,
        notes=interview.notes,
        created_at=interview.created_at,
    )


@router.get(
    "/interviews/{interview_id}", response_model=InterviewRead, summary="Get interview report"
)
async def get_interview(interview_id: uuid.UUID, auth: Auth, db: DB) -> InterviewRead:
    item = await repository.get_interview(db, interview_id, auth.user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return InterviewRead(
        id=item.id,
        user_id=item.user_id,
        category=item.category,
        difficulty=item.difficulty,
        question_count=item.question_count,
        duration_seconds=item.duration_seconds,
        status=item.status,
        score=item.score,
        responses=item.responses,
        notes=item.notes,
        created_at=item.created_at,
    )


@router.get("/resumes", response_model=list[ResumeRead], summary="List candidate resumes")
async def list_resumes(auth: Auth, db: DB) -> list[ResumeRead]:
    items = await repository.list_resumes(db, auth.user.id)
    return [
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
        for r in items
    ]


@router.post(
    "/resumes",
    response_model=ResumeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record uploaded resume",
)
async def create_resume(body: ResumeUploadRequest, auth: Auth, db: DB) -> ResumeRead:
    resume = await repository.create_resume(
        db,
        user_id=auth.user.id,
        filename=body.filename,
        file_size=body.file_size,
        content_type=body.content_type,
    )
    return ResumeRead(
        id=resume.id,
        user_id=resume.user_id,
        filename=resume.filename,
        file_size=resume.file_size,
        content_type=resume.content_type,
        status=resume.status,
        extracted_skills=resume.extracted_skills,
        created_at=resume.created_at,
    )


@router.delete(
    "/resumes/{resume_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete resume"
)
async def delete_resume(resume_id: uuid.UUID, auth: Auth, db: DB) -> None:
    deleted = await repository.delete_resume(db, resume_id, auth.user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
