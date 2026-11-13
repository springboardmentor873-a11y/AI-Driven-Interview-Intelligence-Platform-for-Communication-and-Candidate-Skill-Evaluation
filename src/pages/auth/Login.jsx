import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';

const Login = () => {
  const { login, loading, user, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated and profile loaded, redirect to appropriate dashboard
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.role === 'recruiter') {
        navigate('/recruiter/dashboard', { replace: true });
      } else {
        navigate('/candidate/dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login({ email, password });
    if (!result.success) {
      const code = result.error?.code;
      let message = 'Login failed. Please check your credentials and try again.';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later.';
      } else if (result.error?.message === 'Account disabled') {
        message = 'Your account has been deactivated. Please contact administrator.';
      }
      setError(message);
    }
    setSubmitting(false);
  };

  if (loading) return <Loading message="Initializing session..." />;

  return (
    <div className="bg-white py-8 px-6 sm:px-8 border border-gray-200 rounded-lg shadow-xs">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center">Sign in to your account</h2>
        <p className="text-xs text-gray-500 text-center mt-1">
          Enter your email and password to access the platform
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="name@company.com"
          autoComplete="email"
        />

        <div>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            autoComplete="current-password"
            showPasswordToggle
          />
          <div className="flex justify-end -mt-2 mb-4">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
