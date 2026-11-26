
from pathlib import Path

from docx import Document
from pypdf import PdfReader


def extract_resume_text(file_path: str, file_type: str) -> str:
    """
    Extract readable text from PDF or DOCX resumes.
    """

    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError("Resume file not found")

    if file_type == ".pdf":
        reader = PdfReader(str(path))

        if reader.is_encrypted:
            raise ValueError("Encrypted PDF files are not supported")

        extracted_text = "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        )

    elif file_type == ".docx":
        document = Document(str(path))

        extracted_text = "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        )

    else:
        raise ValueError("Unsupported resume format")

    return extracted_text.strip()
