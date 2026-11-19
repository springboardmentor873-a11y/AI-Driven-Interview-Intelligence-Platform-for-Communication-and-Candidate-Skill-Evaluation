from .models import Resume
from .skill_extract import analyze
from .text_extract import extract_text

PARSED_FIELDS = ("skills", "technologies", "experience", "education", "summary")


def parse_resume(resume):
    """Read the saved PDF and (re)fill the resume's text and parsed fields.

    Used on upload and by the re-analyze button. If the PDF has no readable text
    the parsed fields are simply left empty. Raises Resume.DoesNotExist if the
    resume was deleted while it was being analysed (the AI call can take seconds).
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
    # A queryset update instead of resume.save(): if the row is gone this reports 0 rows
    # instead of crashing with a database error
    values = {name: getattr(resume, name) for name in ("extracted_text", "parse_source", *PARSED_FIELDS)}
    if not Resume.objects.filter(pk=resume.pk).update(**values):
        raise Resume.DoesNotExist("The resume was deleted while it was being analysed.")
    return resume
