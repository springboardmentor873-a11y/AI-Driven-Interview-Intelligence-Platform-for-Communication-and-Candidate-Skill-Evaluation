
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

import CandidateDashboard from "./pages/CandidateDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

import MyResume from "./pages/MyResume";
import MyProfile from "./pages/MyProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";

// Interview Pages
import InterviewSetup from "./pages/InterviewSetup";
import InterviewRoom from "./pages/InterviewRoom";
import InterviewResult from "./pages/InterviewResult";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes - Only for logged-out users */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Forgot and Reset Password */}
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Candidate Dashboard */}
        <Route
          path="/candidate/dashboard"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <CandidateDashboard />
            </ProtectedRoute>
          }
        />

        {/* Candidate Resume */}
        <Route
          path="/candidate/resume"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <MyResume />
            </ProtectedRoute>
          }
        />

        {/* AI Interview Setup */}
        <Route
          path="/candidate/interview"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <InterviewSetup />
            </ProtectedRoute>
          }
        />

        {/* AI Interview Room */}
        <Route
          path="/candidate/interview/room"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <InterviewRoom />
            </ProtectedRoute>
          }
        />

        {/* AI Interview Result */}
        <Route
          path="/candidate/interview/result"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <InterviewResult />
            </ProtectedRoute>
          }
        />

        {/* Recruiter Dashboard */}
        <Route
          path="/recruiter/dashboard"
          element={
            <ProtectedRoute allowedRoles={["recruiter"]}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Common Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              allowedRoles={["candidate", "recruiter", "admin"]}
            >
              <MyProfile />
            </ProtectedRoute>
          }
        />

        {/* Common Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute
              allowedRoles={["candidate", "recruiter", "admin"]}
            >
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Invalid Route */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
