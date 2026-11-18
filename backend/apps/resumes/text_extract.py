import logging

import pdfplumber

logger = logging.getLogger(__name__)

MAX_PAGES = 10
MAX_CHARS = 20000


def extract_text(file_obj) -> str:
    """Return the text of a PDF, or "" if it cannot be read.

    Never raises: a resume that cannot be parsed (scanned image, odd encoding)
    must still upload successfully.
    """
    try:
        with pdfplumber.open(file_obj) as pdf:
            pages = [(page.extract_text() or "") for page in pdf.pages[:MAX_PAGES]]
    except Exception as exc:
        logger.warning("Could not read resume PDF: %s", exc)
        return ""
    text = "\n".join(p.strip() for p in pages if p.strip())
    return text[:MAX_CHARS]
