import json
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from .question_bank import BEHAVIORAL, APTITUDE, HR, TECHNICAL
from .services import generate_questions, resolve_domain

NO_AI = override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')


class QuestionBankTests(SimpleTestCase):
    def test_bank_sizes(self):
        for pool in (HR, BEHAVIORAL, APTITUDE):
            self.assertEqual(len(pool), 7)
        self.assertEqual(len(TECHNICAL), 7)
        for pool in TECHNICAL.values():
            self.assertEqual(len(pool), 6)

    def test_aliases(self):
        self.assertEqual(resolve_domain('JavaScript'), 'web development')
        self.assertEqual(resolve_domain('mysql'), 'sql')
        self.assertEqual(resolve_domain('Python Developer'), 'python')
        self.assertIsNone(resolve_domain('cooking'))
        self.assertIsNone(resolve_domain(''))


@NO_AI
class BankGenerationTests(SimpleTestCase):
    def test_no_key_uses_bank_and_builds_rubric(self):
        questions, source = generate_questions('hr', '', 'easy', 5, [])
        self.assertEqual(source, 'bank')
        self.assertEqual(len(questions), 5)
        rubric = questions[0]['evaluation_rubric']
        self.assertEqual(rubric['criteria'], ['relevance', 'accuracy', 'clarity', 'completeness'])
        self.assertTrue(rubric['expected_topics'])

    def test_easy_keeps_order_hard_reverses(self):
        easy, _ = generate_questions('hr', '', 'easy', 7, [])
        hard, _ = generate_questions('hr', '', 'hard', 7, [])
        self.assertEqual(easy[0]['question_text'], HR[0][0])
        self.assertEqual(hard[0]['question_text'], HR[-1][0])

    def test_medium_rotates(self):
        easy, _ = generate_questions('behavioral', '', 'easy', 7, [])
        medium, _ = generate_questions('behavioral', '', 'medium', 7, [])
        self.assertNotEqual(easy[0]['question_text'], medium[0]['question_text'])
        self.assertEqual(
            sorted(q['question_text'] for q in easy), sorted(q['question_text'] for q in medium))

    def test_fewer_questions_when_bank_is_small(self):
        questions, _ = generate_questions('aptitude', '', 'easy', 10, [])
        self.assertEqual(len(questions), 7)

    def test_technical_adds_resume_skill_questions(self):
        questions, _ = generate_questions('technical', 'python', 'easy', 6, ['Docker', 'Redis'])
        texts = [q['question_text'] for q in questions]
        self.assertEqual(len(questions), 6)
        self.assertTrue(any('Docker' in t for t in texts))
        self.assertTrue(any('Redis' in t for t in texts))

    def test_technical_without_skills_has_no_skill_questions(self):
        questions, _ = generate_questions('technical', 'sql', 'easy', 6, [])
        self.assertEqual([q['question_text'] for q in questions], [q for q, _ in TECHNICAL['sql']])

    def test_small_domain_is_filled_from_other_pools(self):
        questions, _ = generate_questions('technical', 'python', 'easy', 10, [])
        texts = [q['question_text'] for q in questions]
        self.assertEqual(len(questions), 10)
        self.assertEqual(len(set(texts)), 10)

    def test_unknown_domain_still_gives_questions(self):
        questions, source = generate_questions('technical', 'cooking', 'easy', 5, [])
        self.assertEqual(len(questions), 5)
        self.assertEqual(source, 'bank')


GOOD = [{'question': f'Question number {i}?', 'expected_topics': ['a', 'b']} for i in range(5)]


@override_settings(GEMINI_API_KEY='fake', GEMINI_MODEL='fake-model')
class AiGenerationTests(SimpleTestCase):
    @patch('interviews.services.ai_json', return_value=GOOD)
    def test_valid_ai_answer_is_used(self, _mock):
        questions, source = generate_questions('technical', 'python', 'easy', 5, ['Python'])
        self.assertEqual(source, 'ai')
        self.assertEqual(questions[0]['question_text'], 'Question number 0?')
        self.assertIn('criteria', questions[0]['evaluation_rubric'])

    @patch('interviews.services.ai_json', return_value=GOOD[:3])
    def test_too_few_questions_falls_back(self, _mock):
        questions, source = generate_questions('hr', '', 'easy', 5, [])
        self.assertEqual(source, 'bank')
        self.assertEqual(len(questions), 5)

    @patch('interviews.services.ai_json', return_value=None)
    def test_ai_failure_falls_back(self, _mock):
        self.assertEqual(generate_questions('hr', '', 'easy', 5, [])[1], 'bank')

    @patch('interviews.services.ai_json', return_value={'question': 'not a list'})
    def test_wrong_type_falls_back(self, _mock):
        self.assertEqual(generate_questions('hr', '', 'easy', 5, [])[1], 'bank')

    @patch('interviews.services.ai_json', return_value=[{'question': 5, 'expected_topics': []}] * 5)
    def test_bad_strings_fall_back(self, _mock):
        self.assertEqual(generate_questions('hr', '', 'easy', 5, [])[1], 'bank')

    @patch('interviews.services.ai_json')
    def test_personal_question_falls_back(self, mock):
        bad = GOOD[:4] + [{'question': 'What is your religion?', 'expected_topics': []}]
        mock.return_value = bad
        self.assertEqual(generate_questions('hr', '', 'easy', 5, [])[1], 'bank')

    @patch('interviews.services.ai_json', return_value=GOOD)
    def test_only_skill_list_is_sent(self, mock):
        generate_questions('technical', 'python', 'easy', 5, ['Python', 'SQL'])
        system_prompt, user_prompt = mock.call_args.args
        sent = json.loads(user_prompt.split('\n', 1)[1])
        self.assertEqual(sent['candidate_skills'], ['Python', 'SQL'])
        self.assertEqual(set(sent), {
            'interview_type', 'domain', 'difficulty', 'number_of_questions', 'candidate_skills'})
