from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from resumes.models import Resume
from .models import InterviewSession, InterviewQuestion


class InterviewEngineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.candidate = User.objects.create_user('cand_user', 'cand@test.com', 'Pass1234', role='candidate')
        self.recruiter = User.objects.create_user('rec_user', 'rec@test.com', 'Pass1234', role='recruiter')

        self.resume = Resume.objects.create(
            user=self.candidate,
            text='Python, Django, React, PostgreSQL experience.',
            skills={'technical': ['Python', 'Django', 'React', 'PostgreSQL']},
            summary='Full Stack Engineer'
        )

    def test_create_interview_session_and_generate_questions(self):
        self.client.force_authenticate(user=self.candidate)
        payload = {
            'target_role': 'Full Stack Developer',
            'interview_type': 'technical',
            'difficulty': 'medium',
            'total_questions': 3,
            'resume_id': self.resume.id
        }
        res = self.client.post('/api/interviews/sessions/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', res.data)
        self.assertEqual(len(res.data['questions']), 3)
        self.assertEqual(res.data['status'], 'in_progress')

        # Check DB
        session_id = res.data['id']
        session = InterviewSession.objects.get(id=session_id)
        self.assertEqual(session.candidate, self.candidate)
        self.assertEqual(session.questions.count(), 3)

    def test_recruiter_cannot_create_or_access_interview_sessions(self):
        self.client.force_authenticate(user=self.recruiter)
        res = self.client.post('/api/interviews/sessions/', {'target_role': 'Backend Dev'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_submit_answer_and_complete_session(self):
        self.client.force_authenticate(user=self.candidate)
        res = self.client.post('/api/interviews/sessions/', {'target_role': 'DevOps', 'total_questions': 2}, format='json')
        session_id = res.data['id']
        q1_id = res.data['questions'][0]['id']
        q2_id = res.data['questions'][1]['id']

        # Submit answer to question 1
        ans1_res = self.client.post(
            f'/api/interviews/sessions/{session_id}/questions/{q1_id}/answer/',
            {'candidate_answer': 'My answer to Q1', 'time_taken_seconds': 45, 'status': 'answered'},
            format='json'
        )
        self.assertEqual(ans1_res.status_code, status.HTTP_200_OK)
        self.assertEqual(ans1_res.data['status'], 'in_progress')

        # Submit answer to question 2 (last question)
        ans2_res = self.client.post(
            f'/api/interviews/sessions/{session_id}/questions/{q2_id}/answer/',
            {'candidate_answer': 'My answer to Q2', 'time_taken_seconds': 60, 'status': 'answered'},
            format='json'
        )
        self.assertEqual(ans2_res.status_code, status.HTTP_200_OK)
        self.assertEqual(ans2_res.data['status'], 'completed')

    def test_candidate_can_list_their_sessions(self):
        self.client.force_authenticate(user=self.candidate)
        self.client.post('/api/interviews/sessions/', {'target_role': 'Frontend', 'total_questions': 2}, format='json')
        list_res = self.client.get('/api/interviews/sessions/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_res.data), 1)
