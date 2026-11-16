from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User, CandidateProfile, RecruiterProfile


class AuthAndRBACркаTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_01_candidate_registration(self):
        payload = {
            'username': 'cand_user',
            'email': 'cand@example.com',
            'password': 'StrongPassword123!',
            'role': 'candidate'
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='cand_user').exists())
        user = User.objects.get(username='cand_user')
        self.assertEqual(user.role, 'candidate')
        self.assertTrue(hasattr(user, 'candidate_profile'))

    def test_02_recruiter_registration(self):
        payload = {
            'username': 'rec_user',
            'email': 'rec@example.com',
            'password': 'StrongPassword123!',
            'role': 'recruiter'
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='rec_user')
        self.assertEqual(user.role, 'recruiter')
        self.assertTrue(hasattr(user, 'recruiter_profile'))

    def test_03_login_for_both_roles(self):
        User.objects.create_user('cand1', 'c1@test.com', 'Pass1234', role='candidate')
        User.objects.create_user('rec1', 'r1@test.com', 'Pass1234', role='recruiter')

        # Candidate Login
        res_cand = self.client.post('/api/auth/login/', {'username': 'cand1', 'password': 'Pass1234'}, format='json')
        self.assertEqual(res_cand.status_code, status.HTTP_200_OK)
        self.assertIn('access', res_cand.data)
        self.assertIn('refresh', res_cand.data)

        # Recruiter Login
        res_rec = self.client.post('/api/auth/login/', {'username': 'rec1', 'password': 'Pass1234'}, format='json')
        self.assertEqual(res_rec.status_code, status.HTTP_200_OK)
        self.assertIn('access', res_rec.data)
        self.assertIn('refresh', res_rec.data)

    def test_04_invalid_login_credentials(self):
        User.objects.create_user('user1', 'u1@test.com', 'CorrectPass', role='candidate')
        res = self.client.post('/api/auth/login/', {'username': 'user1', 'password': 'WrongPassword'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_05_authenticated_profile_retrieval(self):
        user = User.objects.create_user('profile_user', 'p@test.com', 'Pass1234', role='candidate')
        self.client.force_authenticate(user=user)
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'profile_user')
        self.assertEqual(res.data['role'], 'candidate')
        self.assertIn('candidate_profile', res.data)

    def test_05_profile_update(self):
        user = User.objects.create_user('edit_user', 'edit@test.com', 'Pass1234', role='candidate')
        self.client.force_authenticate(user=user)
        update_data = {
            'candidate_profile': {
                'target_role': 'Full Stack Developer',
                'phone': '+1234567890',
                'bio': 'Passionate about React & Django'
            }
        }
        res = self.client.patch('/api/auth/me/', update_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['candidate_profile']['target_role'], 'Full Stack Developer')
        self.assertEqual(res.data['candidate_profile']['phone'], '+1234567890')

    def test_06_candidate_only_endpoint_access(self):
        candidate = User.objects.create_user('c_user', 'c@test.com', 'Pass1234', role='candidate')
        self.client.force_authenticate(user=candidate)
        res = self.client.get('/api/auth/candidate/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_07_recruiter_only_endpoint_access(self):
        recruiter = User.objects.create_user('r_user', 'r@test.com', 'Pass1234', role='recruiter')
        self.client.force_authenticate(user=recruiter)
        res = self.client.get('/api/auth/recruiter/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_08_cross_role_access_denial(self):
        candidate = User.objects.create_user('c_user2', 'c2@test.com', 'Pass1234', role='candidate')
        recruiter = User.objects.create_user('r_user2', 'r2@test.com', 'Pass1234', role='recruiter')

        # Candidate attempting to access Recruiter dashboard
        self.client.force_authenticate(user=candidate)
        res1 = self.client.get('/api/auth/recruiter/dashboard/')
        self.assertEqual(res1.status_code, status.HTTP_403_FORBIDDEN)

        # Recruiter attempting to access Candidate dashboard
        self.client.force_authenticate(user=recruiter)
        res2 = self.client.get('/api/auth/candidate/dashboard/')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

    def test_09_unauthenticated_access_denial(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        res_cand = self.client.get('/api/auth/candidate/dashboard/')
        self.assertEqual(res_cand.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_10_token_refresh(self):
        User.objects.create_user('refresh_u', 'rf@test.com', 'Pass1234', role='candidate')
        login_res = self.client.post('/api/auth/login/', {'username': 'refresh_u', 'password': 'Pass1234'}, format='json')
        refresh_token = login_res.data['refresh']

        ref_res = self.client.post('/api/auth/token/refresh/', {'refresh': refresh_token}, format='json')
        self.assertEqual(ref_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', ref_res.data)

    def test_11_logout_and_refresh_token_blacklisting(self):
        user = User.objects.create_user('logout_u', 'lo@test.com', 'Pass1234', role='candidate')
        login_res = self.client.post('/api/auth/login/', {'username': 'logout_u', 'password': 'Pass1234'}, format='json')
        access_token = login_res.data['access']
        refresh_token = login_res.data['refresh']

        # Logout with authorization
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_res = self.client.post('/api/auth/logout/', {'refresh': refresh_token}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_205_RESET_CONTENT)

        # Trying to use blacklisted refresh token must fail with 400 or 401
        retry_res = self.client.post('/api/auth/token/refresh/', {'refresh': refresh_token}, format='json')
        self.assertIn(retry_res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])
