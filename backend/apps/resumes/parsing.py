from .skill_extract import analyze
from .text_extract import extract_text

PARSED_FIELDS = ("skills", "technologies", "experience", "education", "summary")


def parse_resume(resume):
    """Read the saved PDF and (re)fill the resume's text and parsed fields.

    Used on upload and by the re-analyze button. Never raises: if the PDF has
    no readable text the parsed fields are simply left empty.
    """
    try:
        with resume.file.open("rb") as stored:
            resume.extracted_text = extract_text(stored)
    except (FileNotFoundError, ValueError, OSError):
        resume.extracted_text = ""
    result, source = analyze(resume.extracted_text)
    for field, value in result.items():
        setattr(resume, field, value)
    resume.parse_source = source
    resume.save(update_fields=["extracted_text", "parse_source", *PARSED_FIELDS])
    return resume
