import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import WorkspaceSelect from "./pages/WorkspaceSelect";
import Auth from "./pages/Auth";
import RecruiterApproval from "./pages/RecruiterApproval";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import Interview from "./pages/Interview";
import Report from "./pages/Report";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import CandidateDirectory from "./pages/CandidateDirectory";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Unauthorized from "./pages/Unauthorized";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs">
        Checking authentication...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/workspace" replace />;
  }

  return children;
}

function RoleGuard({ allowedRoles, fallbackPath, children }) {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs">
        Verifying role authorization...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/workspace" replace />;
  }

  const hasPermission = allowedRoles.some((r) => roles.includes(r));
  if (!hasPermission) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/workspace" element={<WorkspaceSelect />} />

      {/* Role-Specific Authentication Routes */}
      <Route path="/auth/candidate" element={<Auth workspace="candidate" />} />
      <Route path="/auth/recruiter" element={<Auth workspace="recruiter" />} />
      <Route path="/auth/:workspaceType" element={<Auth />} />

      {/* Legacy Auth Redirects */}
      <Route path="/login" element={<Navigate to="/workspace" replace />} />
      <Route path="/register" element={<Navigate to="/workspace" replace />} />

      {/* Access Restriction & Status Pages */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/recruiter/pending-approval"
        element={
          <ProtectedRoute>
            <RecruiterApproval />
          </ProtectedRoute>
        }
      />

      {/* Candidate Area */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["candidate", "admin"]}>
              <Layout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="resume" element={<Resume />} />
        <Route path="interview" element={<Interview />} />
        <Route path="report" element={<Report />} />
        <Route path="history" element={<History />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* Recruiter Area */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute>
            <RoleGuard
              allowedRoles={["recruiter", "admin"]}
              fallbackPath="/recruiter/pending-approval"
            >
              <Layout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<RecruiterDashboard />} />
        <Route path="candidates" element={<CandidateDirectory />} />
      </Route>

      {/* Admin Area */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["admin"]}>
              <Layout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminDashboard />} />
      </Route>

      {/* Shared Account Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Profile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
