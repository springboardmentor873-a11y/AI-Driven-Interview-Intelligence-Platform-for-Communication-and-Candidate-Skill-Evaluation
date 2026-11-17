import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Layout from "./Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Resumes from "./pages/Resumes";
import Candidates from "./pages/Candidates";
import Users from "./pages/Users";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<ProtectedRoute roles={["candidate"]} />}>
            <Route path="/resumes" element={<Resumes />} />
          </Route>
          <Route element={<ProtectedRoute roles={["recruiter", "admin"]} />}>
            <Route path="/recruiter/candidates" element={<Candidates />} />
          </Route>
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin/users" element={<Users />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
