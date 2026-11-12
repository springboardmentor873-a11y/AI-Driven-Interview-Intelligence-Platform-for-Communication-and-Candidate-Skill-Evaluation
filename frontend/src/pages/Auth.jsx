import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GoogleButton, Modal } from "../components/UI";

export default function Auth({ mode: initialMode, workspace: initialWorkspace }) {
  const { workspaceType } = useParams();
  const [searchParams] = useSearchParams();

  // Determine workspace ('candidate' or 'recruiter')
  const [workspace, setWorkspace] = useState(() => {
    if (initialWorkspace) return initialWorkspace;
    const urlWs = searchParams.get("workspace");
    if (urlWs) return urlWs;
    if (workspaceType === "recruiter") return "recruiter";
    return "candidate";
  });
  const isRecruiterWorkspace = workspace === "recruiter";

  // Tab mode: 'login' vs 'register'
  const [mode, setMode] = useState(() => {
    if (initialMode) return initialMode;
    const tab = searchParams.get("tab");
    if (tab === "register" || workspaceType === "register") return "register";
    return "login";
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

    // Candidate role
    if (isRecruiterWorkspace && isRegister) {
      navigate("/recruiter/pending-approval?new=1");
      return;
    }

    navigate("/app");
  };

  // Google Identity Services button mount
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
        const targetWidth = Math.min(
          320,
          Math.max(240, (googleTargetRef.current.offsetWidth || 300) - 20)
        );
        window.google.accounts.id.renderButton(googleTargetRef.current, {
          theme: "outline",
          size: "large",
          width: targetWidth,
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
      setForgotStatus("If an account exists with this email, a reset notice has been sent.");
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 overflow-x-hidden selection:bg-slate-900 selection:text-white">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="h-8 w-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
            SH
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">
            SmartHire AI
          </span>
        </Link>
      </div>

      {/* Centered Authentication Card */}
      <div className="w-full max-w-[420px] min-w-0 bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 sm:p-8">
        {/* Title & Subtitle */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isRegister ? "Create an account" : "Welcome back"}
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {isRegister
              ? "Sign up to start practicing or evaluating interviews."
              : "Sign in to continue to SmartHire AI."}
          </p>
        </div>

        {/* Role Selection for Registration */}
        {isRegister && (
          <div className="mb-5">
            <label className="field-label text-center mb-1.5 text-slate-500">
              I want to use SmartHire AI as:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setWorkspace("candidate")}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  !isRecruiterWorkspace
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap size={14} />
                <span>Candidate</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkspace("recruiter")}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  isRecruiterWorkspace
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Briefcase size={14} />
                <span>Recruiter</span>
              </button>
            </div>
          </div>
        )}

        {/* Google Authentication */}
        <div className="mb-5 overflow-hidden">
          <div ref={googleTargetRef} className="w-full flex justify-center overflow-hidden">
            <GoogleButton
              onClick={handleCustomGoogleClick}
              label={isRegister ? "Sign up with Google" : "Sign in with Google"}
            />
          </div>
        </div>

        {/* Centered Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            or continue with email
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
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
            <label className="field-label">Email address</label>
            <div className="field-wrap">
              <Mail size={15} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
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
                  className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
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
                autoComplete={isRegister ? "new-password" : "current-password"}
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
            className="btn-primary w-full justify-center mt-2 h-11 text-sm font-semibold shadow-sm"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <span>{isRegister ? "Create Account" : "Sign In"}</span>
            )}
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          {isRegister ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="font-semibold text-slate-900 hover:underline"
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className="font-semibold text-slate-900 hover:underline"
              >
                Create one
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Back to Home Link */}
      <div className="mt-6">
        <Link
          to="/"
          className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to SmartHire AI</span>
        </Link>
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
            Google OAuth requires a valid <code className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded font-mono">VITE_GOOGLE_CLIENT_ID</code> in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">frontend/.env</code> and matching backend authorization.
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
