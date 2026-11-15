
import re
from pathlib import Path

import pymupdf


# --------------------------------------------------
# TECHNICAL SKILLS
# --------------------------------------------------

SKILL_PATTERNS = {
    "Python": r"\bPython\b",
    "Java": r"\bJava\b",
    "C": r"\bC\b",
    "C++": r"\bC\+\+",
    "JavaScript": r"\bJavaScript\b",
    "TypeScript": r"\bTypeScript\b",
    "React": r"\bReact\b",
    "Node.js": r"\bNode\.js\b",
    "HTML": r"\bHTML5?\b",
    "CSS": r"\bCSS3?\b",
    "FastAPI": r"\bFastAPI\b",
    "Django": r"\bDjango\b",
    "Flask": r"\bFlask\b",
    "REST APIs": r"\bREST\s+APIs?\b",
    "SQL": r"\bSQL\b",
    "MySQL": r"\bMySQL\b",
    "PostgreSQL": r"\bPostgreSQL\b",
    "MongoDB": r"\bMongoDB\b",
    "AWS": r"\bAWS\b",
    "Docker": r"\bDocker\b",
    "Git": r"\bGit\b",
    "GitHub": r"\bGitHub\b",
    "Linux": r"\bLinux\b",
    "Machine Learning": r"\bMachine Learning\b",
    "Deep Learning": r"\bDeep Learning\b",
    "Artificial Intelligence": r"\bArtificial Intelligence\b",
    "TensorFlow": r"\bTensorFlow\b",
    "PyTorch": r"\bPyTorch\b",
    "OpenCV": r"\bOpenCV\b",
    "YOLO": r"\bYOLO\b",
    "IoT": r"\bIoT\b",
    "Embedded Systems": r"\bEmbedded Systems\b",
    "Arduino": r"\bArduino\b",
    "ESP32": r"\bESP32\b",
    "Raspberry Pi": r"\bRaspberry Pi\b",
    "VLSI": r"\bVLSI\b",
    "Verilog": r"\bVerilog\b",
    "SystemVerilog": r"\bSystemVerilog\b",
    "PCB Design": r"\bPCB Design\b",
    "MATLAB": r"\bMATLAB\b",
    "Data Structures": r"\bData Structures\b",
    "OOP": r"\bOOP\b",
    "Networking": r"\bNetworking\b",
    "Cyber Security": r"\bCyber Security\b",
}


# --------------------------------------------------
# SECTION HEADINGS
# --------------------------------------------------

SECTION_HEADINGS = {
    "education": [
        "education",
        "academic qualifications",
        "academic background",
    ],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "internship",
        "internship & practical experience",
        "internships",
        "employment history",
    ],
    "projects": [
        "projects",
        "academic projects",
        "personal projects",
    ],
    "skills": [
        "skills",
        "technical skills",
        "programming languages",
        "technical expertise",
    ],
}


def normalize_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def identify_section_heading(line: str):
    cleaned = normalize_line(line).lower().strip(" :")

    for section, headings in SECTION_HEADINGS.items():
        for heading in headings:
            if cleaned == heading:
                return section

    return None


# --------------------------------------------------
# PDF TEXT EXTRACTION
# --------------------------------------------------

def extract_text_from_pdf(file_path: str) -> str:

    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError("Resume PDF file not found")

    if path.suffix.lower() != ".pdf":
        raise ValueError("Only PDF files are supported")

    try:
        with pymupdf.open(path) as document:

            if document.is_encrypted:
                raise ValueError(
                    "Encrypted PDF files are not supported"
                )

            extracted_pages = [
                page.get_text("text")
                for page in document
            ]

    except pymupdf.FileDataError as exc:
        raise ValueError(
            "Unable to read the PDF file"
        ) from exc

    text = "\n".join(extracted_pages).strip()

    if not text:
        raise ValueError(
            "No readable text found. The PDF may be scanned."
        )

    return text


# --------------------------------------------------
# EMAIL EXTRACTION
# --------------------------------------------------

def extract_email(text: str):

    match = re.search(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        text
    )

    return match.group(0) if match else None


# --------------------------------------------------
# PHONE EXTRACTION
# --------------------------------------------------

def extract_phone(text: str):

    patterns = [
        r"(?<!\d)(?:\+91[-\s]?)?[6-9]\d{9}(?!\d)",
        r"(?<!\d)\+?\d{1,3}[-.\s]\d{3,5}[-.\s]\d{4,6}(?!\d)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if match:
            return match.group(0).strip()

    return None


# --------------------------------------------------
# CANDIDATE NAME
# --------------------------------------------------

def extract_candidate_name(text: str):

    for line in text.splitlines():

        cleaned = normalize_line(line)

        if not cleaned:
            continue

        if "@" in cleaned:
            continue

        if re.search(r"\d", cleaned):
            continue

        if len(cleaned.split()) > 5:
            continue

        if identify_section_heading(cleaned):
            continue

        if cleaned.isupper() and len(cleaned) >= 3:
            return cleaned

    return None


# --------------------------------------------------
# SKILL EXTRACTION
# --------------------------------------------------

def extract_skills(text: str) -> list[str]:

    found_skills = []

    for skill, pattern in SKILL_PATTERNS.items():

        if re.search(pattern, text, re.IGNORECASE):
            found_skills.append(skill)

    return found_skills


# --------------------------------------------------
# SECTION EXTRACTION
# --------------------------------------------------

def extract_sections(text: str) -> dict:

    sections = {
        "education": [],
        "experience": [],
        "projects": [],
        "skills": [],
    }

    current_section = None

    for line in text.splitlines():

        cleaned = normalize_line(line)

        if not cleaned:
            continue

        detected_section = identify_section_heading(cleaned)

        if detected_section:
            current_section = detected_section
            continue

        if current_section:
            sections[current_section].append(cleaned)

    return sections


# --------------------------------------------------
# EDUCATION EXTRACTION
# --------------------------------------------------

def extract_education(text: str) -> list[str]:

    sections = extract_sections(text)

    education = sections["education"]

    if education:
        return education[:20]

    # Fallback when the resume has no education heading

    keywords = [
        "b.tech",
        "b.e.",
        "bachelor",
        "m.tech",
        "master",
        "mca",
        "bca",
        "b.sc",
        "m.sc",
        "diploma",
        "intermediate",
        "university",
        "college",
    ]

    results = []

    for line in text.splitlines():

        cleaned = normalize_line(line)

        if any(
            keyword in cleaned.lower()
            for keyword in keywords
        ):
            results.append(cleaned)

    return results[:20]


# --------------------------------------------------
# EXPERIENCE EXTRACTION
# --------------------------------------------------

def extract_experience(text: str) -> dict:

    sections = extract_sections(text)

    experience_lines = sections["experience"]

    years_pattern = (
        r"\b(\d+(?:\.\d+)?)\s*\+?\s*"
        r"(?:years?|yrs?)\s*(?:of\s+)?experience\b"
    )

    years_match = re.search(
        years_pattern,
        text,
        re.IGNORECASE
    )

    experience_years = (
        float(years_match.group(1))
        if years_match
        else None
    )

    return {
        "experience_years": experience_years,
        "experience_details": experience_lines[:30],
    }


# --------------------------------------------------
# RESUME SUMMARY
# --------------------------------------------------

def extract_summary(text: str) -> str:

    lines = [
        normalize_line(line)
        for line in text.splitlines()
        if normalize_line(line)
    ]

    # Use the opening portion of the resume as a summary candidate.
    return " ".join(lines[1:7])[:1500]


# --------------------------------------------------
# MAIN RESUME PARSER
# --------------------------------------------------

def parse_resume(file_path: str) -> dict:

    text = extract_text_from_pdf(file_path)

    experience = extract_experience(text)

    return {
        "candidate_name": extract_candidate_name(text),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "education": extract_education(text),
        "experience_years": experience["experience_years"],
        "experience_details": experience["experience_details"],
        "summary": extract_summary(text),
        "extracted_text": text,
    }
