"""Unit tests for the per-question timing rules in lifecycle.py.

Nothing here waits in real time - every test moves the clock by setting
`started_at` to a time in the past, the same way the server itself works
out whether a question is still active.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from .lifecycle import (
    active_question,
    answer_deadline,
    close_if_abandoned,
    earlier_questions_resolved,
    last_activity_at,
    question_seconds_left,
    question_status,
)
from .models import Answer, InterviewQuestion, InterviewSession


def make_session(user, num_questions=3):
    session = InterviewSession.objects.create(
        candidate=user, num_questions=num_questions, time_limit_minutes=num_questions * 2)
    questions = [
        InterviewQuestion.objects.create(session=session, question_text=f'Question {i}', category='hr', order_no=i)
        for i in range(1, num_questions + 1)
    ]
    return session, questions


class QuestionStatusTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='s1', email='s1@test.com', password='Strong#Pass123')
        self.session, questions = make_session(self.user)
        self.q1, self.q2, self.q3 = questions

    def test_not_started_is_pending(self):
        self.assertEqual(question_status(self.q1), 'pending')
        self.assertIsNone(question_seconds_left(self.q1))

    def test_started_recently_is_active(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=10)
        self.assertEqual(question_status(self.q1), 'active')
        left = question_seconds_left(self.q1)
        self.assertTrue(105 <= left <= 110)

    def test_time_up_without_an_answer_is_expired(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=150)
        self.assertEqual(question_status(self.q1), 'expired')
        self.assertIsNone(question_seconds_left(self.q1))

    def test_right_at_the_limit_is_still_active(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=119)
        self.assertEqual(question_status(self.q1), 'active')

    def test_skipped_flag_wins_over_time(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=10)
        self.q1.skipped = True
        self.assertEqual(question_status(self.q1), 'skipped')

    def test_an_answer_makes_it_answered_even_if_marked_skipped(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=10)
        self.q1.skipped = True
        self.q1.save()
        Answer.objects.create(question=self.q1, candidate=self.user, text_answer='hi')
        self.q1.refresh_from_db()
        self.assertEqual(question_status(self.q1), 'answered')
        self.assertIsNone(question_seconds_left(self.q1))

    def test_answer_deadline_adds_the_grace_period(self):
        start = timezone.now()
        self.q1.started_at = start
        self.assertEqual(answer_deadline(self.q1), start + timedelta(seconds=125))


class ActiveQuestionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='s2', email='s2@test.com', password='Strong#Pass123')
        self.session, questions = make_session(self.user)
        self.q1, self.q2, self.q3 = questions

    def test_none_before_anything_starts(self):
        self.assertIsNone(active_question(self.session))

    def test_the_started_question_is_active(self):
        self.q2.started_at = timezone.now()
        self.q2.save()
        self.assertEqual(active_question(self.session), self.q2)

    def test_none_when_the_only_started_question_is_already_resolved(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=200)
        self.q1.skipped = True
        self.q1.save()
        self.assertIsNone(active_question(self.session))


class EarlierQuestionsResolvedTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='s3', email='s3@test.com', password='Strong#Pass123')
        self.session, questions = make_session(self.user)
        self.q1, self.q2, self.q3 = questions

    def test_true_for_the_first_question(self):
        self.assertTrue(earlier_questions_resolved(1, [self.q1, self.q2, self.q3]))

    def test_false_while_an_earlier_question_is_still_pending(self):
        self.assertFalse(earlier_questions_resolved(2, [self.q1, self.q2, self.q3]))

    def test_false_while_an_earlier_question_is_active(self):
        self.q1.started_at = timezone.now()
        self.assertFalse(earlier_questions_resolved(2, [self.q1, self.q2, self.q3]))

    def test_true_once_the_earlier_question_is_answered(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=10)
        self.q1.save()
        Answer.objects.create(question=self.q1, candidate=self.user, text_answer='hi')
        self.q1.refresh_from_db()
        self.assertTrue(earlier_questions_resolved(2, [self.q1, self.q2, self.q3]))

    def test_true_once_the_earlier_question_has_expired(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=200)
        self.assertTrue(earlier_questions_resolved(2, [self.q1, self.q2, self.q3]))


class LastActivityAtTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='s4', email='s4@test.com', password='Strong#Pass123')
        self.session, questions = make_session(self.user)
        self.q1, self.q2, self.q3 = questions
        self.session.started_at = timezone.now() - timedelta(hours=1)
        self.session.save()

    def test_falls_back_to_the_interview_start_when_no_question_has_started(self):
        self.assertEqual(last_activity_at(self.session, [self.q1, self.q2, self.q3]), self.session.started_at)

    def test_uses_the_most_recently_started_question_plus_its_time_and_grace(self):
        self.q1.started_at = timezone.now() - timedelta(minutes=10)
        self.q2.started_at = timezone.now() - timedelta(minutes=3)   # the most recent one
        last = last_activity_at(self.session, [self.q1, self.q2, self.q3])
        self.assertEqual(last, self.q2.started_at + timedelta(seconds=125))   # 120s + 5s grace


class CloseIfAbandonedTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='s5', email='s5@test.com', password='Strong#Pass123')
        self.session, questions = make_session(self.user)
        self.q1, self.q2, self.q3 = questions
        self.session.status = InterviewSession.Status.IN_PROGRESS
        self.session.started_at = timezone.now() - timedelta(minutes=30)
        self.session.save()
        self.q1.started_at = self.session.started_at
        self.q1.save()

    def test_active_interview_is_not_closed(self):
        self.q1.started_at = timezone.now() - timedelta(minutes=1)
        self.q1.save()
        self.assertFalse(close_if_abandoned(self.session))
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'in_progress')
        self.assertIsNone(self.session.ended_at)

    def test_just_inside_the_fifteen_minute_limit_is_not_closed(self):
        # question time (120s) + grace (5s) + just under 15 minutes = 1025s
        self.q1.started_at = timezone.now() - timedelta(seconds=1020)
        self.q1.save()
        self.assertFalse(close_if_abandoned(self.session))

    def test_just_past_the_fifteen_minute_limit_is_closed(self):
        self.q1.started_at = timezone.now() - timedelta(seconds=1030)
        self.q1.save()
        self.assertTrue(close_if_abandoned(self.session))

    def test_without_an_answer_becomes_abandoned(self):
        self.q1.started_at = timezone.now() - timedelta(minutes=20)
        self.q1.save()
        self.assertTrue(close_if_abandoned(self.session))
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'abandoned')
        self.assertIsNotNone(self.session.ended_at)

    def test_with_an_answer_becomes_completed(self):
        self.q1.started_at = timezone.now() - timedelta(minutes=20)
        self.q1.save()
        Answer.objects.create(question=self.q1, candidate=self.user, text_answer='hi')
        self.assertTrue(close_if_abandoned(self.session))
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'completed')

    def test_closing_twice_does_nothing_the_second_time(self):
        self.q1.started_at = timezone.now() - timedelta(minutes=20)
        self.q1.save()
        self.assertTrue(close_if_abandoned(self.session))
        self.assertFalse(close_if_abandoned(self.session))

    def test_a_created_but_never_started_interview_is_untouched(self):
        self.session.status = InterviewSession.Status.CREATED
        self.session.save()
        self.assertFalse(close_if_abandoned(self.session))
