import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GoogleButton, Modal } from "../components/UI";

export default function Auth({ mode = "login" }) {
  const isRegister = mode === "register";
  const { user, login, register, loginWithGoogle, requestPasswordReset, defaultDashboardPath, loading } =
    useAuth();
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
              await loginWithGoogle(response.credential);
              navigate(defaultDashboardPath);
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
  }, [googleClientId, isRegister, defaultDashboardPath]);

  if (user) {
    return <Navigate to={defaultDashboardPath} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate(defaultDashboardPath);
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your details.");
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
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

          <div className="mt-24 max-w-md">
            <span className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase block mb-3">
              INTELLIGENT CANDIDATE ASSESSMENT
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight mb-4">
              Structured preparation for serious candidate skill evaluation.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Access curated mock interview tracks, record structured responses,
              and maintain your professional resume profile under genuine role-based access.
            </p>
          </div>
        </div>

        <div className="space-y-4 max-w-md pt-8 border-t border-slate-900 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Cryptographically verified Argon2id and JWT authentication</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Strict role-based isolation: Candidate, Recruiter, and Admin</span>
          </div>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand header */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                SH
              </div>
              <span className="font-bold text-slate-900">SmartHire AI</span>
            </Link>
          </div>

          <div className="mb-6">
            <span className="eyebrow block mb-1">
              {isRegister ? "Get Started" : "Welcome Back"}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isRegister ? "Create your account" : "Sign in to your account"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegister
                ? "Enter your details to initialize your candidate workspace"
                : "Enter your registered credentials to access your dashboard"}
            </p>
          </div>

          {/* Google Sign-In */}
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

          {/* Form */}
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
              className="btn-primary w-full justify-center mt-2 h-10"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? "Create Account" : "Sign In"}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div className="text-center text-xs text-slate-500 mt-6">
            {isRegister ? "Already registered?" : "Don't have an account yet?"}{" "}
            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-bold text-slate-900 hover:underline"
            >
              {isRegister ? "Sign In" : "Create an Account"}
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="btn-secondary text-xs"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={forgotBusy}
              className="btn-primary text-xs"
            >
              {forgotBusy ? "Submitting..." : "Send Reset Notice"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Google Setup Information Modal */}
      <Modal
        isOpen={googleInfoOpen}
        onClose={() => setGoogleInfoOpen(false)}
        title="Google Authentication Configuration"
        description="Setup required in Google Cloud Console"
      >
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            To activate live Google Sign-In, configure an OAuth 2.0 Client ID in Google Cloud Console:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <li>Visit <strong>Google Cloud Console &rarr; APIs & Services &rarr; Credentials</strong>.</li>
            <li>Create an <strong>OAuth 2.0 Web Application Client ID</strong>.</li>
            <li>Add Authorized JavaScript Origin: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">http://localhost:5173</code>.</li>
            <li>Set in <code className="bg-white px-1 py-0.5 rounded border border-slate-200">frontend/.env</code>: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">VITE_GOOGLE_CLIENT_ID=&lt;your_client_id&gt;</code>.</li>
            <li>Set in <code className="bg-white px-1 py-0.5 rounded border border-slate-200">backend/.env</code>: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">GOOGLE_CLIENT_ID=&lt;your_client_id&gt;</code>.</li>
          </ol>
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
