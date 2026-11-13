import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agree) {
      setError('You must accept the terms and conditions.');
      return;
    }

    setSubmitting(true);
    const result = await register({ name, email, password });
    if (!result.success) {
      const code = result.error?.code;
      let message = 'Registration failed. Please try again.';
      if (code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (code === 'auth/invalid-email') {
        message = 'Please provide a valid email address.';
      } else if (code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      }
      setError(message);
    }
    setSubmitting(false);
  };

  if (loading) return <Loading message="Creating your account..." />;

  return (
    <div className="bg-white py-8 px-6 sm:px-8 border border-gray-200 rounded-lg shadow-xs">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center">Create your account</h2>
        <p className="text-xs text-gray-500 text-center mt-1">
          Register to begin mock interviews and candidate assessments
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Jane Doe"
          autoComplete="name"
        />

        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="name@company.com"
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="At least 6 characters"
          autoComplete="new-password"
          showPasswordToggle
        />

        <Input
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Repeat password"
          autoComplete="new-password"
          showPasswordToggle
        />

        <div className="flex items-start pt-1">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 text-xs text-gray-600">
            I agree to the <span className="text-blue-600 font-medium">Terms of Service</span> and <span className="text-blue-600 font-medium">Privacy Policy</span>
          </label>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 mt-2"
        >
          {submitting ? 'Registering...' : 'Register'}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
