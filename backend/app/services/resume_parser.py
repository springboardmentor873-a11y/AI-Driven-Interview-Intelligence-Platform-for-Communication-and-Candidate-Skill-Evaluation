import os
import re
from typing import Dict, Any, List
from pypdf import PdfReader

# Comprehensive skill ontology for interview platforms
KNOWN_SKILLS = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "SQL", "HTML", "CSS",
    # Frontend
    "React", "Next.js", "Vue.js", "Angular", "Tailwind CSS", "Redux", "Bootstrap", "Sass", "Webpack", "Vite",
    # Backend & Frameworks
    "FastAPI", "Django", "Flask", "Node.js", "Express.js", "Spring Boot", "ASP.NET", "GraphQL", "REST APIs", "Microservices",
    # Databases & Storage
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Cassandra", "Elasticsearch", "DynamoDB",
    # Cloud & DevOps
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "GitHub Actions", "Terraform", "Linux", "Nginx",
    # AI / ML & Data Science
    "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Scikit-Learn", "NLP", "Computer Vision",
    "OpenCV", "MediaPipe", "Pandas", "NumPy", "LLM", "Prompt Engineering", "Whisper",
    # Soft & Professional Skills
    "Problem Solving", "System Design", "Agile", "Scrum", "Git", "Object-Oriented Programming", "Leadership",
    "Team Collaboration", "Communication", "Time Management"
]

TECH_CATEGORIES = {
    "Languages": ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "SQL"],
    "Frameworks & Libraries": ["React", "Next.js", "Vue.js", "FastAPI", "Django", "Flask", "Node.js", "Express.js", "Spring Boot"],
    "Cloud & Infrastructure": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Linux", "Terraform"],
    "Databases": ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Elasticsearch"],
    "AI & Data": ["Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "NLP", "Computer Vision", "Pandas", "NumPy"]
}

DEGREE_PATTERNS = [
    r"\b(B\.?Tech|Bachelor of Technology|B\.?E\.?|Bachelor of Engineering|B\.?S\.?|Bachelor of Science|B\.?C\.?A\.?)\b",
    r"\b(M\.?Tech|Master of Technology|M\.?S\.?|Master of Science|M\.?C\.?A\.?|M\.?B\.?A\.?)\b",
    r"\b(Ph\.?D|Doctor of Philosophy)\b",
    r"\b(Diploma|Associate Degree|High School)\b"
]

FIELD_PATTERNS = [
    r"\b(Computer Science|Information Technology|Data Science|Artificial Intelligence|Software Engineering|Electronics|Electrical|Mechanical)\b"
]

def extract_text_from_file(file_path: str) -> str:
    """Extract raw text from PDF or text file."""
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    if ext == ".pdf":
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            text = f"Error reading PDF: {str(e)}"
    else:
        # Fallback to UTF-8 plain text reading
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            text = f"Error reading text file: {str(e)}"
            
    return text.strip()

def extract_skills(text: str) -> List[str]:
    """Identify matched skills from text with word boundaries and case insensitivity."""
    found = []
    text_lower = text.lower()
    for skill in KNOWN_SKILLS:
        # Match with boundaries (taking care of special chars like C++, C#)
        pattern = r'(?<![a-zA-Z0-9])' + re.escape(skill.lower()) + r'(?![a-zA-Z0-9])'
        if re.search(pattern, text_lower):
            found.append(skill)
    return sorted(list(set(found)))

def extract_technologies(skills: List[str]) -> List[str]:
    """Group and identify specific technology stacks."""
    tech_detected = []
    for skill in skills:
        for cat, items in TECH_CATEGORIES.items():
            if skill in items:
                tech_detected.append(skill)
                break
    return sorted(list(set(tech_detected)))

def extract_experience(text: str) -> Dict[str, Any]:
    """Extract approximate years of experience and role snippets."""
    years = 0.0
    details = []

    # Check for direct mentions like "5+ years of experience" or "3 years experience"
    exp_matches = re.findall(r'(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience', text, re.IGNORECASE)
    if exp_matches:
        try:
            years = max([float(m) for m in exp_matches])
        except ValueError:
            years = 0.0

    # Year range detection: e.g., 2018 - 2022, 2020 - Present
    ranges = re.findall(r'\b(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(20\d{2}|present|current)\b', text, re.IGNORECASE)
    if ranges and years == 0.0:
        total_range_years = 0
        current_year = 2026
        for start, end in ranges:
            start_yr = int(start)
            end_yr = current_year if end.lower() in ["present", "current"] else int(end)
            if 0 <= (end_yr - start_yr) <= 30:
                total_range_years += (end_yr - start_yr)
        if total_range_years > 0:
            years = min(float(total_range_years), 30.0)

    # Experience details extraction (titles)
    title_matches = re.findall(
        r'\b(Software Engineer|Full Stack Developer|Frontend Developer|Backend Developer|DevOps Engineer|Data Scientist|ML Engineer|AI Engineer|Product Manager|System Architect|Intern|Internship)\b',
        text,
        re.IGNORECASE
    )
    for title in set(title_matches):
        details.append({"role": title.title()})

    return {
        "experience_years": round(years, 1),
        "experience_details": details
    }

def extract_education(text: str) -> List[Dict[str, Any]]:
    """Extract degrees, university mentions, and graduation years."""
    education = []
    
    # Search degrees
    degree_found = set()
    for pattern in DEGREE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            degree_found.add(m.strip().upper())

    # Search fields of study
    field_found = set()
    for pattern in FIELD_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            field_found.add(m.strip().title())

    # Graduation years
    years = re.findall(r'\b(20[0-2][0-9]|19[89][0-9])\b', text)
    grad_year = years[-1] if years else None

    if degree_found:
        for deg in degree_found:
            education.append({
                "degree": deg,
                "field": ", ".join(field_found) if field_found else "Computer Science & Engineering",
                "year": grad_year
            })
    elif field_found:
        education.append({
            "degree": "Bachelor's Degree",
            "field": ", ".join(field_found),
            "year": grad_year
        })
    else:
        education.append({
            "degree": "Higher Education",
            "field": "Technology / Engineering",
            "year": grad_year
        })

    return education

def generate_summary(skills: List[str], experience_years: float, education: List[Dict[str, Any]]) -> str:
    """Generate an AI-style synthesized professional summary based on parsed metadata."""
    primary_skills = ", ".join(skills[:6]) if skills else "software development"
    deg_str = education[0].get("degree", "Degree") if education else "Technical Graduate"
    field_str = education[0].get("field", "Computer Science") if education else "Computer Science"
    
    if experience_years > 0:
        summary = (
            f"Results-oriented professional with {experience_years} years of demonstrated experience in {primary_skills}. "
            f"Holds a {deg_str} in {field_str}. Proficient in full-cycle software architecture, modern development practices, "
            f"and continuous delivery."
        )
    else:
        summary = (
            f"Aspiring software engineer and candidate with foundational expertise in {primary_skills}. "
            f"Holds a {deg_str} in {field_str}. Eager to leverage technical problem-solving capabilities, modern workflows, "
            f"and collaborative agility in mock and technical interviews."
        )
    return summary

def parse_resume(file_path: str) -> Dict[str, Any]:
    """Complete resume extraction workflow."""
    raw_text = extract_text_from_file(file_path)
    skills = extract_skills(raw_text)
    technologies = extract_technologies(skills)
    exp = extract_experience(raw_text)
    education = extract_education(raw_text)
    summary = generate_summary(skills, exp["experience_years"], education)

    return {
        "raw_text": raw_text,
        "skills": skills,
        "technologies": technologies,
        "experience_years": exp["experience_years"],
        "experience_details": exp["experience_details"],
        "education": education,
        "summary": summary
    }
