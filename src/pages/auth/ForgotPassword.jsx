import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';

const ForgotPassword = () => {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const result = await resetPassword(email);
    if (result.success) {
      setMessage('Password reset instructions have been sent to your email.');
    } else {
      const code = result.error?.code;
      let msg = 'Failed to send password reset email. Please try again.';
      if (code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      else if (code === 'auth/user-not-found') msg = 'No account found with this email address.';
      setError(msg);
    }
    setSubmitting(false);
  };

  if (loading) return <Loading message="Loading..." />;

  return (
    <div className="bg-white py-8 px-6 sm:px-8 border border-gray-200 rounded-lg shadow-xs">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center">Reset your password</h2>
        <p className="text-xs text-gray-500 text-center mt-1">
          Enter your registered email to receive password reset instructions
        </p>
      </div>

      {message && (
        <div className="mb-5 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
          {message}
        </div>
      )}

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

        <Button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5"
        >
          {submitting ? 'Sending instructions...' : 'Send reset email'}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600">
          Remember your password?{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
