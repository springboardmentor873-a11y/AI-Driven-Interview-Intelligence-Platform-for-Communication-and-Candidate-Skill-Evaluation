from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from .lifecycle import deadline_for
from .models import Answer, InterviewSession


@override_settings(GEMINI_API_KEY='', GEMINI_MODEL='')   # no external AI call in tests
class AutoCloseTests(APITestCase):
    def setUp(self):
        make = User.objects.create_user
        self.me = make(username='me', email='me@test.com', password='Strong#Pass123')
        self.other = make(username='other', email='other@test.com', password='Strong#Pass123')
        self.client.force_authenticate(self.me)

    def running_session(self, seconds_ago, with_answer=False, client_user=None):
        """A started interview (limit 5 minutes) whose start was `seconds_ago` seconds ago."""
        if client_user:
            self.client.force_authenticate(client_user)
        body = {'category': 'hr', 'difficulty': 'easy', 'num_questions': 3, 'time_limit_minutes': 5}
        session_id = self.client.post('/api/interviews/', body, format='json').data['id']
        self.client.post(f'/api/interviews/{session_id}/start/')
        if with_answer:
            question_id = self.client.get(f'/api/interviews/{session_id}/').data['questions'][0]['id']
            self.client.post(
                f'/api/interviews/{session_id}/answers/',
                {'question_id': question_id, 'text_answer': 'My answer'}, format='multipart')
        InterviewSession.objects.filter(pk=session_id).update(
            started_at=timezone.now() - timedelta(seconds=seconds_ago))
        if client_user:
            self.client.force_authenticate(self.me)
        return session_id

    def fresh(self, session_id):
        return InterviewSession.objects.get(pk=session_id)

    # limit is 5 minutes = 300 s, so the closing time is 330 s after the start
    def test_opened_after_deadline_with_an_answer_becomes_completed(self):
        session_id = self.running_session(seconds_ago=400, with_answer=True)
        res = self.client.get(f'/api/interviews/{session_id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'completed')
        self.assertIsNotNone(res.data['ended_at'])
        self.assertIsNone(res.data['seconds_left'])
        session = self.fresh(session_id)
        self.assertEqual(session.status, 'completed')
        self.assertEqual(session.ended_at, deadline_for(session))

    def test_opened_after_deadline_without_answers_becomes_abandoned(self):
        session_id = self.running_session(seconds_ago=400)
        res = self.client.get(f'/api/interviews/{session_id}/')
        self.assertEqual(res.data['status'], 'abandoned')
        self.assertIsNotNone(res.data['ended_at'])
        self.assertEqual(self.fresh(session_id).status, 'abandoned')

    def test_inside_the_grace_time_it_stays_open(self):
        session_id = self.running_session(seconds_ago=310)   # past 300 s, inside 330 s
        res = self.client.get(f'/api/interviews/{session_id}/')
        self.assertEqual(res.data['status'], 'in_progress')
        self.assertIsNone(self.fresh(session_id).ended_at)
        self.assertEqual(res.data['seconds_left'], 0)

    def test_running_and_not_started_interviews_are_not_touched(self):
        running = self.running_session(seconds_ago=60)
        body = {'category': 'hr', 'difficulty': 'easy', 'num_questions': 3, 'time_limit_minutes': 5}
        waiting = self.client.post('/api/interviews/', body, format='json').data['id']
        self.client.get('/api/interviews/')
        self.assertEqual(self.fresh(running).status, 'in_progress')
        self.assertEqual(self.fresh(waiting).status, 'created')

    def test_listing_closes_every_expired_interview(self):
        with_answer = self.running_session(seconds_ago=500, with_answer=True)
        without_answer = self.running_session(seconds_ago=500)
        still_open = self.running_session(seconds_ago=100)
        res = self.client.get('/api/interviews/')
        self.assertEqual(res.status_code, 200)
        by_id = {row['id']: row for row in res.data}
        self.assertEqual(by_id[with_answer]['status'], 'completed')
        self.assertEqual(by_id[without_answer]['status'], 'abandoned')
        self.assertEqual(by_id[still_open]['status'], 'in_progress')
        self.assertIsNotNone(by_id[with_answer]['ended_at'])
        self.assertIsNotNone(by_id[without_answer]['ended_at'])
        self.assertIsNone(by_id[still_open]['ended_at'])

    def test_closing_happens_only_once(self):
        session_id = self.running_session(seconds_ago=400)
        self.client.get(f'/api/interviews/{session_id}/')
        first_end = self.fresh(session_id).ended_at
        self.client.get(f'/api/interviews/{session_id}/')
        self.client.get('/api/interviews/')
        self.assertEqual(self.fresh(session_id).ended_at, first_end)
        self.assertEqual(self.fresh(session_id).status, 'abandoned')

    def test_nothing_more_is_allowed_after_auto_close(self):
        session_id = self.running_session(seconds_ago=400)
        question_id = self.client.get(f'/api/interviews/{session_id}/').data['questions'][0]['id']
        res = self.client.post(
            f'/api/interviews/{session_id}/answers/',
            {'question_id': question_id, 'text_answer': 'too late'}, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.post(f'/api/interviews/{session_id}/complete/').status_code, 400)
        self.assertEqual(Answer.objects.count(), 0)

    def test_someone_elses_expired_interview_is_not_closed_by_me(self):
        theirs = self.running_session(seconds_ago=400, client_user=self.other)
        self.assertEqual(self.client.get(f'/api/interviews/{theirs}/').status_code, 404)
        self.assertEqual(len(self.client.get('/api/interviews/').data), 0)
        self.assertEqual(self.fresh(theirs).status, 'in_progress')
        self.assertIsNone(self.fresh(theirs).ended_at)
