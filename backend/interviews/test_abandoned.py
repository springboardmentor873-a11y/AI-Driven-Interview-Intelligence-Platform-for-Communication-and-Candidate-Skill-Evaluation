"""API-level tests for closing abandoned interviews.

Nothing here waits in real time - the clock is patched by backdating a
question's started_at directly in the database, the same way lifecycle.py
itself works out whether an interview has gone quiet.
"""
from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Answer, InterviewQuestion, InterviewSession


def backdate_question(question_id, minutes_ago):
    InterviewQuestion.objects.filter(pk=question_id).update(
        started_at=timezone.now() - timedelta(minutes=minutes_ago))


@override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')   # no external AI call in tests
class AbandonedInterviewTests(APITestCase):
    def setUp(self):
        make = User.objects.create_user
        self.me = make(username='me', email='me@test.com', password='Strong#Pass123')
        self.other = make(username='other', email='other@test.com', password='Strong#Pass123')
        self.client.force_authenticate(self.me)

    def create(self, **extra):
        body = {'category': 'hr', 'difficulty': 'easy', 'num_questions': 3}
        body.update(extra)
        return self.client.post('/api/interviews/', body, format='json')

    def create_started(self, **extra):
        session_id = self.create(**extra).data['id']
        self.client.post(f'/api/interviews/{session_id}/start/')
        return session_id

    def first_question_id(self, session_id):
        return self.client.get(f'/api/interviews/{session_id}/').data['questions'][0]['id']

    def answer(self, session_id, question_id, text):
        return self.client.post(
            f'/api/interviews/{session_id}/answers/', {'question_id': question_id, 'text_answer': text},
            format='multipart')

    # ----- opening a single interview -----
    def test_active_interview_is_not_closed_when_opened(self):
        session_id = self.create_started()
        res = self.client.get(f'/api/interviews/{session_id}/')
        self.assertEqual(res.data['status'], 'in_progress')
        self.assertIsNone(res.data['ended_at'])

    def test_stale_interview_without_an_answer_becomes_abandoned_when_opened(self):
        session_id = self.create_started()
        backdate_question(self.first_question_id(session_id), minutes_ago=20)
        res = self.client.get(f'/api/interviews/{session_id}/')
        self.assertEqual(res.data['status'], 'abandoned')
        self.assertIsNotNone(res.data['ended_at'])

    def test_stale_interview_with_an_answer_becomes_completed_when_opened(self):
        session_id = self.create_started()
        q1 = self.first_question_id(session_id)
        self.answer(session_id, q1, 'hi')
        backdate_question(q1, minutes_ago=20)
        res = self.client.get(f'/api/interviews/{session_id}/')
        self.assertEqual(res.data['status'], 'completed')

    def test_closing_happens_only_once(self):
        session_id = self.create_started()
        backdate_question(self.first_question_id(session_id), minutes_ago=20)
        first = self.client.get(f'/api/interviews/{session_id}/').data
        second = self.client.get(f'/api/interviews/{session_id}/').data
        self.assertEqual(first['ended_at'], second['ended_at'])
        self.assertEqual(second['status'], 'abandoned')

    def test_nothing_more_is_allowed_after_auto_close(self):
        session_id = self.create_started()
        q1 = self.first_question_id(session_id)
        backdate_question(q1, minutes_ago=20)
        self.client.get(f'/api/interviews/{session_id}/')   # triggers the close
        res = self.answer(session_id, q1, 'too late')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.post(f'/api/interviews/{session_id}/complete/').status_code, 400)
        self.assertEqual(Answer.objects.filter(question_id=q1).count(), 0)

    def test_created_but_not_started_interview_is_never_closed(self):
        session_id = self.create().data['id']
        res = self.client.get(f'/api/interviews/{session_id}/')
        self.assertEqual(res.data['status'], 'created')

    # ----- listing -----
    def test_listing_closes_every_stale_interview_for_that_candidate(self):
        stale_no_answer = self.create_started()
        backdate_question(self.first_question_id(stale_no_answer), minutes_ago=20)

        stale_with_answer = self.create_started()
        q = self.first_question_id(stale_with_answer)
        self.answer(stale_with_answer, q, 'hi')
        backdate_question(q, minutes_ago=20)

        still_active = self.create_started()

        res = self.client.get('/api/interviews/')
        self.assertEqual(res.status_code, 200)
        by_id = {row['id']: row for row in res.data}
        self.assertEqual(by_id[stale_no_answer]['status'], 'abandoned')
        self.assertEqual(by_id[stale_with_answer]['status'], 'completed')
        self.assertEqual(by_id[still_active]['status'], 'in_progress')
        self.assertIsNotNone(by_id[stale_no_answer]['ended_at'])
        self.assertIsNone(by_id[still_active]['ended_at'])

    # ----- ownership -----
    def test_someone_elses_stale_interview_is_not_closed_by_me(self):
        self.client.force_authenticate(self.other)
        theirs = self.create_started()
        backdate_question(self.first_question_id(theirs), minutes_ago=20)

        self.client.force_authenticate(self.me)
        self.client.get('/api/interviews/')   # only closes MY stale interviews

        self.assertEqual(InterviewSession.objects.get(pk=theirs).status, 'in_progress')

    def test_someone_elses_interview_detail_still_gives_404(self):
        self.client.force_authenticate(self.other)
        theirs = self.create_started()
        backdate_question(self.first_question_id(theirs), minutes_ago=20)

        self.client.force_authenticate(self.me)
        self.assertEqual(self.client.get(f'/api/interviews/{theirs}/').status_code, 404)
        self.assertEqual(InterviewSession.objects.get(pk=theirs).status, 'in_progress')
