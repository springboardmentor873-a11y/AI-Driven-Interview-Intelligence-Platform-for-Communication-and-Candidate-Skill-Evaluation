import { Link } from "react-router-dom";
import {
  GraduationCap,
  Briefcase,
  Check,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/UI";

export default function WorkspaceSelect() {
  const { user, defaultDashboardPath, roles } = useAuth();

  const candidateFeatures = [
    "Resume management",
    "AI mock interview preparation",
    "Interview history",
    "Assessment reports",
    "Personal performance analytics",
  ];

  const recruiterFeatures = [
    "Candidate discovery",
    "Candidate profiles",
    "Resume review",
    "Interview assessment review",
    "Recruitment analytics",
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              SH
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              SmartHire AI
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>

            {user && (
              <Link to={defaultDashboardPath} className="btn-primary text-xs">
                <span>Go to Authorized Dashboard</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Selection Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 md:py-16 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="eyebrow block mb-2">WORKSPACE ONBOARDING</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Choose your workspace
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Select how you want to use SmartHire AI. Each workspace is tailored to your workflow and role requirements.
          </p>
        </div>

        {/* Existing Session Notice */}
        {user && (
          <div className="max-w-xl mx-auto mb-8 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-indigo-950 font-medium">
              <UserCheck size={16} className="text-indigo-600 shrink-0" />
              <span>
                Currently authenticated as <strong>{user.email}</strong> (Roles:{" "}
                {roles.join(", ")})
              </span>
            </div>
            <Link
              to={defaultDashboardPath}
              className="font-bold text-indigo-600 hover:text-indigo-700 underline shrink-0"
            >
              Open Workspace
            </Link>
          </div>
        )}

        {/* Two Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Candidate Card */}
          <div className="panel p-8 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-elevated transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <Badge variant="blue">Candidate Preparation</Badge>
              </div>

              <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                Candidate Workspace
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Prepare for interviews, manage your resume, practice structured responses, and track your performance.
              </p>

              <div className="space-y-2.5 mb-8 border-t border-slate-100 pt-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Included capabilities
                </span>
                {candidateFeatures.map((feat) => (
                  <div key={feat} className="flex items-center gap-2.5 text-xs text-slate-700">
                    <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/auth/candidate"
              className="btn-primary w-full h-11 text-sm justify-center transition-colors"
            >
              <span>Continue as Candidate</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Recruiter Card */}
          <div className="panel p-8 bg-white border border-slate-200 hover:border-purple-300 hover:shadow-elevated transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Briefcase size={22} />
                </div>
                <Badge variant="purple">Talent Acquisition</Badge>
              </div>

              <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                Recruiter Workspace
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Discover talent, review candidate profiles, and evaluate interview performance.
              </p>

              <div className="space-y-2.5 mb-8 border-t border-slate-100 pt-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Included capabilities
                </span>
                {recruiterFeatures.map((feat) => (
                  <div key={feat} className="flex items-center gap-2.5 text-xs text-slate-700">
                    <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/auth/recruiter"
              className="btn-primary w-full h-11 text-sm justify-center group-hover:bg-slate-800 transition-colors"
            >
              <span>Continue as Recruiter</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Workspace Guidance Note */}
        <div className="mt-12 text-center text-xs text-slate-500 max-w-lg mx-auto flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-slate-400 shrink-0" />
          <span>
            Candidate and recruiter accounts maintain dedicated dashboards and tools tailored to your goals.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} SmartHire AI. Enterprise mock interview & talent evaluation.</span>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-slate-900">Home</Link>
            <Link to="/auth/candidate" className="hover:text-slate-900">Candidate Sign In</Link>
            <Link to="/auth/recruiter" className="hover:text-slate-900">Recruiter Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

