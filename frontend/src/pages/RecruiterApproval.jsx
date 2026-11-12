import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  RefreshCw,
  LogOut,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/UI";

export default function RecruiterApproval() {
  const { user, roles, refreshUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const isJustRegistered = searchParams.get("new") === "1";
  const isFromLogin = searchParams.get("from") === "login";

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage("");
    try {
      const updated = await refreshUser();
      const updatedRoles = updated?.roles || [];
      if (updatedRoles.includes("recruiter") || updatedRoles.includes("admin")) {
        navigate("/recruiter");
      } else {
        setMessage(
          "Your account is still awaiting recruiter approval from a platform administrator."
        );
      }
    } catch {
      setMessage("Unable to verify status at this moment. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/workspace");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              SH
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              SmartHire AI
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="panel p-8 sm:p-10 bg-white border border-slate-200 shadow-elevated text-center">
          {/* Status Icon */}
          <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5">
            <Clock size={28} />
          </div>

          <Badge variant="amber" className="mb-3">
            Status: Pending Administrator Review
          </Badge>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
            {isJustRegistered
              ? "Recruiter Account Request Submitted"
              : isFromLogin
              ? "Recruiter Authorization Required"
              : "Recruiter Access Under Review"}
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto mb-6">
            Your account is authenticated as{" "}
            <strong className="text-slate-900">{user?.email}</strong>. For
            candidate privacy and platform integrity, access to candidate
            directories and evaluation reports requires administrator verification.
          </p>

          {message && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Available Access Box */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-left mb-8 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <ShieldCheck size={16} className="text-indigo-600" />
              <span>What is available right now</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              While recruiter review is in progress, your account has full access to the{" "}
              <strong>Candidate Workspace</strong>. You can test interview chambers, practice technical
              and STAR prompts, and explore candidate performance analytics firsthand.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/app" className="btn-brand w-full sm:w-auto h-11 px-6 justify-center">
              <GraduationCap size={16} />
              <span>Go to Candidate Workspace</span>
            </Link>

            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="btn-secondary w-full sm:w-auto h-11 px-6 justify-center"
            >
              <RefreshCw size={15} className={checking ? "animate-spin" : ""} />
              <span>{checking ? "Verifying..." : "Check Approval Status"}</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Account Role: Candidate</span>
            <Link to="/workspace" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Switch Workspace
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 px-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} SmartHire AI. Enterprise mock interview & talent evaluation.
      </footer>
    </div>
  );
}

