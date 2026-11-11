import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Candidate
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import ResumeManager from './pages/candidate/ResumeManager';
import InterviewList from './pages/candidate/InterviewList';

// Recruiter
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import CandidateList from './pages/recruiter/CandidateList';
import TemplateManager from './pages/recruiter/TemplateManager';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';

import { useAuthStore } from './store/authStore';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'recruiter') return <Navigate to="/recruiter/dashboard" replace />;
  return <Navigate to="/candidate/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Candidate Routes */}
        <Route
          path="/candidate/dashboard"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <Layout>
                <CandidateDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/resume"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <Layout>
                <ResumeManager />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/interviews"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <Layout>
                <InterviewList />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Recruiter Routes */}
        <Route
          path="/recruiter/dashboard"
          element={
            <ProtectedRoute allowedRoles={['recruiter']}>
              <Layout>
                <RecruiterDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/candidates"
          element={
            <ProtectedRoute allowedRoles={['recruiter']}>
              <Layout>
                <CandidateList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/templates"
          element={
            <ProtectedRoute allowedRoles={['recruiter']}>
              <Layout>
                <TemplateManager />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <SystemSettings />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
