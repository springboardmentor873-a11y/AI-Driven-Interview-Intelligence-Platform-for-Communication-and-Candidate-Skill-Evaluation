import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Resumes from "./pages/Resumes";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminUsers from "./pages/AdminUsers";
import Templates from "./pages/Templates";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewRoom from "./pages/InterviewRoom";

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
               <Route element={<ProtectedRoute roles={["candidate"]} />}>
              <Route path="/resumes" element={<Resumes />} />
              <Route path="/interview" element={<InterviewSetup />} />
              <Route path="/interview/:id" element={<InterviewRoom />} />
            </Route>
            <Route element={<ProtectedRoute roles={["recruiter"]} />}>
              <Route path="/templates" element={<Templates />} />
            </Route>
            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}