
import traceback
import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pypdf import PdfReader
from google import genai

from app.database import get_db
from app.models import Resume, ResumeSkill
from app.dependencies import get_current_user


load_dotenv()

router = APIRouter(
    prefix="/api/resume-ai",
    tags=["AI Resume Processing"]
)

BASE_DIR = Path(__file__).resolve().parents[2]


def get_resume_text(resume_path: Path):
    reader = PdfReader(str(resume_path))

    extracted_text = ""

    for page in reader.pages:
        extracted_text += (page.extract_text() or "") + "\n"

    extracted_text = extracted_text.strip()

    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail="No readable text found in the PDF"
        )

    return extracted_text, len(reader.pages)


@router.get("/extract-text")
def extract_resume_text(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can process resumes"
        )

    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Please upload your resume first"
        )

    resume_path = BASE_DIR / resume.file_path

    if not resume_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Resume file not found on server"
        )

    try:
        extracted_text, total_pages = get_resume_text(resume_path)

        return {
            "message": "Resume text extracted successfully",
            "resume_id": resume.id,
            "file_name": resume.file_name,
            "total_pages": total_pages,
            "extracted_text": extracted_text
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to extract text from the resume"
        )


@router.post("/extract-skills")
def extract_resume_skills(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can extract resume skills"
        )

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured"
        )

    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Please upload your resume first"
        )

    resume_path = BASE_DIR / resume.file_path

    if not resume_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Resume file not found on server"
        )

    try:
        extracted_text, total_pages = get_resume_text(resume_path)

        prompt = f"""
You are an expert AI resume analyzer.

Analyze the following resume and extract skills that are
explicitly mentioned or clearly demonstrated in it.

Do not invent skills.
Do not assume a skill only because it is commonly used
with another technology.

Categorize the skills into these groups:

1. programming_languages
2. frameworks_and_libraries
3. databases
4. tools_and_platforms
5. core_concepts
6. soft_skills
7. other_skills

Return ONLY valid JSON in this exact structure:

{{
    "programming_languages": [],
    "frameworks_and_libraries": [],
    "databases": [],
    "tools_and_platforms": [],
    "core_concepts": [],
    "soft_skills": [],
    "other_skills": []
}}

Resume content:

{extracted_text}
"""

        client = genai.Client(api_key=api_key)

        response = None

        # Retry Gemini API up to 3 times for temporary 503 errors
        for attempt in range(3):
            try:
                print(f"Gemini API attempt: {attempt + 1}/3")

                response = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                    config={
                        "temperature": 0.1,
                        "response_mime_type": "application/json"
                    }
                )

                break

            except Exception as e:
                error_message = str(e)

                if "503" in error_message or "UNAVAILABLE" in error_message:

                    if attempt < 2:
                        print(
                            "Gemini is busy. Retrying after 2 seconds..."
                        )
                        time.sleep(2)

                    else:
                        print(
                            "Gemini API failed after 3 attempts."
                        )

                        raise HTTPException(
                            status_code=503,
                            detail=(
                                "Gemini AI is temporarily busy. "
                                "Please try again later."
                            )
                        )

                else:
                    raise

        if response is None or not response.text:
            raise ValueError(
                "Empty response received from Gemini"
            )

        skills_data = json.loads(response.text)

        if not isinstance(skills_data, dict):
            raise ValueError(
                "Invalid skills response format"
            )

        required_categories = [
            "programming_languages",
            "frameworks_and_libraries",
            "databases",
            "tools_and_platforms",
            "core_concepts",
            "soft_skills",
            "other_skills"
        ]

        for category in required_categories:
            if category not in skills_data:
                skills_data[category] = []

            if not isinstance(skills_data[category], list):
                raise ValueError(
                    f"Invalid skills format for category: {category}"
                )

        # Save or update skills in PostgreSQL
        existing_skills = db.query(ResumeSkill).filter(
            ResumeSkill.resume_id == resume.id
        ).first()

        if existing_skills:
            existing_skills.skills = skills_data

        else:
            new_skills = ResumeSkill(
                resume_id=resume.id,
                user_id=current_user.id,
                skills=skills_data
            )

            db.add(new_skills)

        db.commit()

        return {
            "message": "Resume skills extracted successfully",
            "resume_id": resume.id,
            "file_name": resume.file_name,
            "skills": skills_data
        }

    except HTTPException:
        db.rollback()
        raise

    except json.JSONDecodeError:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail="Gemini returned an invalid JSON response"
        )

    except Exception as e:
        db.rollback()

        print(
            "\n========== RESUME SKILL EXTRACTION ERROR =========="
        )
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        traceback.print_exc()
        print("===================================================\n")

        raise HTTPException(
            status_code=502,
            detail="Unable to analyze resume using Gemini AI"
        )


@router.get("/my-skills")
def get_my_resume_skills(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can view resume skills"
        )

    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Please upload your resume first"
        )

    resume_skills = db.query(ResumeSkill).filter(
        ResumeSkill.resume_id == resume.id,
        ResumeSkill.user_id == current_user.id
    ).first()

    if not resume_skills:
        raise HTTPException(
            status_code=404,
            detail="Resume skills not extracted yet"
        )

    return {
        "message": "Resume skills fetched successfully",
        "resume_id": resume.id,
        "file_name": resume.file_name,
        "skills": resume_skills.skills,
        "created_at": resume_skills.created_at,
        "updated_at": resume_skills.updated_at
    }
