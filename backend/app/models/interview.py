import uuid
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.database.database import Base


class PracticeQuestion(Base):
    """
    Practice Questions Bank:
    Curated interview questions covering Behavioral (STAR), Technical, System Design, and Situational topics.
    """
    __tablename__ = "practice_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category = Column(String(50), nullable=False, index=True)  # Behavioral, Technical, System Design, Situational
    role_target = Column(String(100), default="All", nullable=False, index=True)  # Frontend, Backend, Full Stack, etc.
    difficulty = Column(String(30), default="Medium", nullable=False)  # Easy, Medium, Hard
    question_text = Column(Text, nullable=False)
    rubric_guide = Column(Text, nullable=True)  # STAR criteria or key topics to cover
    sample_answer = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    answers = relationship("InterviewAnswer", back_populates="question")

    def __repr__(self):
        return f"<PracticeQuestion id={self.id} category={self.category} difficulty={self.difficulty}>"


class InterviewSession(Base):
    """
    Interview Session:
    Tracks an interactive mock interview conducted by a candidate.
    Stores composite metrics, speaking cadence, STAR evaluation, and AI feedback.
    """
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_title = Column(String(100), default="Full Stack Engineer", nullable=False)
    difficulty = Column(String(30), default="Medium", nullable=False)
    status = Column(String(30), default="in_progress", nullable=False, index=True)  # in_progress, completed, abandoned

    # Composite AI Scoring
    overall_score = Column(Float, default=0.0, nullable=False)
    cadence_wpm = Column(Float, default=0.0, nullable=False)
    clarity_score = Column(Float, default=0.0, nullable=False)
    star_score = Column(Float, default=0.0, nullable=False)
    behavioral_score = Column(Float, default=0.0, nullable=False)
    technical_score = Column(Float, default=0.0, nullable=False)
    filler_words_count = Column(Integer, default=0, nullable=False)

    # Detailed AI Insights (JSON string)
    strengths = Column(Text, nullable=True)
    improvements = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    answers = relationship("InterviewAnswer", back_populates="session", cascade="all, delete-orphan", order_by="InterviewAnswer.created_at")

    def __repr__(self):
        return f"<InterviewSession id={self.id} user_id={self.user_id} score={self.overall_score} status={self.status}>"


class InterviewAnswer(Base):
    """
    Interview Answer:
    A single question answer within an interview session.
    Contains voice transcript, speaking cadence (WPM), detected filler words, and individual AI rubric score.
    """
    __tablename__ = "interview_answers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("practice_questions.id", ondelete="SET NULL"), nullable=True)
    question_text = Column(Text, nullable=False)
    category = Column(String(50), default="Behavioral", nullable=False)

    transcript = Column(Text, nullable=False)
    duration_seconds = Column(Integer, default=60, nullable=False)
    wpm = Column(Float, default=0.0, nullable=False)
    filler_count = Column(Integer, default=0, nullable=False)
    filler_words = Column(Text, nullable=True)  # JSON string of detected filler words

    score = Column(Float, default=0.0, nullable=False)
    ai_feedback = Column(Text, nullable=True)
    star_breakdown = Column(Text, nullable=True)  # JSON string with S, T, A, R sub-scores

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("InterviewSession", back_populates="answers")
    question = relationship("PracticeQuestion", back_populates="answers")

    def __repr__(self):
        return f"<InterviewAnswer id={self.id} score={self.score} wpm={self.wpm}>"
