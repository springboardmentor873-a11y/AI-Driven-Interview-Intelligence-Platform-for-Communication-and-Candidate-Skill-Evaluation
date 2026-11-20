from django.utils import timezone
from pypdf import PdfReader
from pypdf.errors import PdfReadError
import re

from apps.ai_services import extract_resume_profile_from_text


class ResumeParseError(Exception):
    pass


def extract_resume_contact_fields(resume_text):
    lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
    name = ""
    explicit_name = re.search(
        r"(?im)^\s*(?:candidate\s+)?name\s*[:\-]\s*(.+?)\s*$",
        resume_text,
    )
    name_candidate = explicit_name.group(1).strip() if explicit_name else ""
    if not name_candidate and lines:
        name_candidate = lines[0].split("|", 1)[0].strip()
    name_candidate = re.sub(r"\s+", " ", name_candidate)
    if re.fullmatch(
        r"[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}",
        name_candidate,
    ) and not re.search(
        r"\b(engineer|developer|manager|analyst|student|resume|curriculum|"
        r"vitae|professional|software|data)\b",
        name_candidate,
        re.IGNORECASE,
    ):
        name = name_candidate[:120]

    email_match = re.search(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        resume_text,
        re.IGNORECASE,
    )
    phone = ""
    for match in re.finditer(
        r"(?<!\w)\+?\d[\d().\s-]{6,}\d(?!\w)",
        resume_text,
    ):
        digits = re.sub(r"\D", "", match.group())
        if 10 <= len(digits) <= 15:
            phone = match.group().strip()[:40]
            break

    return {
        "candidate_name": name,
        "email": email_match.group()[:254] if email_match else "",
        "phone": phone,
    }


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
    try:
        with resume.file.open("rb") as resume_file:
            resume_text = extract_resume_text(resume_file)
    except OSError as exc:
        raise ResumeParseError(
            "The uploaded file could not be read as a PDF."
        ) from exc
    contact = extract_resume_contact_fields(resume_text)
    result = extract_resume_profile_from_text(
        resume_text,
        candidate_names=[
            contact["candidate_name"],
            resume.owner.get_full_name(),
            resume.owner.username,
        ],
        local_only=local_only,
    )
    profile = result.data
    resume.extracted_skills = profile["skills"]
    resume.extracted_qualifications = profile["qualifications"]
    resume.extracted_education = profile.get("education", [])
    resume.extracted_technologies = profile.get("technologies", [])
    resume.extracted_certifications = profile.get("certifications", [])
    resume.extracted_experience = profile["experience"]
    resume.extracted_projects = profile["projects"]
    resume.extracted_candidate_name = contact["candidate_name"]
    resume.extracted_email = contact["email"]
    resume.extracted_phone = contact["phone"]
    resume.extracted_summary = profile.get("summary", "")
    resume.skills_extracted_at = timezone.now()
    resume.extraction_source = result.source
    resume.save(
        update_fields=[
            "extracted_skills",
            "extracted_qualifications",
            "extracted_education",
            "extracted_technologies",
            "extracted_certifications",
            "extracted_experience",
            "extracted_projects",
            "extracted_candidate_name",
            "extracted_email",
            "extracted_phone",
            "extracted_summary",
            "skills_extracted_at",
            "extraction_source",
        ]
    )
    return result
