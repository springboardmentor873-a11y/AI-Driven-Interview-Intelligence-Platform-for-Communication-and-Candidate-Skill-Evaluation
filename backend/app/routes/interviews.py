
from pathlib import Path
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.interview import InterviewSession, InterviewAnswer

from app.services.interview_generator import generate_interview_questions
from app.services.resume_parser import extract_resume_text
from app.services.groq_skill_extractor import extract_skills_with_groq
from app.services.groq_experience_extractor import extract_experience_with_groq


router = APIRouter(
    prefix="/api/interviews",
    tags=["Interviews"],
)


class InterviewGenerationRequest(BaseModel):
    interview_type: Literal[
        "Technical", "HR", "Behavioral", "Aptitude"
    ]

    difficulty: Literal[
        "Beginner", "Intermediate", "Advanced"
    ]

    domain: Literal[
        "Java",
        "Python",
        "C++",
        "Web Development",
        "Database",
        "Data Structures and Algorithms",
        "AI/ML",
        "General",
    ]

    question_count: Literal[5, 10, 15] = 10
    resume_id: int | None = Field(default=None, gt=0)


class AnswerSubmissionRequest(BaseModel):
    question_number: int = Field(ge=1)
    answer_text: str = Field(min_length=1, max_length=20000)


# Generate interview and save session
@router.post("/generate")
def generate_interview(
    request: InterviewGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    resume_skills = []
    resume_experience = []

    if request.resume_id is not None:
        resume = (
            db.query(Resume)
            .filter(
                Resume.id == request.resume_id,
                Resume.user_id == current_user.id,
            )
            .first()
        )

        if resume is None:
            raise HTTPException(status_code=404, detail="Resume not found")

        upload_dir = (
            Path(__file__).resolve().parents[2]
            / "uploads"
            / "resumes"
        )

        file_path = Path(resume.file_path).resolve()

        try:
            file_path.relative_to(upload_dir.resolve())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid resume storage path",
            )

        if not file_path.is_file():
            raise HTTPException(
                status_code=404,
                detail="Resume file not found",
            )

        try:
            resume_text = extract_resume_text(
                str(file_path),
                resume.file_type,
            )

            if not resume_text or not resume_text.strip():
                raise ValueError("No readable resume text found")

        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error))

        except Exception:
            raise HTTPException(
                status_code=422,
                detail="Unable to parse the selected resume",
            )

        try:
            skill_result = extract_skills_with_groq(resume_text)
            resume_skills = [
                skill["name"]
                for skill in skill_result["skills"]
            ]
        except Exception:
            raise HTTPException(
                status_code=503,
                detail="Resume skill extraction is temporarily unavailable",
            )

        try:
            experience_result = extract_experience_with_groq(resume_text)
            resume_experience = experience_result["experiences"]
        except Exception:
            raise HTTPException(
                status_code=503,
                detail="Resume experience extraction is temporarily unavailable",
            )

    try:
        result = generate_interview_questions(
            interview_type=request.interview_type,
            difficulty=request.difficulty,
            domain=request.domain,
            question_count=request.question_count,
            resume_skills=resume_skills,
            resume_experience=resume_experience,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Interview question generation is temporarily unavailable. Please try again.",
        )

    session = InterviewSession(
        user_id=current_user.id,
        resume_id=request.resume_id,
        interview_type=request.interview_type,
        difficulty=request.difficulty,
        domain=request.domain,
        question_count=request.question_count,
        questions=result["questions"],
        status="active",
    )

    try:
        db.add(session)
        db.commit()
        db.refresh(session)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save interview session",
        )

    return {
        "message": "Interview questions generated successfully",
        "session_id": session.id,
        "interview_type": request.interview_type,
        "difficulty": request.difficulty,
        "domain": request.domain,
        "question_count": request.question_count,
        "resume_id": request.resume_id,
        "questions": result["questions"],
    }


# Submit interview answer
@router.post("/sessions/{session_id}/answers")
def submit_interview_answer(
    session_id: int,
    request: AnswerSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found",
        )

    if session.status != "active":
        raise HTTPException(
            status_code=400,
            detail="This interview session is not active",
        )

    answer_text = request.answer_text.strip()

    if not answer_text:
        raise HTTPException(
            status_code=422,
            detail="Answer cannot be empty",
        )

    selected_question = next(
        (
            question
            for question in session.questions
            if question["question_number"] == request.question_number
        ),
        None,
    )

    if selected_question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found in this interview",
        )

    existing_answer = (
        db.query(InterviewAnswer)
        .filter(
            InterviewAnswer.session_id == session_id,
            InterviewAnswer.question_number == request.question_number,
        )
        .first()
    )

    if existing_answer:
        existing_answer.answer_text = answer_text
        existing_answer.submitted_at = datetime.now(timezone.utc)
    else:
        new_answer = InterviewAnswer(
            session_id=session_id,
            question_number=request.question_number,
            question=selected_question["question"],
            answer_text=answer_text,
        )
        db.add(new_answer)

    try:
        db.flush()

        submitted_count = (
            db.query(InterviewAnswer)
            .filter(InterviewAnswer.session_id == session_id)
            .count()
        )

        if submitted_count == session.question_count:
            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)

        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save your answer",
        )

    return {
        "message": "Answer submitted successfully",
        "session_id": session_id,
        "question_number": request.question_number,
        "submitted_count": submitted_count,
        "total_questions": session.question_count,
        "status": session.status,
    }


# Get interview history
@router.get("/history")
def get_interview_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    history = []

    for session in sessions:
        history.append({
            "session_id": session.id,
            "interview_type": session.interview_type,
            "difficulty": session.difficulty,
            "domain": session.domain,
            "question_count": session.question_count,
            "submitted_count": len(session.answers),
            "status": session.status,
            "created_at": (
                session.created_at.isoformat()
                if session.created_at else None
            ),
            "completed_at": (
                session.completed_at.isoformat()
                if session.completed_at else None
            ),
        })

    return {
        "total_interviews": len(history),
        "interviews": history,
    }


# Get a particular saved interview session
@router.get("/sessions/{session_id}")
def get_interview_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found",
        )

    answers = [
        {
            "question_number": answer.question_number,
            "question": answer.question,
            "answer_text": answer.answer_text,
            "submitted_at": (
                answer.submitted_at.isoformat()
                if answer.submitted_at else None
            ),
        }
        for answer in session.answers
    ]

    return {
        "session_id": session.id,
        "interview_type": session.interview_type,
        "difficulty": session.difficulty,
        "domain": session.domain,
        "question_count": session.question_count,
        "status": session.status,
        "created_at": (
            session.created_at.isoformat()
            if session.created_at else None
        ),
        "completed_at": (
            session.completed_at.isoformat()
            if session.completed_at else None
        ),
        "questions": session.questions,
        "answers": answers,
    }
