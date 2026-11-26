
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import App from "./App";
import "./index.css";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import JobSeekerDashboard from "./pages/JobSeekerDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";

import InterviewDashboard from "./pages/InterviewDashboard";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewRoom from "./pages/InterviewRoom";
import InterviewHistory from "./pages/InterviewHistory";

const DashboardRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d1a] text-white flex items-center justify-center">
        Loading SmartHire AI...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Navigate
      to={
        user.role === "job_seeker"
          ? "/job-seeker"
          : "/recruiter"
      }
      replace
    />
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/" element={<App />} />

      <Route element={<ProtectedRoute />}>
        {/* Dashboards */}
        <Route
          path="/job-seeker"
          element={<JobSeekerDashboard />}
        />

        <Route
          path="/recruiter"
          element={<RecruiterDashboard />}
        />

        {/* Interview dashboard */}
        <Route
          path="/interviews"
          element={<InterviewDashboard />}
        />

        {/* Interview setup */}
        <Route
          path="/interviews/setup"
          element={<InterviewSetup />}
        />

        {/* New interview preview */}
        <Route
          path="/interviews/room/preview"
          element={<InterviewRoom />}
        />

        {/* Existing interview session */}
        <Route
          path="/interviews/room/:sessionId"
          element={<InterviewRoom />}
        />

        {/* Interview history */}
        <Route
          path="/interviews/history"
          element={<InterviewHistory />}
        />
      </Route>

      {/* Dashboard redirect */}
      <Route
        path="/dashboard"
        element={<DashboardRedirect />}
      />

      {/* Invalid routes */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
