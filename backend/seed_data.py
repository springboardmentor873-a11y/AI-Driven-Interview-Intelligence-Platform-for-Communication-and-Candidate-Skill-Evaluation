"""
SmartHire AI - Database Seeder Script (Milestone 1)
Usage: python seed_data.py
Creates default demo accounts for Admin, Recruiter, and Candidate for rapid testing and internship evaluation.
"""

import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.database import SessionLocal, Base, engine
from app.models.user import User, UserRole, AccountStatus
from app.models.profile import CandidateProfile, RecruiterProfile
from app.core.security import hash_password


def seed_database():
    print("==================================================")
    print("   SmartHire AI - Seeding Milestone 1 Demo Data   ")
    print("==================================================")

    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Admin Account
        admin_email = "admin@smarthire.ai"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=hash_password("AdminPass123!"),
                full_name="System Administrator",
                phone_number="+91-9000000001",
                role=UserRole.ADMIN.value,
                account_status=AccountStatus.ACTIVE.value,
            )
            db.add(admin_user)
            print(f"  [+] Created Admin: {admin_email} (Password: AdminPass123!)")
        else:
            print(f"  [i] Admin account already exists: {admin_email}")

        # 2. Seed Recruiter Account & Profile
        recruiter_email = "recruiter@techcorp.com"
        recruiter_user = db.query(User).filter(User.email == recruiter_email).first()
        if not recruiter_user:
            recruiter_user = User(
                email=recruiter_email,
                hashed_password=hash_password("RecruiterPass123!"),
                full_name="Sneha Kapoor",
                phone_number="+91-9876543210",
                role=UserRole.RECRUITER.value,
                account_status=AccountStatus.ACTIVE.value,
            )
            db.add(recruiter_user)
            db.flush()

            recruiter_profile = RecruiterProfile(
                user_id=recruiter_user.id,
                company_name="TechCorp Global",
                company_website="https://techcorp.example.com",
                designation="Lead Technical Recruiter",
                phone_number="+91-9876543210",
            )
            db.add(recruiter_profile)
            print(f"  [+] Created Recruiter: {recruiter_email} (Password: RecruiterPass123!)")
        else:
            print(f"  [i] Recruiter account already exists: {recruiter_email}")

        # 3. Seed Candidate Account & Profile
        candidate_email = "candidate@smarthire.ai"
        candidate_user = db.query(User).filter(User.email == candidate_email).first()
        if not candidate_user:
            candidate_user = User(
                email=candidate_email,
                hashed_password=hash_password("CandidatePass123!"),
                full_name="Aarav Sharma",
                phone_number="+91-9123456780",
                role=UserRole.CANDIDATE.value,
                account_status=AccountStatus.ACTIVE.value,
            )
            db.add(candidate_user)
            db.flush()

            candidate_profile = CandidateProfile(
                user_id=candidate_user.id,
                headline="Aspiring AI Engineer & Full Stack Developer",
                phone_number="+91-9123456780",
                skills="Python, FastAPI, React, PostgreSQL, Docker, Machine Learning",
                experience_years=1,
                education="B.Tech in Computer Science & Engineering",
                github_url="https://github.com/aarav-sharma",
                linkedin_url="https://linkedin.com/in/aarav-sharma",
            )
            db.add(candidate_profile)
            print(f"  [+] Created Candidate: {candidate_email} (Password: CandidatePass123!)")
        else:
            print(f"  [i] Candidate account already exists: {candidate_email}")

        db.commit()
        print("\n==================================================")
        print("   Database Seeding Completed Successfully!       ")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Database seeding failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
