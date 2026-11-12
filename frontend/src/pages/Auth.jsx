import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  GraduationCap,
  Briefcase,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Badge, GoogleButton, Modal } from "../components/UI";

export default function Auth({ mode: initialMode, workspace: initialWorkspace }) {
  const { workspaceType } = useParams();
  const [searchParams] = useSearchParams();

  // Determine workspace ('candidate' or 'recruiter')
  const workspace = initialWorkspace || workspaceType || searchParams.get("workspace") || "candidate";
  const isRecruiterWorkspace = workspace === "recruiter";

  // Tab mode: 'login' vs 'register'
  const [mode, setMode] = useState(() => {
    if (initialMode) return initialMode;
    const tab = searchParams.get("tab");
    return tab === "register" ? "register" : "login";
  });
  const isRegister = mode === "register";

  const {
    user,
    login,
    register,
    loginWithGoogle,
    requestPasswordReset,
    defaultDashboardPath,
  } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  // Google config alert modal
  const [googleInfoOpen, setGoogleInfoOpen] = useState(false);

  const googleTargetRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Post-authentication router: respects actual backend roles
  const handlePostAuth = (profile) => {
    const userRoles = profile?.roles || [];
    if (userRoles.includes("admin")) {
      navigate("/admin");
      return;
    }
    if (userRoles.includes("recruiter")) {
      navigate("/recruiter");
      return;
    }

    // Account has Candidate role only
    if (isRecruiterWorkspace) {
      if (isRegister) {
        navigate("/recruiter/pending-approval?new=1");
      } else {
        navigate("/recruiter/pending-approval?from=login");
      }
      return;
    }

    navigate("/app");
  };

  // Render official Google button if Google Identity Services is available
  useEffect(() => {
    if (!googleClientId || typeof window === "undefined" || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (response?.credential) {
            setSubmitting(true);
            setError("");
            try {
              const profile = await loginWithGoogle(response.credential);
              handlePostAuth(profile);
            } catch (err) {
              setError(err.message || "Google authentication failed.");
            } finally {
              setSubmitting(false);
            }
          }
        },
      });

      if (googleTargetRef.current) {
        googleTargetRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleTargetRef.current, {
          theme: "outline",
          size: "large",
          width: 380,
          text: isRegister ? "signup_with" : "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      }
    } catch (err) {
      console.warn("Google Identity Services setup:", err);
    }
  }, [googleClientId, isRegister, isRecruiterWorkspace]);

  if (user) {
    return <Navigate to={defaultDashboardPath} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let profile;
      if (isRegister) {
        profile = await register(name.trim(), email.trim(), password);
      } else {
        profile = await login(email.trim(), password);
      }
      handlePostAuth(profile);
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomGoogleClick = () => {
    if (!googleClientId) {
      setGoogleInfoOpen(true);
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotStatus("");
    setForgotBusy(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setForgotStatus(res.message || "Password reset request recorded.");
    } catch (err) {
      setForgotStatus("If an account exists with this email, a reset notice has been generated.");
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white selection:bg-indigo-500 selection:text-white">
      {/* Left Brand Column */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-950 text-white border-r border-slate-900">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold text-sm">
              SH
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              SmartHire AI
            </span>
          </Link>

          <div className="mt-20 max-w-md">
            <span className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase block mb-3">
              {isRecruiterWorkspace ? "RECRUITER WORKSPACE" : "CANDIDATE WORKSPACE"}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight mb-4">
              {isRecruiterWorkspace
                ? "Objective talent discovery and technical assessment review."
                : "Structured preparation for authentic candidate skill evaluation."}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {isRecruiterWorkspace
                ? "Review verified candidate skill profiles, evaluate mock interview recordings, and inspect structured performance analytics."
                : "Access curated mock interview tracks, record structured responses, and maintain your professional resume profile under genuine role-based access."}
            </p>
          </div>
        </div>

        <div className="space-y-4 max-w-md pt-8 border-t border-slate-900 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>Cryptographically verified Argon2id & JWT authentication</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>Strict role-based authorization across Candidate, Recruiter & Admin</span>
          </div>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Header Switcher */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <Link
              to="/workspace"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span>Switch Workspace</span>
            </Link>

            <Badge variant={isRecruiterWorkspace ? "purple" : "blue"}>
              {isRecruiterWorkspace ? "Recruiter" : "Candidate"}
            </Badge>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                  isRecruiterWorkspace
                    ? "bg-purple-50 text-purple-600"
                    : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {isRecruiterWorkspace ? <Briefcase size={15} /> : <GraduationCap size={16} />}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isRecruiterWorkspace ? "Talent Acquisition" : "Interview Preparation"}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isRegister
                ? isRecruiterWorkspace
                  ? "Create your Recruiter Account"
                  : "Create your Candidate Account"
                : isRecruiterWorkspace
                ? "Sign in to your Recruiter Workspace"
                : "Sign in to your Candidate Workspace"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegister
                ? isRecruiterWorkspace
                  ? "Register for recruiter review access to evaluate candidate assessments."
                  : "Enter your details to initialize your candidate interview environment."
                : isRecruiterWorkspace
                ? "Enter your credentials to access the talent pipeline console."
                : "Enter your registered credentials to access your mock interview dashboard."}
            </p>
          </div>

          {/* Tab Switcher: Sign In vs Create Account */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                !isRegister
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                isRegister
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Recruiter Registration Notice */}
          {isRegister && isRecruiterWorkspace && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock size={13} className="text-amber-700" />
                <span>Approval Workflow Notice</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Recruiter registration submits an access request for administrator verification. Candidate practice features remain accessible immediately while approval is pending.
              </p>
            </div>
          )}

          {/* Google Authentication */}
          <div className="mb-5">
            {googleClientId ? (
              <div ref={googleTargetRef} className="flex justify-center w-full" />
            ) : (
              <GoogleButton
                onClick={handleCustomGoogleClick}
                label={isRegister ? "Sign up with Google" : "Continue with Google"}
              />
            )}
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider relative">
              or continue with email
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="field-label">Full Name</label>
                <div className="field-wrap">
                  <User size={15} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="field-label">Email Address</label>
              <div className="field-wrap">
                <Mail size={15} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="field-label mb-0">Password</label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStatus("");
                      setForgotOpen(true);
                    }}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="field-wrap">
                <Lock size={15} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isRegister ? 10 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Minimum 10 characters" : "Enter your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`${
                isRecruiterWorkspace ? "btn-primary" : "btn-brand"
              } w-full justify-center mt-2 h-10`}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>
                    {isRegister
                      ? isRecruiterWorkspace
                        ? "Register as Recruiter"
                        : "Create Candidate Account"
                      : "Sign In"}
                  </span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Switch mode footer */}
          <div className="text-center text-xs text-slate-500 mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400">
              {isRecruiterWorkspace ? "Recruiter Portal" : "Candidate Portal"}
            </span>
            <Link
              to="/workspace"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Switch Workspace &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Password"
        description="Enter your registered email address to receive password recovery instructions."
      >
        <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
          {forgotStatus && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-start gap-2">
              <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
              <span>{forgotStatus}</span>
            </div>
          )}

          <div>
            <label className="field-label">Email Address</label>
            <div className="field-wrap">
              <Mail size={15} />
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={forgotBusy}
              className="btn-primary"
            >
              {forgotBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Send Reset Instructions"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Google Config Info Modal */}
      <Modal
        isOpen={googleInfoOpen}
        onClose={() => setGoogleInfoOpen(false)}
        title="Google Authentication Setup"
        description="Google Sign-In requires an active Google Client ID configuration."
      >
        <div className="text-xs text-slate-600 space-y-3">
          <p>
            Google OAuth requires a valid <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="bg-slate-100 px-1 py-0.5 rounded">frontend/.env</code> and matching backend authorization.
          </p>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setGoogleInfoOpen(false)}
              className="btn-primary text-xs"
            >
              Understood
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
