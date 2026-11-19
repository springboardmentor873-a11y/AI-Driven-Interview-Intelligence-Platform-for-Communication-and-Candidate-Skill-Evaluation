"""Bounded, local text extraction. No external AI service or inferred skill ratings."""
import io
import json
import re
import sys

from pypdf import PdfReader

SKILLS = {
    'Python': ['python'], 'Java': ['java'], 'JavaScript': ['javascript'],
    'TypeScript': ['typescript'], 'C++': ['c++'], 'C#': ['c#'],
    'HTML': ['html', 'html5'], 'CSS': ['css', 'css3'], 'React': ['react', 'react.js', 'reactjs'],
    'Angular': ['angular'], 'Vue': ['vue', 'vue.js'], 'Node.js': ['node.js', 'nodejs'],
    'SQL': ['sql'], 'PostgreSQL': ['postgresql', 'postgres'], 'MySQL': ['mysql'],
    'MongoDB': ['mongodb'], 'Git': ['git'], 'Docker': ['docker'], 'Kubernetes': ['kubernetes'],
    'AWS': ['aws', 'amazon web services'], 'Azure': ['azure'], 'Linux': ['linux'],
    'FastAPI': ['fastapi'], 'Django': ['django'], 'Flask': ['flask'],
    'TensorFlow': ['tensorflow'], 'PyTorch': ['pytorch'], 'Pandas': ['pandas'],
    'NumPy': ['numpy'], 'Machine learning': ['machine learning'],
    'Data analysis': ['data analysis'], 'Power BI': ['power bi'], 'Excel': ['excel'],
    'Figma': ['figma'], 'REST APIs': ['rest api', 'restful'],
}


def extract_skills(text: str) -> list[str]:
    return [name for name, aliases in SKILLS.items() if any(
        re.search(r'(?<![\w+#])' + re.escape(alias) + r'(?![\w+#])', text, re.I)
        for alias in aliases
    )]


def parse_resume(data: bytes) -> dict:
    if not data.startswith(b'%PDF-') or len(data) > 5 * 1024 * 1024:
        raise ValueError('Choose a valid PDF up to 5 MB.')
    reader = PdfReader(io.BytesIO(data))
    if reader.is_encrypted:
        raise ValueError('Export an unprotected PDF before extracting skills.')
    if not 1 <= len(reader.pages) <= 20:
        raise ValueError('Use a resume with 1 to 20 pages.')
    parts = []
    total = 0
    for page in reader.pages:
        contents = page.get_contents()
        if contents and len(contents.get_data()) > 5 * 1024 * 1024:
            raise ValueError('This PDF page is too complex. Export a simpler PDF.')
        text = page.extract_text() or ''
        total += len(text)
        if total > 100_000:
            raise ValueError('This document contains too much text. Upload a shorter resume.')
        parts.append(text)
    text = '\n'.join(parts).strip()
    if len(text) < 30:
        raise ValueError('No readable text found. Upload a text-based PDF; scanned images need OCR, which is not available yet.')
    return {'skills': extract_skills(text), 'pages': len(parts), 'method': 'keyword_matching',
            'note': 'Suggested skills are matched from resume text. Review them before saving; mentions do not prove proficiency.'}


if __name__ == '__main__':
    try:
        result = parse_resume(sys.stdin.buffer.read(5 * 1024 * 1024 + 1))
        print(json.dumps(result))
    except ValueError as exc:
        print(json.dumps({'error': str(exc)}))
    except Exception:
        print(json.dumps({'error': 'This PDF could not be read. Export a new PDF and try again.'}))
