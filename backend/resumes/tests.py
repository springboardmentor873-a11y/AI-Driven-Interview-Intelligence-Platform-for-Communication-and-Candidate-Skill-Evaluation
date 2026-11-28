import io
import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from pypdf import PdfWriter
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Resume
from .services import (
    ITEM_TEXT_MAX,
    MAX_ACHIEVEMENTS,
    MAX_CERTIFICATIONS,
    MAX_EDUCATION_ITEMS,
    MAX_EXPERIENCE_ITEMS,
    MAX_HIGHLIGHTS,
    MAX_PROJECT_ITEMS,
    TEMPLATE_MESSAGE,
    drop_placeholder_skills,
    enrich_with_ai,
    is_unfilled_template,
    parse_resume,
)

# The real text pypdf extracts from Blank_Resume_Template.pdf
TEMPLATE_TEXT = '\n'.join([
    '[Your Full Name]',
    ' [your.email@example.com] | [+91 XXXXX XXXXX] | [City, State]',
    ' [LinkedIn profile link] | [Portfolio or code profile link]',
    'PROFESSIONAL SUMMARY',
    '[Two or three lines about who you are, your degree, and the kind of role you want. Mention how many years',
    'or months of experience you have, for example one year.]',
    'EDUCATION',
    '[Degree, for example B.E. in Computer Science] - [College name], [University]',
    '[Start year] - [End year] | CGPA / Percentage: [your score]',
    'TECHNICAL SKILLS',
    ' - Languages: [Language 1, Language 2, Language 3]',
    '- Frameworks and Libraries: [Framework 1, Framework 2]',
    '- Databases: [Database 1, Database 2]',
    '- Tools and Platforms: [Tool 1, Tool 2, Tool 3]',
    'PROJECTS',
    '[Project name] | [Technologies used]',
    ' - [What the project does and who it is for]',
    'EXPERIENCE AND INTERNSHIPS',
    '[Role title] | [Company name] | [Month Year] - [Month Year]',
    ' - [Responsibility or achievement]',
    'Blank resume template for SmartHire AI testing. Replace every [bracketed] text with your own details.',
])


class PlaceholderTests(SimpleTestCase):
    def test_template_text_is_detected(self):
        self.assertTrue(is_unfilled_template(TEMPLATE_TEXT))

    def test_filled_resume_is_not_a_template(self):
        text = 'Jane Doe. B.Tech in CSE. Skills: Python, SQL, Git. Summer internship at ABC.'
        self.assertFalse(is_unfilled_template(text))

    def test_five_placeholders_is_a_template_four_is_not(self):
        self.assertFalse(is_unfilled_template('[a] [b] [c] [d]'))
        self.assertTrue(is_unfilled_template('[a] [b] [c] [d] [e]'))

    def test_placeholder_skills_are_dropped(self):
        skills = ['Language 1', 'Framework 2', 'Database 1', 'Tool 3', 'tools 12', 'LANGUAGES 4',
                  '[Python]', 'Python]', 'Python', 'SQL', 'Node.js']
        self.assertEqual(drop_placeholder_skills(skills), ['Python', 'SQL', 'Node.js'])

    @patch('resumes.services.ai_json')
    @patch('resumes.services.ai_enabled', return_value=True)
    def test_ai_placeholder_skills_are_dropped(self, _enabled, mock_json):
        text = 'Python and SQL. Language 1, Framework 2, Database 1, Tool 3, [Python]'
        mock_json.return_value = {
            'skills': ['Language 1', 'Framework 2', 'Database 1', 'Tool 3', '[Python]', 'Python', 'SQL'],
            'projects': [],
            'summary': 'A short summary.',
        }
        result = enrich_with_ai(text, parse_resume(text))
        self.assertTrue(result['ai_used'])
        self.assertEqual(result['skills'], ['Python', 'SQL'])

    def test_template_without_ai_gives_no_placeholder_skills(self):
        self.assertEqual(parse_resume(TEMPLATE_TEXT)['skills'], [])


class ParseResumeTests(SimpleTestCase):
    def test_skills_found_with_display_names(self):
        result = parse_resume('Built apps with python, SQL and node.js. Used Git and Docker.')
        for skill in ('Python', 'SQL', 'Node.js', 'Git', 'Docker'):
            self.assertIn(skill, result['skills'])

    def test_java_is_not_matched_inside_javascript(self):
        result = parse_resume('I write JavaScript and React every day.')
        self.assertIn('JavaScript', result['skills'])
        self.assertNotIn('Java', result['skills'])

    def test_sql_is_not_matched_inside_mysql(self):
        result = parse_resume('Database: MySQL')
        self.assertIn('MySQL', result['skills'])
        self.assertNotIn('SQL', result['skills'])

    def test_education_detected(self):
        result = parse_resume('B.Tech in Computer Science. Later MBA. Also a Diploma in IT.')
        self.assertEqual(result['education'], ['B.E / B.Tech', 'MBA', 'Diploma'])

    def test_experience_and_internship(self):
        result = parse_resume('I have 3 years of experience in testing. Summer internship at ABC.')
        self.assertEqual(result['experience_years'], 3)
        self.assertTrue(result['has_internship'])

    def test_no_experience_text_gives_zero(self):
        result = parse_resume('Fresh graduate looking for a role.')
        self.assertEqual(result['experience_years'], 0)
        self.assertFalse(result['has_internship'])
        self.assertFalse(result['ai_used'])

    def test_result_has_all_keys(self):
        keys = {
            'skills', 'education', 'experience_years', 'has_internship', 'word_count', 'summary',
            'projects', 'experience_items', 'education_items', 'project_items', 'certifications',
            'achievements', 'ai_used',
        }
        self.assertEqual(set(parse_resume('hello world')), keys)

    def test_rule_based_education_items_follow_detected_degrees(self):
        result = parse_resume('B.Tech in Computer Science. Later MBA.')
        self.assertEqual(
            result['education_items'],
            [
                {'degree': 'B.E / B.Tech', 'institution': '', 'year': '', 'score': ''},
                {'degree': 'MBA', 'institution': '', 'year': '', 'score': ''},
            ],
        )
        for key in ('experience_items', 'project_items', 'certifications', 'achievements', 'projects'):
            self.assertEqual(result[key], [])

    @override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')
    def test_enrich_without_key_returns_baseline(self):
        baseline = parse_resume('Python developer')
        self.assertIs(enrich_with_ai('Python developer', baseline), baseline)


GOOD_AI_DATA = {
    'skills': ['Python'],
    'projects': ['Library system'],
    'summary': 'A short summary.',
    'experience_items': [
        {'role': 'Intern', 'company': 'Acme', 'duration': '2023', 'highlights': ['Built an API']},
    ],
    'education_items': [
        {'degree': 'B.Tech', 'institution': 'ABC College', 'year': '2024', 'score': '8.5 CGPA'},
    ],
    'project_items': [
        {'name': 'Library system', 'tech': 'Django', 'description': 'A book tracker.'},
    ],
    'certifications': ['AWS Cloud Practitioner'],
    'achievements': ['Won a hackathon'],
}


@override_settings(GEMINI_API_KEY='fake', GEMINI_MODEL='fake-model')
class AiStructuredFieldsTests(SimpleTestCase):
    """enrich_with_ai() and the new Stage 1 fields. ai_json is always mocked - no network call."""

    @patch('resumes.services.ai_json', return_value=GOOD_AI_DATA)
    def test_valid_ai_answer_is_stored(self, _mock):
        result = enrich_with_ai('Python developer', parse_resume('Python developer'))
        self.assertTrue(result['ai_used'])
        self.assertEqual(result['experience_items'], GOOD_AI_DATA['experience_items'])
        self.assertEqual(result['education_items'], GOOD_AI_DATA['education_items'])
        self.assertEqual(result['project_items'], GOOD_AI_DATA['project_items'])
        self.assertEqual(result['certifications'], GOOD_AI_DATA['certifications'])
        self.assertEqual(result['achievements'], GOOD_AI_DATA['achievements'])

    @patch('resumes.services.ai_json')
    def test_oversized_lists_are_trimmed(self, mock_json):
        data = dict(GOOD_AI_DATA)
        data['experience_items'] = [
            {'role': f'Role {i}', 'company': '', 'duration': '', 'highlights': [f'h{j}' for j in range(6)]}
            for i in range(10)
        ]
        data['education_items'] = [{'degree': f'Degree {i}', 'institution': '', 'year': '', 'score': ''} for i in range(10)]
        data['project_items'] = [{'name': f'Project {i}', 'tech': '', 'description': ''} for i in range(10)]
        data['certifications'] = [f'Cert {i}' for i in range(20)]
        data['achievements'] = [f'Win {i}' for i in range(20)]
        mock_json.return_value = data

        result = enrich_with_ai('text', parse_resume('text'))
        self.assertEqual(len(result['experience_items']), MAX_EXPERIENCE_ITEMS)
        self.assertEqual(len(result['experience_items'][0]['highlights']), MAX_HIGHLIGHTS)
        self.assertEqual(len(result['education_items']), MAX_EDUCATION_ITEMS)
        self.assertEqual(len(result['project_items']), MAX_PROJECT_ITEMS)
        self.assertEqual(len(result['certifications']), MAX_CERTIFICATIONS)
        self.assertEqual(len(result['achievements']), MAX_ACHIEVEMENTS)

    @patch('resumes.services.ai_json')
    def test_long_text_is_cut_to_the_character_limit(self, mock_json):
        data = dict(GOOD_AI_DATA)
        data['experience_items'] = [{'role': 'x' * 500, 'company': '', 'duration': '', 'highlights': []}]
        mock_json.return_value = data
        result = enrich_with_ai('text', parse_resume('text'))
        self.assertEqual(len(result['experience_items'][0]['role']), ITEM_TEXT_MAX)

    @patch('resumes.services.ai_json')
    def test_invalid_items_are_dropped_but_valid_ones_kept(self, mock_json):
        data = dict(GOOD_AI_DATA)
        data['education_items'] = ['not a dict', {'degree': 'B.Sc', 'institution': '', 'year': '', 'score': ''}, 123]
        mock_json.return_value = data
        result = enrich_with_ai('text', parse_resume('text'))
        self.assertEqual(result['education_items'], [{'degree': 'B.Sc', 'institution': '', 'year': '', 'score': ''}])

    @patch('resumes.services.ai_json')
    def test_wrong_type_for_a_new_field_becomes_an_empty_list(self, mock_json):
        data = dict(GOOD_AI_DATA)
        data['certifications'] = 'not a list'
        mock_json.return_value = data
        result = enrich_with_ai('text', parse_resume('text'))
        self.assertTrue(result['ai_used'])   # the core fields were still fine
        self.assertEqual(result['certifications'], [])

    @patch('resumes.services.ai_json')
    def test_broken_core_field_rejects_the_whole_ai_answer(self, mock_json):
        data = dict(GOOD_AI_DATA)
        data['skills'] = 'not a list'   # skills must be a list - this breaks the core contract
        mock_json.return_value = data
        baseline = parse_resume('B.Tech graduate')
        result = enrich_with_ai('B.Tech graduate', baseline)
        self.assertIs(result, baseline)
        self.assertFalse(result['ai_used'])

    @patch('resumes.services.ai_json')
    def test_ai_failure_keeps_the_rule_based_result(self, mock_json):
        mock_json.return_value = None   # ai_json already returns None on any failure
        baseline = parse_resume('B.Tech graduate')
        result = enrich_with_ai('B.Tech graduate', baseline)
        self.assertIs(result, baseline)
        self.assertFalse(result['ai_used'])

    @patch('resumes.services.ai_json')
    def test_education_items_falls_back_to_rule_based_when_ai_finds_none(self, mock_json):
        data = dict(GOOD_AI_DATA)
        data['education_items'] = []   # the AI found no education details
        mock_json.return_value = data
        text = 'B.Tech in Computer Science.'
        result = enrich_with_ai(text, parse_resume(text))
        self.assertEqual(result['education_items'], [{'degree': 'B.E / B.Tech', 'institution': '', 'year': '', 'score': ''}])

    @patch('resumes.services.ai_json')
    def test_contact_details_are_stripped_from_ai_text(self, mock_json):
        data = dict(GOOD_AI_DATA)
        data['experience_items'] = [{
            'role': 'Intern',
            'company': 'Reach me at jane@example.com or 9876543210',
            'duration': '',
            'highlights': [],
        }]
        mock_json.return_value = data
        result = enrich_with_ai('text', parse_resume('text'))
        company = result['experience_items'][0]['company']
        self.assertNotIn('@', company)
        self.assertNotIn('9876543210', company)


def make_pdf(text=None):
    """Builds a tiny PDF in memory. With text=None the page is blank (like a scan)."""
    if text is None:
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        buffer = io.BytesIO()
        writer.write(buffer)
        return buffer.getvalue()
    stream = f'BT /F1 12 Tf 20 100 Td ({text}) Tj ET'.encode()
    objects = [
        b'<</Type/Catalog/Pages 2 0 R>>',
        b'<</Type/Pages/Kids[3 0 R]/Count 1>>',
        b'<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
        b'<</Length ' + str(len(stream)).encode() + b'>>\nstream\n' + stream + b'\nendstream',
        b'<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
    ]
    out = b'%PDF-1.4\n'
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f'{number} 0 obj\n'.encode() + body + b'\nendobj\n'
    xref_at = len(out)
    out += f'xref\n0 {len(objects) + 1}\n'.encode() + b'0000000000 65535 f \n'
    for offset in offsets:
        out += f'{offset:010d} 00000 n \n'.encode()
    out += f'trailer\n<</Root 1 0 R/Size {len(objects) + 1}>>\nstartxref\n{xref_at}\n%%EOF\n'.encode()
    return out


@override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')
class ResumeApiTests(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        self.addCleanup(self.override.disable)
        self.user = User.objects.create_user(username='u1', email='u1@test.com', password='Strong#Pass123')
        self.other = User.objects.create_user(username='u2', email='u2@test.com', password='Strong#Pass123')
        self.client.force_authenticate(self.user)

    def upload(self, data):
        f = SimpleUploadedFile('cv.pdf', data, content_type='application/pdf')
        return self.client.post('/api/resumes/', {'file': f}, format='multipart')

    def test_upload_pdf_with_text_is_parsed(self):
        res = self.upload(make_pdf('Python and SQL developer with 2 years of experience'))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'parsed')
        self.assertIn('Python', res.data['parsed_data']['skills'])
        self.assertNotIn('extracted_text', res.data)
        self.assertNotIn('file', res.data)

    @patch('resumes.services.extract_pdf_text', return_value=TEMPLATE_TEXT)
    def test_unfilled_template_is_not_parsed(self, _mock):
        res = self.upload(make_pdf('x'))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'template')
        self.assertEqual(res.data['parsed_data'], {'message': TEMPLATE_MESSAGE})
        self.assertEqual(
            TEMPLATE_MESSAGE, 'This looks like an unfilled template. Please fill in your details and upload again.')
        stored = Resume.objects.get(pk=res.data['id'])
        self.assertEqual(stored.extracted_text, '')
        for key in ('skills', 'education', 'has_internship'):
            self.assertNotIn(key, stored.parsed_data)

    @patch('resumes.services.extract_pdf_text', return_value='Python and SQL. [a] [b] [c] [d]')
    def test_four_placeholders_are_still_parsed(self, _mock):
        res = self.upload(make_pdf('x'))
        self.assertEqual(res.data['status'], 'parsed')
        self.assertIn('Python', res.data['parsed_data']['skills'])

    def test_scanned_pdf_gets_no_text_status(self):
        res = self.upload(make_pdf())
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'no_text')
        self.assertIn('OCR', res.data['parsed_data']['message'])

    def test_broken_pdf_gets_failed_status(self):
        res = self.upload(b'%PDF-1.4 this is not really a pdf')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'failed')

    def test_fake_pdf_is_rejected(self):
        res = self.upload(b'just text')
        self.assertEqual(res.status_code, 400)

    def test_other_user_gets_404(self):
        resume_id = self.upload(make_pdf('Python')).data['id']
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'/api/resumes/{resume_id}/').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/resumes/{resume_id}/').status_code, 404)
        self.assertTrue(Resume.objects.filter(pk=resume_id).exists())

    def test_delete_removes_row_and_file(self):
        resume_id = self.upload(make_pdf('Python')).data['id']
        path = Path(Resume.objects.get(pk=resume_id).file.path)
        self.assertTrue(path.exists())
        self.assertEqual(self.client.delete(f'/api/resumes/{resume_id}/').status_code, 204)
        self.assertFalse(Resume.objects.filter(pk=resume_id).exists())
        self.assertFalse(path.exists())

    def test_get_own_resume(self):
        resume_id = self.upload(make_pdf('Python')).data['id']
        res = self.client.get(f'/api/resumes/{resume_id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], resume_id)

    def test_uploading_the_same_file_twice_is_refused(self):
        pdf = make_pdf('Python and SQL developer')
        first = self.upload(pdf)
        self.assertEqual(first.status_code, 201)
        second = self.upload(pdf)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(second.data, {'detail': 'You already uploaded this file.'})
        self.assertEqual(Resume.objects.count(), 1)

    def test_the_same_file_can_be_uploaded_by_a_different_user(self):
        pdf = make_pdf('Python and SQL developer')
        self.assertEqual(self.upload(pdf).status_code, 201)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.upload(pdf).status_code, 201)
        self.assertEqual(Resume.objects.count(), 2)

    def test_two_different_files_from_the_same_user_are_both_accepted(self):
        self.assertEqual(self.upload(make_pdf('Python developer')).status_code, 201)
        self.assertEqual(self.upload(make_pdf('Java developer')).status_code, 201)
        self.assertEqual(Resume.objects.count(), 2)

    def test_file_hash_is_stored_and_never_sent_to_the_browser(self):
        res = self.upload(make_pdf('Python developer'))
        stored = Resume.objects.get(pk=res.data['id'])
        self.assertEqual(len(stored.file_hash), 64)   # a sha-256 hex digest
        self.assertNotIn('file_hash', res.data)

    def test_deleting_then_reuploading_the_same_file_is_allowed_again(self):
        pdf = make_pdf('Python and SQL developer')
        resume_id = self.upload(pdf).data['id']
        self.client.delete(f'/api/resumes/{resume_id}/')
        self.assertEqual(self.upload(pdf).status_code, 201)


class ReanalyseApiTests(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        self.addCleanup(self.override.disable)
        self.user = User.objects.create_user(username='u1', email='u1@test.com', password='Strong#Pass123')
        self.other = User.objects.create_user(username='u2', email='u2@test.com', password='Strong#Pass123')
        self.client.force_authenticate(self.user)

    def upload(self, data):
        f = SimpleUploadedFile('cv.pdf', data, content_type='application/pdf')
        return self.client.post('/api/resumes/', {'file': f}, format='multipart')

    @override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')
    def test_reanalyse_without_an_ai_key_gives_a_clear_message(self):
        resume_id = self.upload(make_pdf('Python developer with 2 years of experience')).data['id']
        res = self.client.post(f'/api/resumes/{resume_id}/reanalyse/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('detail', res.data)

    @override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')
    def test_reanalyse_with_no_saved_text_gives_a_clear_message(self):
        resume_id = self.upload(make_pdf()).data['id']   # blank page -> no_text status, nothing saved
        res = self.client.post(f'/api/resumes/{resume_id}/reanalyse/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('detail', res.data)

    @override_settings(GEMINI_API_KEY='fake', GEMINI_MODEL='fake-model')
    @patch('resumes.services.ai_json', return_value=GOOD_AI_DATA)
    def test_reanalyse_updates_the_saved_resume(self, _mock):
        with override_settings(GEMINI_API_KEY='', GEMINI_MODEL=''):
            resume_id = self.upload(make_pdf('Python developer with 2 years of experience')).data['id']
        res = self.client.post(f'/api/resumes/{resume_id}/reanalyse/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['parsed_data']['ai_used'])
        self.assertEqual(res.data['parsed_data']['certifications'], GOOD_AI_DATA['certifications'])
        stored = Resume.objects.get(pk=resume_id)
        self.assertTrue(stored.parsed_data['ai_used'])

    @override_settings(GEMINI_API_KEY='fake', GEMINI_MODEL='fake-model')
    @patch('resumes.services.ai_json', return_value=None)
    def test_reanalyse_when_the_ai_call_fails(self, _mock):
        with override_settings(GEMINI_API_KEY='', GEMINI_MODEL=''):
            resume_id = self.upload(make_pdf('Python developer')).data['id']
        res = self.client.post(f'/api/resumes/{resume_id}/reanalyse/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('detail', res.data)

    @override_settings(GEMINI_API_KEY='fake', GEMINI_MODEL='fake-model')
    @patch('resumes.services.ai_json', return_value=GOOD_AI_DATA)
    def test_reanalyse_only_works_for_the_owner(self, _mock):
        with override_settings(GEMINI_API_KEY='', GEMINI_MODEL=''):
            resume_id = self.upload(make_pdf('Python developer')).data['id']
        self.client.force_authenticate(self.other)
        res = self.client.post(f'/api/resumes/{resume_id}/reanalyse/')
        self.assertEqual(res.status_code, 404)
