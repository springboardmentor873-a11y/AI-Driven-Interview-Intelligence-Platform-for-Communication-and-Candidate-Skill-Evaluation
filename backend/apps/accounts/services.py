from django.utils import timezone
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from apps.ai_services import extract_resume_profile_from_text


class ResumeParseError(Exception):
    pass


def extract_resume_text(resume_file):
    try:
        reader = PdfReader(resume_file)
        if reader.is_encrypted:
            raise ResumeParseError(
                "Password-protected resumes cannot be analyzed."
            )
        text = "\n".join(
            page_text
            for page in reader.pages
            if (page_text := page.extract_text())
        )
    except (PdfReadError, OSError) as exc:
        raise ResumeParseError(
            "The uploaded file could not be read as a PDF."
        ) from exc

    text = text.strip()
    if not text:
        raise ResumeParseError(
            "No selectable text was found in the PDF. Upload a text-based PDF."
        )
    return text[:20000]


def extract_skills_for_resume(resume, *, local_only=False):
    resume_text = extract_resume_text(resume.file)
    result = extract_resume_profile_from_text(
        resume_text,
        candidate_names=[
            resume.owner.get_full_name(),
            resume.owner.username,
        ],
        local_only=local_only,
    )
    profile = result.data
    resume.extracted_skills = profile["skills"]
    resume.extracted_qualifications = profile["qualifications"]
    resume.extracted_experience = profile["experience"]
    resume.extracted_projects = profile["projects"]
    resume.skills_extracted_at = timezone.now()
    resume.extraction_source = result.source
    resume.save(
        update_fields=[
            "extracted_skills",
            "extracted_qualifications",
            "extracted_experience",
            "extracted_projects",
            "skills_extracted_at",
            "extraction_source",
        ]
    )
    return result
