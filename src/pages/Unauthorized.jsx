import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../components/common/Button';

const Unauthorized = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 shadow-xs p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600 mb-4">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-600 mb-6">
          You do not have the required permissions or role to access this area.
        </p>
        <div className="space-y-3">
          <Button onClick={() => navigate(-1)} variant="secondary" className="w-full">
            Go Back
          </Button>
          <Button onClick={handleLogout} variant="primary" className="w-full">
            Log out & Sign In Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
