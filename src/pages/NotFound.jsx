import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 shadow-xs p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 font-bold text-xl mb-4">
        404
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-sm text-gray-600 mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/">
        <Button className="w-full">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  </div>
);

export default NotFound;
