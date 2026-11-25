from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from .models import InterviewSession


class SecondsLeftTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username='s1', email='s1@test.com', password='Strong#Pass123')
        self.session = InterviewSession.objects.create(candidate=user, time_limit_minutes=10)

    def test_none_before_start(self):
        self.assertIsNone(self.session.seconds_left)

    def test_counts_down_while_in_progress(self):
        self.session.status = 'in_progress'
        self.session.started_at = timezone.now() - timedelta(minutes=4)
        left = self.session.seconds_left
        self.assertTrue(355 <= left <= 360)

    def test_never_below_zero(self):
        self.session.status = 'in_progress'
        self.session.started_at = timezone.now() - timedelta(minutes=99)
        self.assertEqual(self.session.seconds_left, 0)

    def test_none_when_completed(self):
        self.session.status = 'completed'
        self.session.started_at = timezone.now()
        self.assertIsNone(self.session.seconds_left)

    def test_new_defaults(self):
        self.assertEqual(self.session.num_questions, 5)
        self.assertEqual(self.session.question_source, 'bank')
        self.assertIsNone(self.session.resume)
