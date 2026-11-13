import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600 text-white font-bold text-xl mb-3 shadow-xs">
          SH
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          SmartHire AI
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          AI-Powered Candidate Assessment Platform
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Outlet />
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} SmartHire AI. All rights reserved.
      </div>
    </div>
  );
};

export default AuthLayout;
