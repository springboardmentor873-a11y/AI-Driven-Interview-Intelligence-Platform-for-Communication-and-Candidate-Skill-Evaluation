from rest_framework.test import APITestCase

from .models import User


class AuthTests(APITestCase):
    def test_register_forces_candidate_role(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'a', 'email': 'a@test.com', 'password': 'Strong#Pass123', 'role': 'admin'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(User.objects.get(email='a@test.com').role, 'candidate')

    def test_login_and_me(self):
        User.objects.create_user(username='b', email='b@test.com', password='Strong#Pass123')
        tok = self.client.post('/api/auth/token/', {'email': 'b@test.com', 'password': 'Strong#Pass123'}).data
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tok['access'])
        self.assertEqual(self.client.get('/api/auth/me/').data['email'], 'b@test.com')

    def test_dashboard_requires_login(self):
        self.assertEqual(self.client.get('/api/dashboard/').status_code, 401)

    def test_candidate_cannot_see_other_resumes(self):
        from resumes.models import Resume
        u1 = User.objects.create_user(username='c1', email='c1@test.com', password='Strong#Pass123')
        u2 = User.objects.create_user(username='c2', email='c2@test.com', password='Strong#Pass123')
        Resume.objects.create(owner=u1, file='x.pdf', original_name='x.pdf')
        self.client.force_authenticate(u2)
        self.assertEqual(len(self.client.get('/api/resumes/').data), 0)