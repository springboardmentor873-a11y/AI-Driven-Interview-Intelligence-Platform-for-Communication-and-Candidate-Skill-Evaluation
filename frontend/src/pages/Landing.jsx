import { Link } from "react-router-dom";
import {
  ArrowRight,
  PlayCircle,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  Layers,
  Terminal,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "../components/UI";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user, defaultDashboardPath } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-subtle">
              SH
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              SmartHire AI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#tracks" className="hover:text-slate-900 transition-colors">
              Practice Tracks
            </a>
            <a href="#about" className="hover:text-slate-900 transition-colors">
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to={defaultDashboardPath} className="btn-primary text-xs">
                <span>Go to Workspace</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/workspace" className="btn-quiet text-xs">
                  Sign In
                </Link>
                <Link to="/workspace" className="btn-primary text-xs">
                  <span>Go to Workspace</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-28 px-6 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Production-Ready Mock Interview & Skill Evaluation Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.12] mb-6">
          Structured interview intelligence designed for{" "}
          <span className="text-indigo-600">authentic skill evaluation.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
          Practice technical engineering, behavioural STAR scenarios, and leadership prompts.
          Record structured responses, manage candidate resumes, and maintain rigorous role-based
          oversight across Candidates, Recruiters, and Administrators.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-16">
          {user ? (
            <Link to={defaultDashboardPath} className="btn-primary w-full sm:w-auto h-11 px-6">
              <span>Go to Workspace</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/workspace" className="btn-brand w-full sm:w-auto h-11 px-6">
                <span>Go to Workspace</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#features" className="btn-secondary w-full sm:w-auto h-11 px-6">
                <span>Explore Features</span>
              </a>
            </>
          )}
        </div>

        {/* Hero Visual Mockup Preview */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 shadow-elevated max-w-5xl mx-auto text-left">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 px-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="ml-2 font-mono text-xs text-slate-500">
                app.smarthire.internal / candidate-chamber
              </span>
            </div>
            <Badge variant="green" icon={CheckCircle2}>
              Live Session Environment
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="eyebrow block mb-1">Track Selection</span>
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                Technical Architecture Track
              </h3>
              <p className="text-xs text-slate-500">
                Distributed systems, database caching, asynchronous concurrency & API fault tolerance.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="eyebrow block mb-1">Response Capture</span>
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                STAR-Method Framework
              </h3>
              <p className="text-xs text-slate-500">
                Candidate answers captured with per-prompt durations and full transcript archiving.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="eyebrow block mb-1">Security Isolation</span>
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                Strict RBAC Protection
              </h3>
              <p className="text-xs text-slate-500">
                Backend-guarded endpoints ensuring candidates, recruiters, and admins remain isolated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-20 bg-slate-50/60 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="eyebrow">Enterprise Core Capabilities</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2 mb-4">
              Everything required for authentic evaluation
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              No simulated demo statistics or fabricated AI scores. SmartHire AI focuses on
              practical, verifiable workflows backed by robust data persistence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="panel p-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4 border border-indigo-100">
                <PlayCircle size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Mock Interview Chamber
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structured prompt runner with camera/mic device testing, question timers,
                progress pacing, and immediate session transcript generation.
              </p>
            </div>

            <div className="panel p-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                <FileText size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Resume & Profile Storage
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload verified PDF resumes. Transparent status reporting showing raw document
                availability for authorized recruiter evaluation.
              </p>
            </div>

            <div className="panel p-6">
              <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Three-Tier Role Security
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Distinct workflows for Candidates (practice), Recruiters (pipeline discovery),
                and Administrators (governance and role assignment).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Tracks Section */}
      <section id="tracks" className="py-20 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="eyebrow">Structured Curriculum</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2 mb-4">
              Practice tracks tailored to role requirements
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Targeted prompts addressing key competencies in software engineering and professional communication.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
              <Badge variant="blue" className="mb-3">
                Software Engineering
              </Badge>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Technical Architecture</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Microservices, event loop execution, database query tuning, caching, and REST resiliency.
              </p>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
              <Badge variant="purple" className="mb-3">
                Leadership & Teamwork
              </Badge>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Behavioural & STAR</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Stakeholder conflict resolution, requirements ambiguity, constructive feedback, and mentoring.
              </p>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
              <Badge variant="green" className="mb-3">
                Culture & Alignment
              </Badge>
              <h3 className="font-bold text-sm text-slate-900 mb-1">HR & Culture</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Career motivations, engineering values, self-improvement domains, and pressure management.
              </p>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
              <Badge variant="amber" className="mb-3">
                Problem Solving
              </Badge>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Analytical Reasoning</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Capacity planning, latency degradation troubleshooting, throughput scaling, and index cost analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Security Section */}
      <section id="architecture" className="py-20 bg-slate-950 text-white border-t border-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase block mb-2">
                SECURITY ARCHITECTURE
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight mb-4">
                Engineered for security, privacy, and compliance.
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Built on FastAPI and PostgreSQL with asynchronous SQLAlchemy 2.0. Passwords are
                hashed using Argon2id with memory-cost constraints. Sessions use short-lived HS256 JWTs
                and cryptographically rotated refresh cookies.
              </p>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Google Identity Services with backend cryptographic tokeninfo verification</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>HttpOnly, SameSite=Lax refresh session cookies with replay protection</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Advisory-locked transactional role modifications preventing admin race conditions</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-3">
              <div className="text-slate-500">// Backend Verification Flow</div>
              <div className="text-emerald-400">POST /api/v1/auth/google {"{"} credential {"}"}</div>
              <div className="text-slate-400 pl-4">&rarr; Google OAuth 2.0 tokeninfo verification</div>
              <div className="text-slate-400 pl-4">&rarr; Ensure email_verified == True</div>
              <div className="text-slate-400 pl-4">&rarr; Check existing user by email or google_id</div>
              <div className="text-slate-400 pl-4">&rarr; Auto-assign 'candidate' default role</div>
              <div className="text-slate-400 pl-4">&rarr; Issue short-lived JWT + Rotate refresh session</div>
              <div className="text-emerald-400">&larr; HTTP 200 OK {"{"} access_token, user {"}"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="eyebrow block mb-2">ABOUT SMARTHIRE AI</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
              Built for transparent, objective interview intelligence.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              SmartHire AI bridges the gap between candidate preparation and recruiter evaluation.
              Candidates get realistic simulation environments across technical, behavioural, and leadership tracks.
              Recruiting teams receive structured evaluation frameworks and verifiable talent records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="panel p-6 bg-white border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 border border-indigo-100">
                01
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Authentic Practice</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Realistic, prompt-by-prompt session chambers that train candidates on STAR framework responses and architecture explanations without canned shortcuts.
              </p>
            </div>

            <div className="panel p-6 bg-white border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 border border-purple-100">
                02
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Verified Talent Records</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Recruiters review genuine performance transcripts, response timing, and resume alignments under strict data protection protocols.
              </p>
            </div>

            <div className="panel p-6 bg-white border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold mb-3 border border-slate-200">
                03
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Enterprise Security</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                End-to-end role isolation, Argon2id password security, cryptographic JWT authentication, and advisory-locked role governance.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link to="/workspace" className="btn-brand px-6 py-2.5 text-xs inline-flex items-center gap-2">
              <span>Choose your Workspace</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <div className="h-6 w-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs">
              SH
            </div>
            <span>SmartHire AI</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/workspace" className="hover:text-slate-900 transition-colors">
              Workspaces
            </Link>
            <Link to="/auth/candidate" className="hover:text-slate-900 transition-colors">
              Candidate Portal
            </Link>
            <Link to="/auth/recruiter" className="hover:text-slate-900 transition-colors">
              Recruiter Portal
            </Link>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Platform Features
            </a>
          </div>

          <span>&copy; {new Date().getFullYear()} SmartHire AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
