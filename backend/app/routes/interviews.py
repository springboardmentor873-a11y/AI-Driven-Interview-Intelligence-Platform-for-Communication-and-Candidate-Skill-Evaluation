import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.interview import PracticeQuestion, InterviewSession, InterviewAnswer
from app.schemas.interview import (
    PracticeQuestionResponse,
    PracticeQuestionCreate,
    InterviewSessionStartRequest,
    InterviewSessionResponse,
    InterviewAnswerSubmitRequest,
    InterviewAnswerResponse,
    AssessmentReportResponse,
)
from app.services.interview_service import InterviewService
from app.core.dependencies import (
    get_current_user,
    require_candidate,
    require_recruiter,
    require_admin,
)

logger = logging.getLogger("smarthire_ai.interviews")
router = APIRouter(prefix="/interviews", tags=["AI Mock Interviews & Assessments"])


# =====================================================================
# 1. Practice Questions Bank
# =====================================================================

@router.get("/practice-questions", response_model=List[PracticeQuestionResponse], summary="List Practice Questions")
def get_practice_questions(
    category: Optional[str] = Query(None, description="Filter by category (Behavioral, Technical, System Design)"),
    role_target: Optional[str] = Query(None, description="Filter by target role"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search question text"),
    db: Session = Depends(get_db),
):
    """
    Retrieve curated interview questions from the practice library.
    Supports filtering by category, role, difficulty, and keyword search.
    """
    query = db.query(PracticeQuestion)
    if category and category.lower() != "all":
        query = query.filter(PracticeQuestion.category.ilike(f"%{category}%"))
    if role_target and role_target.lower() != "all":
        query = query.filter(
            (PracticeQuestion.role_target.ilike(f"%{role_target}%")) |
            (PracticeQuestion.role_target == "All")
        )
    if difficulty and difficulty.lower() != "all":
        query = query.filter(PracticeQuestion.difficulty.ilike(f"%{difficulty}%"))
    if search:
        query = query.filter(PracticeQuestion.question_text.ilike(f"%{search}%"))

    return query.order_by(PracticeQuestion.created_at.desc()).all()


@router.post("/practice-questions", response_model=PracticeQuestionResponse, status_code=status.HTTP_201_CREATED, summary="Create Practice Question")
def create_practice_question(
    question_in: PracticeQuestionCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Add a new question to the practice bank (Admin only)."""
    question = PracticeQuestion(**question_in.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


# =====================================================================
# 2. Mock Interview Sessions
# =====================================================================

@router.post("/sessions/start", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED, summary="Start Mock Interview Session")
def start_interview_session(
    payload: InterviewSessionStartRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """
    Initializes a new interactive AI mock interview session for the candidate.
    Selects relevant questions based on role and difficulty.
    """
    # 1. Fetch matching questions from library
    questions = (
        db.query(PracticeQuestion)
        .filter(
            (PracticeQuestion.role_target.ilike(f"%{payload.role_title}%")) |
            (PracticeQuestion.role_target == "All")
        )
        .limit(payload.questions_count)
        .all()
    )

    # Fallback to general questions if no role-specific matches exist
    if not questions:
        questions = db.query(PracticeQuestion).limit(payload.questions_count).all()

    # 2. Create the interview session
    session = InterviewSession(
        user_id=current_user.id,
        role_title=payload.role_title,
        difficulty=payload.difficulty,
        status="in_progress",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 3. Format question payload
    formatted_questions = [
        {
            "id": q.id,
            "category": q.category,
            "role_target": q.role_target,
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "rubric_guide": q.rubric_guide,
        }
        for q in questions
    ]

    return {
        "session_id": session.id,
        "role_title": session.role_title,
        "difficulty": session.difficulty,
        "status": session.status,
        "total_questions": len(formatted_questions),
        "questions": formatted_questions,
        "message": "AI Mock Interview session initialized. You may now record or submit your answers.",
    }


@router.post("/sessions/{session_id}/submit-answer", response_model=InterviewAnswerResponse, summary="Submit Spoken/Written Answer")
def submit_answer(
    session_id: str,
    payload: InterviewAnswerSubmitRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """
    Accepts speech transcript or typed text, runs real-time AI rubric evaluation:
    - Calculates Words Per Minute (WPM) cadence
    - Identifies vocal fillers
    - Assesses STAR rubric coverage (Situation, Task, Action, Result)
    - Returns instant scoring and constructive coaching feedback
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found or does not belong to you.",
        )

    # Analyze response using InterviewService
    analysis = InterviewService.analyze_answer(
        transcript=payload.transcript,
        duration_seconds=payload.duration_seconds,
        category=payload.category,
    )

    # Create answer record
    answer = InterviewAnswer(
        session_id=session.id,
        question_id=payload.question_id,
        question_text=payload.question_text,
        category=payload.category,
        transcript=payload.transcript,
        duration_seconds=payload.duration_seconds,
        wpm=analysis["wpm"],
        filler_count=analysis["filler_count"],
        filler_words=json.dumps(analysis["filler_words"]),
        score=analysis["score"],
        ai_feedback=analysis["ai_feedback"],
        star_breakdown=json.dumps(analysis["star_breakdown"]),
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    return InterviewAnswerResponse(
        id=answer.id,
        session_id=answer.session_id,
        question_id=answer.question_id,
        question_text=answer.question_text,
        category=answer.category,
        transcript=answer.transcript,
        duration_seconds=answer.duration_seconds,
        wpm=answer.wpm,
        filler_count=answer.filler_count,
        filler_words=analysis["filler_words"],
        score=answer.score,
        ai_feedback=answer.ai_feedback,
        star_breakdown=analysis["star_breakdown"],
        created_at=answer.created_at,
    )


@router.post("/sessions/{session_id}/complete", response_model=AssessmentReportResponse, summary="Finalize Interview & Generate Assessment Report")
def complete_interview(
    session_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """
    Finalizes the mock interview session, computes aggregate composite metrics,
    and returns the comprehensive candidate assessment report.
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )

    # Fetch all answers for this session
    answers = db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session.id).all()
    answer_dicts = [
        {
            "score": a.score,
            "wpm": a.wpm,
            "filler_count": a.filler_count,
            "star_total": json.loads(a.star_breakdown or "{}").get("situation", 0) +
                          json.loads(a.star_breakdown or "{}").get("task", 0) +
                          json.loads(a.star_breakdown or "{}").get("action", 0) +
                          json.loads(a.star_breakdown or "{}").get("result", 0)
        }
        for a in answers
    ]

    summary = InterviewService.generate_session_summary(answer_dicts)

    # Update session in DB
    session.status = "completed"
    session.overall_score = summary["overall_score"]
    session.cadence_wpm = summary["cadence_wpm"]
    session.clarity_score = summary["clarity_score"]
    session.star_score = summary["star_score"]
    session.filler_words_count = summary["filler_words_count"]
    session.strengths = json.dumps(summary["strengths"])
    session.improvements = json.dumps(summary["improvements"])
    session.recommendations = json.dumps(summary["recommendations"])
    session.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)

    evaluated_questions = [
        {
            "question_text": a.question_text,
            "category": a.category,
            "transcript": a.transcript,
            "wpm": a.wpm,
            "score": a.score,
            "ai_feedback": a.ai_feedback,
            "filler_count": a.filler_count,
        }
        for a in answers
    ]

    return AssessmentReportResponse(
        session_id=session.id,
        candidate_name=current_user.full_name,
        role_title=session.role_title,
        difficulty=session.difficulty,
        completed_at=session.completed_at,
        overall_score=session.overall_score,
        status=session.status,
        metrics={
            "overall_score": session.overall_score,
            "cadence_wpm": session.cadence_wpm,
            "clarity_score": session.clarity_score,
            "star_score": session.star_score,
            "filler_words_count": session.filler_words_count,
            "total_answers": len(answers),
        },
        strengths=summary["strengths"],
        improvements=summary["improvements"],
        recommendations=summary["recommendations"],
        questions_evaluated=evaluated_questions,
    )


@router.get("/sessions/{session_id}/report", response_model=AssessmentReportResponse, summary="Get Assessment Report")
def get_assessment_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve full assessment report for an interview session.
    Permitted for the Candidate who took it, or Recruiters and Admins reviewing the candidate.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    # Role permission check: candidate can only view own; recruiter and admin can view any
    if current_user.role == UserRole.CANDIDATE.value and session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to another candidate's assessment.")

    candidate = db.query(User).filter(User.id == session.user_id).first()
    candidate_name = candidate.full_name if candidate else "Candidate"

    answers = db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session.id).all()
    evaluated_questions = [
        {
            "question_text": a.question_text,
            "category": a.category,
            "transcript": a.transcript,
            "wpm": a.wpm,
            "score": a.score,
            "ai_feedback": a.ai_feedback,
            "filler_count": a.filler_count,
        }
        for a in answers
    ]

    try:
        strengths = json.loads(session.strengths or "[]")
    except:
        strengths = ["Strong foundational communication."]

    try:
        improvements = json.loads(session.improvements or "[]")
    except:
        improvements = ["Practice speaking cadence."]

    try:
        recommendations = json.loads(session.recommendations or "[]")
    except:
        recommendations = ["Conduct regular mock interviews."]

    return AssessmentReportResponse(
        session_id=session.id,
        candidate_name=candidate_name,
        role_title=session.role_title,
        difficulty=session.difficulty,
        completed_at=session.completed_at,
        overall_score=session.overall_score,
        status=session.status,
        metrics={
            "overall_score": session.overall_score,
            "cadence_wpm": session.cadence_wpm,
            "clarity_score": session.clarity_score,
            "star_score": session.star_score,
            "filler_words_count": session.filler_words_count,
            "total_answers": len(answers),
        },
        strengths=strengths,
        improvements=improvements,
        recommendations=recommendations,
        questions_evaluated=evaluated_questions,
    )


@router.get("/my-history", summary="Get Candidate Interview History")
def get_my_interview_history(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """
    Retrieve candidate's historical mock interviews and scores for Candidate Dashboard.
    """
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    return [
        {
            "session_id": s.id,
            "role_title": s.role_title,
            "difficulty": s.difficulty,
            "status": s.status,
            "overall_score": s.overall_score,
            "cadence_wpm": s.cadence_wpm,
            "clarity_score": s.clarity_score,
            "star_score": s.star_score,
            "created_at": s.created_at.strftime("%b %d, %Y") if s.created_at else None,
            "completed_at": s.completed_at.strftime("%b %d, %Y") if s.completed_at else None,
        }
        for s in sessions
    ]


@router.get("/admin/stats", summary="Interview System Statistics")
def get_interview_system_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Platform-wide interview statistics for Administrator dashboard."""
    total_sessions = db.query(func.count(InterviewSession.id)).scalar() or 0
    completed_sessions = db.query(func.count(InterviewSession.id)).filter(InterviewSession.status == "completed").scalar() or 0
    avg_score = db.query(func.avg(InterviewSession.overall_score)).filter(InterviewSession.status == "completed").scalar() or 0
    total_questions = db.query(func.count(PracticeQuestion.id)).scalar() or 0

    return {
        "total_mock_interviews": total_sessions,
        "completed_interviews": completed_sessions,
        "average_score": round(float(avg_score), 1),
        "total_practice_questions": total_questions,
    }

