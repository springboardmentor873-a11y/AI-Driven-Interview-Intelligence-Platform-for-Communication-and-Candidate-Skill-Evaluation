import time
import json
import logging
from typing import Generator, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

logger = logging.getLogger("smarthire_ai.database")

# 1. Resolve connection URL from environment variables
configured_url = settings.sync_database_url

def create_active_engine():
    """
    Initializes a database engine with smart fallback:
    Attempts connection to PostgreSQL. If PostgreSQL is offline or unreachable,
    it automatically falls back to local SQLite (sqlite:///./smarthire.db)
    so the entire application remains 100% operational and never hangs or crashes.
    """
    if configured_url.startswith("sqlite"):
        kwargs: Dict[str, Any] = {"connect_args": {"check_same_thread": False}}
        if ":memory:" in configured_url:
            kwargs["poolclass"] = StaticPool
        return create_engine(configured_url, **kwargs)

    # Attempt PostgreSQL with a fast 2-second timeout probe
    try:
        test_kwargs = {
            "pool_pre_ping": True,
            "pool_size": 10,
            "max_overflow": 20,
            "pool_recycle": 3600,
            "connect_args": {"connect_timeout": 2},
        }
        pg_engine = create_engine(configured_url, **test_kwargs)
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected to PostgreSQL database at {pg_engine.url.render_as_string(hide_password=True)}")
        return pg_engine
    except Exception as exc:
        logger.warning(
            f"PostgreSQL connection to {configured_url} failed ({exc}). "
            f"Activating resilient SQLite fallback database (sqlite:///./smarthire.db) "
            f"so all features remain fully functional."
        )
        sqlite_fallback = "sqlite:///./smarthire.db"
        return create_engine(sqlite_fallback, connect_args={"check_same_thread": False})


# Active SQLAlchemy Engine & Session Factory
engine = create_active_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base for ORM Models
Base = declarative_base()


def get_db() -> Generator:
    """
    FastAPI dependency yielding a clean database session per HTTP request.
    Automatically closes the session in a finally block once request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_default_data(db_session) -> None:
    """
    Seeds initial demo accounts (Candidate, Recruiter, Admin),
    candidate profile, sample resume, mock interview session,
    and curated practice questions if the database is newly initialized.
    """
    try:
        from app.models.user import User, UserRole, AccountStatus
        from app.models.profile import CandidateProfile, RecruiterProfile
        from app.models.interview import PracticeQuestion, InterviewSession
        from app.models.resume import Resume
        from app.core.security import hash_password

        # Check if users already exist
        has_users = db_session.query(User).first() is not None
        if not has_users:
            logger.info("Database has no users. Seeding initial demo users...")

            # 1. Candidate Demo Account
            candidate = User(
                full_name="Alex Morgan",
                email="candidate@smarthire.ai",
                phone_number="+1-555-0199",
                hashed_password=hash_password("CandidatePass123!"),
                role=UserRole.CANDIDATE.value,
                account_status=AccountStatus.ACTIVE.value,
            )
            db_session.add(candidate)
            db_session.flush()

            cand_profile = CandidateProfile(
                user_id=candidate.id,
                headline="Senior Full Stack Engineer | React, Node.js & Cloud Architecture",
                phone_number="+1-555-0199",
                skills="React, TypeScript, Node.js, Python, FastAPI, PostgreSQL, Docker, AWS",
                experience_years=5,
                education="B.S. in Computer Science, Stanford University",
                github_url="https://github.com/alexmorgan-dev",
                linkedin_url="https://linkedin.com/in/alexmorgan-dev",
            )
            db_session.add(cand_profile)

            # 2. Recruiter Demo Account
            recruiter = User(
                full_name="Sarah Jenkins",
                email="recruiter@techcorp.com",
                phone_number="+1-555-0142",
                hashed_password=hash_password("RecruiterPass123!"),
                role=UserRole.RECRUITER.value,
                account_status=AccountStatus.ACTIVE.value,
            )
            db_session.add(recruiter)
            db_session.flush()

            rec_profile = RecruiterProfile(
                user_id=recruiter.id,
                company_name="TechCorp Global Solutions",
                company_website="https://techcorp.example.com",
                designation="Lead Technical Talent Partner",
                phone_number="+1-555-0142",
            )
            db_session.add(rec_profile)

            # 3. Admin Demo Account
            admin = User(
                full_name="System Administrator",
                email="admin@smarthire.ai",
                phone_number="+1-555-0100",
                hashed_password=hash_password("AdminPass123!"),
                role=UserRole.ADMIN.value,
                account_status=AccountStatus.ACTIVE.value,
            )
            db_session.add(admin)
            db_session.flush()

            # Sample Resume for Candidate
            sample_resume = Resume(
                user_id=candidate.id,
                original_filename="Alex_Morgan_Senior_FullStack_Resume.pdf",
                stored_filename="alex_morgan_resume_v1.pdf",
                file_path="uploads/resumes/alex_morgan_resume_v1.pdf",
                file_type="application/pdf",
                file_size=245760,
                upload_status="uploaded",
            )
            db_session.add(sample_resume)

            # Sample Completed Mock Interview Session
            sample_session = InterviewSession(
                user_id=candidate.id,
                role_title="Full Stack Engineer",
                difficulty="Medium",
                status="completed",
                overall_score=88.5,
                cadence_wpm=138.0,
                clarity_score=92.0,
                star_score=86.0,
                behavioral_score=90.0,
                technical_score=87.0,
                filler_words_count=2,
                strengths=json.dumps([
                    "Exceptional speaking cadence averaging 138 words per minute.",
                    "High adherence to the STAR methodology with explicit Action and Context descriptions.",
                    "Demonstrated senior-level clarity, domain proficiency, and problem-solving depth."
                ]),
                improvements=json.dumps([
                    "Quantify the 'Result' pillar even further with concrete percent metrics.",
                    "Continue refining edge-case considerations during system design discussions."
                ]),
                recommendations=json.dumps([
                    "Use the 'Situation-Task-Action-Result' framework as your automatic mental checklist.",
                    "Record 2 more mock sessions focusing on system scalability.",
                    "Highlight cross-functional collaboration and business ROI in your architectural decisions."
                ]),
            )
            db_session.add(sample_session)
            db_session.commit()

        # Check if questions exist
        has_questions = db_session.query(PracticeQuestion).first() is not None
        if not has_questions:
            logger.info("Seeding curated interview practice question bank...")
            questions = [
                PracticeQuestion(
                    category="Behavioral",
                    role_target="All",
                    difficulty="Medium",
                    question_text="Tell me about a complex project where you faced unforeseen technical hurdles. How did you diagnose and overcome them?",
                    rubric_guide="Assess STAR methodology: clear Situation, high-stakes Task, strategic Action taken, and quantifiable business Result.",
                    sample_answer="In my previous role, our payment service experienced intermittent timeouts during high traffic. I analyzed tracing telemetry, identified connection pool exhaustion, and increased Redis caching..."
                ),
                PracticeQuestion(
                    category="Behavioral",
                    role_target="All",
                    difficulty="Medium",
                    question_text="Describe a situation where you had a strong disagreement with a colleague on a technical architecture decision. How did you resolve it?",
                    rubric_guide="Look for empathy, data-driven benchmarking, constructive communication, and team alignment.",
                    sample_answer="During a refactoring sprint, a teammate advocated for an in-memory queue while I favored Redis. We built a rapid benchmark measuring latency under simulated node crashes..."
                ),
                PracticeQuestion(
                    category="Technical",
                    role_target="Frontend Engineer",
                    difficulty="Medium",
                    question_text="Explain how the React Virtual DOM works, and how keys in lists prevent unnecessary DOM re-renders.",
                    rubric_guide="Evaluate understanding of reconciliation, tree diffing heuristics, component lifecycles, and render optimization.",
                    sample_answer="The Virtual DOM is an in-memory lightweight representation of the real DOM. When state changes, React creates a new tree and diffs it with the previous snapshot..."
                ),
                PracticeQuestion(
                    category="Technical",
                    role_target="Full Stack Engineer",
                    difficulty="Hard",
                    question_text="How do you architect database connection pooling and manage transactions across microservices to prevent connection starvation?",
                    rubric_guide="Evaluate ACID understanding, connection pool limits, max_overflow settings, and the Saga pattern.",
                    sample_answer="Connection pooling maintains pre-warmed persistent connections to avoid handshake latency. We tune pool_size and max_overflow based on concurrency and implement circuit breakers..."
                ),
                PracticeQuestion(
                    category="System Design",
                    role_target="Full Stack Engineer",
                    difficulty="Hard",
                    question_text="Design a scalable URL shortening service (like Bitly) capable of handling 10,000 requests per second with high availability.",
                    rubric_guide="Evaluate capacity estimation, Base62 encoding, Redis caching strategy, database sharding, and fault tolerance.",
                    sample_answer="To design Bitly at 10k RPS, we calculate storage for 100M URLs requiring roughly 50GB. We use Base62 token generation with distributed counter ranges..."
                ),
                PracticeQuestion(
                    category="Situational",
                    role_target="All",
                    difficulty="Easy",
                    question_text="If you were tasked with leading a sprint under a tight deadline with incomplete specifications, what concrete steps would you take?",
                    rubric_guide="Evaluate prioritization, MVP definition, proactive communication with stakeholders, and iterative delivery.",
                    sample_answer="I would convene an immediate 30-minute sync with the product manager to define the core MVP user journey, deprioritize non-essential edge cases, and establish milestone checkpoints..."
                ),
            ]
            for q in questions:
                db_session.add(q)
            db_session.commit()
            logger.info("Successfully seeded SmartHire AI practice questions.")
    except Exception as exc:
        db_session.rollback()
        logger.error(f"Error seeding demo data: {exc}")


def init_db() -> bool:
    """
    Initializes all registered database tables (users, profiles, resumes, interviews)
    and seeds initial demo data. Called on application startup.
    """
    try:
        # Import all models to ensure they are registered in Base.metadata
        from app.models import (
            User, Resume, UserSession, CandidateProfile, RecruiterProfile,
            PracticeQuestion, InterviewSession, InterviewAnswer
        )
        logger.info(f"Connecting to database: {engine.url.render_as_string(hide_password=True)}")
        Base.metadata.create_all(bind=engine)
        logger.info("All database tables verified / created successfully.")

        # Seed initial demo data
        with SessionLocal() as session:
            seed_default_data(session)

        return True
    except Exception as exc:
        logger.warning(f"Database initialization warning: {exc}.")
        return False


def check_db_connection() -> Dict[str, Any]:
    """
    Pings the database, verifies connectivity, and computes latency in milliseconds.
    """
    start_time = time.time()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "status": "connected",
            "latency_ms": latency_ms,
            "dialect": engine.dialect.name,
            "database_name": engine.url.database or "smarthire.db",
            "host": engine.url.host or "local",
        }
    except Exception as exc:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "status": "disconnected",
            "latency_ms": latency_ms,
            "error": str(exc),
            "database_name": engine.url.database or "smarthire.db",
        }
