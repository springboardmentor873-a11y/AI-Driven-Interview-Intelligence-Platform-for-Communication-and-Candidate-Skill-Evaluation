import shutil
import tempfile
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from resumes.models import Resume
from .models import Answer, InterviewQuestion, InterviewSession

WEBM = b'\x1a\x45\xdf\xa3' + b'\x00' * 200   # starts like a real webm file


def set_started(question_id, seconds_ago):
    """Pretend a question was activated `seconds_ago` seconds ago, without waiting for real time to pass."""
    InterviewQuestion.objects.filter(pk=question_id).update(started_at=timezone.now() - timedelta(seconds=seconds_ago))


@override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')   # no external AI call in tests
class InterviewApiTests(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        override = override_settings(MEDIA_ROOT=self.media)
        override.enable()
        self.addCleanup(override.disable)
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)

        make = User.objects.create_user
        self.me = make(username='me', email='me@test.com', password='Strong#Pass123')
        self.other = make(username='other', email='other@test.com', password='Strong#Pass123')
        self.recruiter = make(username='rec', email='rec@test.com', password='Strong#Pass123', role='recruiter')
        self.client.force_authenticate(self.me)

    # ----- helpers -----
    def create(self, **extra):
        body = {'category': 'hr', 'difficulty': 'easy', 'num_questions': 3}
        body.update(extra)
        return self.client.post('/api/interviews/', body, format='json')

    def create_started(self, **extra):
        session_id = self.create(**extra).data['id']
        self.client.post(f'/api/interviews/{session_id}/start/')
        return session_id

    def questions_of(self, session_id):
        return self.client.get(f'/api/interviews/{session_id}/').data['questions']

    def first_question(self, session_id):
        return self.questions_of(session_id)[0]['id']

    def answer(self, session_id, question_id, **fields):
        body = {'question_id': question_id}
        body.update(fields)
        return self.client.post(f'/api/interviews/{session_id}/answers/', body, format='multipart')

    def start_question(self, session_id, question_id):
        return self.client.post(f'/api/interviews/{session_id}/questions/{question_id}/start/')

    def skip_question(self, session_id, question_id):
        return self.client.post(f'/api/interviews/{session_id}/questions/{question_id}/skip/')

    # ----- creating -----
    def test_questions_are_created_from_bank_without_ai_key(self):
        res = self.create(num_questions=4)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['question_source'], 'bank')
        self.assertEqual(res.data['status'], 'created')
        self.assertEqual(len(res.data['questions']), 4)
        self.assertEqual(InterviewQuestion.objects.filter(session_id=res.data['id']).count(), 4)

    def test_time_limit_minutes_is_derived_from_the_question_count(self):
        res = self.create(num_questions=4)
        self.assertEqual(res.data['time_limit_minutes'], 8)   # 4 questions x 2 minutes
        self.assertEqual(res.data['question_seconds'], 120)

    def test_rubric_is_stored_but_never_sent(self):
        res = self.create()
        text = res.content.decode().lower()
        for word in ('rubric', 'expected_topics', 'criteria'):
            self.assertNotIn(word, text)
        detail = self.client.get(f"/api/interviews/{res.data['id']}/").content.decode().lower()
        self.assertNotIn('rubric', detail)
        self.assertNotIn('expected_topics', detail)
        stored = InterviewQuestion.objects.filter(session_id=res.data['id']).first()
        self.assertTrue(stored.evaluation_rubric['expected_topics'])

    def test_real_number_of_questions_is_stored(self):
        res = self.create(category='aptitude', num_questions=10)   # the bank has only 7
        self.assertEqual(res.data['num_questions'], 7)
        self.assertEqual(len(res.data['questions']), 7)

    def test_validation_errors_use_detail_format(self):
        bad_inputs = [
            {'category': 'cooking'},
            {'difficulty': 'insane'},
            {'num_questions': 2},
            {'num_questions': 11},
        ]
        for bad in bad_inputs:
            res = self.create(**bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertIn('detail', res.data)
        self.assertEqual(InterviewSession.objects.count(), 0)

    def test_time_limit_cannot_be_chosen_any_more(self):
        # an old-style request that still sends a time limit is simply ignored, not rejected
        res = self.create(time_limit_minutes=60)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['time_limit_minutes'], 6)   # 3 questions x 2 minutes, not 60

    def test_cannot_use_someone_elses_resume(self):
        resume = Resume.objects.create(owner=self.other, file='x.pdf', original_name='x.pdf')
        res = self.create(resume=resume.id)
        self.assertEqual(res.status_code, 400)
        self.assertIn('detail', res.data)

    def test_own_parsed_resume_skills_are_used(self):
        resume = Resume.objects.create(
            owner=self.me, file='x.pdf', original_name='cv.pdf', status='parsed',
            parsed_data={'skills': ['Docker', 'Redis']})
        res = self.create(category='technical', domain='python', num_questions=6, resume=resume.id)
        self.assertEqual(res.status_code, 201)
        texts = ' '.join(q['question_text'] for q in res.data['questions'])
        self.assertIn('Docker', texts)
        self.assertEqual(res.data['resume'], resume.id)

    def test_list_shows_only_my_sessions(self):
        self.create()
        self.client.force_authenticate(self.other)
        self.create()
        self.create()
        self.assertEqual(len(self.client.get('/api/interviews/').data), 2)
        self.client.force_authenticate(self.me)
        self.assertEqual(len(self.client.get('/api/interviews/').data), 1)

    # ----- who may call -----
    def test_login_and_candidate_role_required(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/interviews/').status_code, 401)
        self.client.force_authenticate(self.recruiter)
        self.assertEqual(self.client.get('/api/interviews/').status_code, 403)

    def test_other_candidate_gets_404_everywhere(self):
        session_id = self.create_started()
        question_id = self.first_question(session_id)
        self.client.force_authenticate(self.other)
        base = f'/api/interviews/{session_id}/'
        self.assertEqual(self.client.get(base).status_code, 404)
        self.assertEqual(self.client.post(base + 'start/').status_code, 404)
        self.assertEqual(self.answer(session_id, question_id, text_answer='hi').status_code, 404)
        self.assertEqual(self.client.post(base + 'complete/').status_code, 404)
        self.assertEqual(self.start_question(session_id, question_id).status_code, 404)
        self.assertEqual(self.skip_question(session_id, question_id).status_code, 404)
        self.assertEqual(Answer.objects.count(), 0)

    # ----- starting the interview and its first question -----
    def test_cannot_answer_before_the_interview_starts(self):
        session_id = self.create().data['id']
        res = self.answer(session_id, self.first_question(session_id), text_answer='too early')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Answer.objects.count(), 0)

    def test_start_activates_the_first_question_and_works_only_once(self):
        session_id = self.create().data['id']
        res = self.client.post(f'/api/interviews/{session_id}/start/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'in_progress')
        self.assertIsNotNone(res.data['started_at'])
        self.assertEqual(res.data['question_seconds'], 120)
        first = res.data['questions'][0]
        self.assertEqual(res.data['active_question_id'], first['id'])
        self.assertEqual(first['status'], 'active')
        self.assertTrue(115 <= first['seconds_left'] <= 120)
        self.assertEqual(self.client.post(f'/api/interviews/{session_id}/start/').status_code, 400)

    def test_cannot_complete_before_start(self):
        session_id = self.create().data['id']
        self.assertEqual(self.client.post(f'/api/interviews/{session_id}/complete/').status_code, 400)

    # ----- per-question order -----
    def test_question_order_is_enforced(self):
        session_id = self.create_started(num_questions=3)
        q1, q2, q3 = [q['id'] for q in self.questions_of(session_id)]

        # q1 is already active; jumping ahead to q2 or q3 is refused
        self.assertEqual(self.start_question(session_id, q3).status_code, 400)
        self.assertEqual(self.start_question(session_id, q2).status_code, 400)

        self.assertEqual(self.answer(session_id, q1, text_answer='One').status_code, 201)
        res = self.start_question(session_id, q2)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['active_question_id'], q2)
        active = next(q for q in res.data['questions'] if q['id'] == q2)
        self.assertEqual(active['status'], 'active')

    def test_starting_the_active_question_again_does_not_reset_its_clock(self):
        session_id = self.create_started()
        q1 = self.first_question(session_id)
        set_started(q1, seconds_ago=50)
        res = self.start_question(session_id, q1)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(65 <= res.data['questions'][0]['seconds_left'] <= 70)

    def test_cannot_start_a_question_that_is_already_finished(self):
        session_id = self.create_started()
        q1 = self.first_question(session_id)
        self.answer(session_id, q1, text_answer='One')
        self.assertEqual(self.start_question(session_id, q1).status_code, 400)

    # ----- skip -----
    def test_skip_works_and_unblocks_the_next_question(self):
        session_id = self.create_started(num_questions=3)
        q1, q2, _ = [q['id'] for q in self.questions_of(session_id)]
        res = self.skip_question(session_id, q1)
        self.assertEqual(res.status_code, 200)
        q1_data = next(q for q in res.data['questions'] if q['id'] == q1)
        self.assertEqual(q1_data['status'], 'skipped')
        self.assertEqual(self.skip_question(session_id, q1).status_code, 200)   # idempotent
        self.assertEqual(self.start_question(session_id, q2).status_code, 200)

    def test_cannot_skip_a_question_that_has_not_started(self):
        session_id = self.create_started(num_questions=3)
        _, q2, _ = [q['id'] for q in self.questions_of(session_id)]
        self.assertEqual(self.skip_question(session_id, q2).status_code, 400)

    def test_cannot_skip_an_answered_question(self):
        session_id = self.create_started()
        q1 = self.first_question(session_id)
        self.answer(session_id, q1, text_answer='One')
        self.assertEqual(self.skip_question(session_id, q1).status_code, 400)

    # ----- answers -----
    def test_answer_saves_once(self):
        session_id = self.create_started()
        question_id = self.first_question(session_id)
        first = self.answer(session_id, question_id, text_answer='My first answer')
        self.assertEqual(first.status_code, 201)
        self.assertTrue(first.data['answered'])
        self.assertEqual(first.data['status'], 'answered')
        second = self.answer(session_id, question_id, text_answer='Changed my mind')
        self.assertEqual(second.status_code, 409)
        self.assertEqual(Answer.objects.get().text_answer, 'My first answer')

    def test_question_must_belong_to_session(self):
        mine = self.create_started()
        theirs = self.create().data['id']
        foreign_question = InterviewQuestion.objects.filter(session_id=theirs).first().id
        self.assertEqual(self.answer(mine, foreign_question, text_answer='x').status_code, 400)
        self.assertEqual(self.answer(mine, 999999, text_answer='x').status_code, 400)

    def test_answer_needs_text_or_audio(self):
        session_id = self.create_started()
        res = self.answer(session_id, self.first_question(session_id), text_answer='   ')
        self.assertEqual(res.status_code, 400)
        self.assertIn('detail', res.data)

    def test_answer_after_time_limit_is_rejected_but_grace_is_allowed(self):
        session_id = self.create_started()
        q1 = self.first_question(session_id)
        set_started(q1, seconds_ago=122)   # past 120s, inside the 5s grace
        self.assertEqual(self.answer(session_id, q1, text_answer='late but ok').status_code, 201)

    def test_answer_is_refused_once_the_grace_period_passes(self):
        session_id = self.create_started()
        q1 = self.first_question(session_id)
        set_started(q1, seconds_ago=130)   # past the 5s grace
        res = self.answer(session_id, q1, text_answer='too late')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Answer.objects.count(), 0)

    def test_duration_seconds_is_computed_by_the_server_not_the_browser(self):
        session_id = self.create_started()
        q1 = self.first_question(session_id)
        set_started(q1, seconds_ago=40)
        # a client that still sends duration_seconds is simply ignored
        res = self.answer(session_id, q1, text_answer='Answer', duration_seconds=99999)
        self.assertEqual(res.status_code, 201)
        saved = Answer.objects.get(question_id=q1)
        self.assertTrue(38 <= saved.duration_seconds <= 42)

    def test_answer_duration_is_exposed_for_the_summary_screen(self):
        session_id = self.create_started()
        q1 = self.first_question(session_id)
        self.assertIsNone(self.questions_of(session_id)[0]['answer_duration_seconds'])
        set_started(q1, seconds_ago=40)
        res = self.answer(session_id, q1, text_answer='Answer')
        self.assertTrue(38 <= res.data['answer_duration_seconds'] <= 42)
        refreshed = self.questions_of(session_id)[0]
        self.assertEqual(refreshed['answer_duration_seconds'], res.data['answer_duration_seconds'])

    def test_audio_answer_is_saved_with_random_webm_name(self):
        session_id = self.create_started()
        audio = SimpleUploadedFile('my voice.mp3', WEBM, content_type='audio/webm')
        res = self.answer(session_id, self.first_question(session_id), audio_file=audio)
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['has_audio'])
        name = Answer.objects.get().audio_file.name
        self.assertTrue(name.startswith('private_audio/') and name.endswith('.webm'))
        self.assertNotIn('voice', name)

    def test_bad_audio_is_rejected(self):
        session_id = self.create_started()
        question_id = self.first_question(session_id)
        wrong_type = SimpleUploadedFile('a.webm', WEBM, content_type='application/pdf')
        self.assertEqual(self.answer(session_id, question_id, audio_file=wrong_type).status_code, 400)
        not_audio = SimpleUploadedFile('a.webm', b'this is just text', content_type='audio/webm')
        self.assertEqual(self.answer(session_id, question_id, audio_file=not_audio).status_code, 400)
        too_big = SimpleUploadedFile('a.webm', WEBM + b'0' * (10 * 1024 * 1024), content_type='audio/webm')
        self.assertEqual(self.answer(session_id, question_id, audio_file=too_big).status_code, 400)
        self.assertEqual(Answer.objects.count(), 0)

    def test_video_webm_content_type_is_allowed(self):
        session_id = self.create_started()
        audio = SimpleUploadedFile('a.webm', WEBM, content_type='video/webm')
        self.assertEqual(self.answer(session_id, self.first_question(session_id), audio_file=audio).status_code, 201)

    # ----- the whole journey -----
    def test_full_flow(self):
        session_id = self.create_started(num_questions=3)
        q1, q2, q3 = [q['id'] for q in self.questions_of(session_id)]

        self.assertEqual(self.answer(session_id, q1, text_answer='One').status_code, 201)
        self.assertEqual(self.start_question(session_id, q2).status_code, 200)
        self.assertEqual(self.answer(session_id, q2, text_answer='Two').status_code, 201)
        self.assertEqual(self.start_question(session_id, q3).status_code, 200)
        self.assertEqual(self.skip_question(session_id, q3).status_code, 200)

        done = self.client.post(f'/api/interviews/{session_id}/complete/')
        self.assertEqual(done.status_code, 200)
        self.assertEqual(done.data['status'], 'completed')
        self.assertIsNotNone(done.data['ended_at'])
        self.assertIsNone(done.data['active_question_id'])
        self.assertEqual(done.data['answered_count'], 2)
        statuses = {q['id']: q['status'] for q in done.data['questions']}
        self.assertEqual(statuses, {q1: 'answered', q2: 'answered', q3: 'skipped'})
        self.assertEqual(
            next(q for q in done.data['questions'] if q['id'] == q1)['answer_text'], 'One')

        # nothing more is allowed after completing
        self.assertEqual(self.answer(session_id, q3, text_answer='Late').status_code, 400)
        self.assertEqual(self.client.post(f'/api/interviews/{session_id}/complete/').status_code, 400)
        self.assertEqual(self.client.post(f'/api/interviews/{session_id}/start/').status_code, 400)
