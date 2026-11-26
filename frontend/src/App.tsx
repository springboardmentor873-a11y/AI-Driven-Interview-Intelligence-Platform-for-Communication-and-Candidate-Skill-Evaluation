import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Mail,
  Lock,
  User,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  registerUser,
  loginUser,
  verifyOTP,
  forgotPassword,
  resetPassword,
} from "./services/authService";

import { useAuth } from "./context/AuthContext";

type Role = "job_seeker" | "recruiter";

function App() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("job_seeker");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const showMessage = (
    text: string,
    type: "success" | "error"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isVerifying) {
        const result = await verifyOTP(email, otp);

        setIsVerifying(false);
        setIsLogin(true);
        setOtp("");
        setPassword("");

        showMessage(
          result.message || "Email verified successfully. Please log in.",
          "success"
        );
      } else if (isForgotPassword) {
        const result = await forgotPassword(email);

        setIsForgotPassword(false);
        setIsResettingPassword(true);

        showMessage(
          result.message || "Reset OTP sent to your email.",
          "success"
        );
      } else if (isResettingPassword) {
        const result = await resetPassword(email, otp, newPassword);

        setIsResettingPassword(false);
        setIsLogin(true);
        setOtp("");
        setPassword("");
        setNewPassword("");

        showMessage(
          result.message || "Password reset successful. Please log in.",
          "success"
        );
      } else if (isLogin) {
        const result = await loginUser({ email, password });

        sessionStorage.setItem("access_token", result.access_token);

        const currentUser = await refreshUser();

        if (!currentUser) {
          showMessage(
            "Login succeeded, but profile loading failed. Please try again.",
            "error"
          );
          return;
        }

        if (currentUser.role === "job_seeker") {
          navigate("/job-seeker", { replace: true });
        } else if (currentUser.role === "recruiter") {
          navigate("/recruiter", { replace: true });
        } else {
          sessionStorage.removeItem("access_token");
          showMessage("Invalid account role.", "error");
        }
      } else {
        const result = await registerUser({
          full_name: fullName,
          email,
          password,
          role,
        });

        setIsVerifying(true);
        setOtp("");

        showMessage(
          result.message ||
            "Registration successful. Please check your email for OTP.",
          "success"
        );
      }
    } catch (error: any) {
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Something went wrong. Please try again.";

      showMessage(
        typeof detail === "string"
          ? detail
          : "Please check your input and try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (login: boolean) => {
    setIsLogin(login);
    setIsVerifying(false);
    setIsForgotPassword(false);
    setIsResettingPassword(false);
    setMessage("");
    setOtp("");
    setNewPassword("");
  };

  const openForgotPassword = () => {
    setIsForgotPassword(true);
    setIsVerifying(false);
    setIsResettingPassword(false);
    setMessage("");
    setOtp("");
  };

  const goBackToLogin = () => {
    setIsLogin(true);
    setIsVerifying(false);
    setIsForgotPassword(false);
    setIsResettingPassword(false);
    setMessage("");
    setOtp("");
    setNewPassword("");
  };

  const pageTitle = isVerifying
    ? "Verify Your Email"
    : isForgotPassword
      ? "Forgot Password"
      : isResettingPassword
        ? "Reset Password"
        : isLogin
          ? "Welcome Back!"
          : "Create Account";

  const pageDescription = isVerifying
    ? `Enter the 6-digit OTP sent to ${email}.`
    : isForgotPassword
      ? "Enter your registered email to receive a reset OTP."
      : isResettingPassword
        ? "Enter the OTP and choose your new password."
        : isLogin
          ? "Sign in to continue your journey."
          : "Join us and discover new opportunities.";

  return (
    <main className="min-h-screen bg-[#080d1a] flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full top-0 left-0" />
      <div className="absolute w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full bottom-0 right-0" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-5xl grid md:grid-cols-2 bg-[#10182a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <section className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-950 via-[#10182a] to-purple-950">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                <BrainCircuit size={30} />
              </div>
              <h1 className="text-2xl font-bold text-white">
                SmartHire<span className="text-blue-400"> AI</span>
              </h1>
            </div>

            <h2 className="text-4xl font-bold text-white mt-20 leading-tight">
              Discover Your
              <span className="text-blue-400"> Potential.</span>
              <br />
              Build Your Future.
            </h2>

            <p className="text-gray-400 mt-6 leading-7">
              An intelligent recruitment platform connecting talented
              professionals with the right opportunities through AI.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-300">
              <ShieldCheck className="text-blue-400" />
              Secure authentication
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <BriefcaseBusiness className="text-blue-400" />
              Smart job opportunities
            </div>
            <p className="text-xs text-gray-500 pt-5">
              © 2026 SmartHire AI. All rights reserved.
            </p>
          </div>
        </section>

        <section className="p-7 sm:p-12">
          <div className="md:hidden flex items-center gap-2 mb-10">
            <BrainCircuit className="text-blue-400" size={28} />
            <h1 className="text-xl font-bold text-white">
              SmartHire AI
            </h1>
          </div>

          <div className="mb-8">
            <p className="text-blue-400 text-sm font-semibold tracking-wider uppercase">
              Welcome to SmartHire
            </p>
            <h2 className="text-3xl font-bold text-white mt-3">
              {pageTitle}
            </h2>
            <p className="text-gray-400 mt-2">{pageDescription}</p>
          </div>

          {!isVerifying && !isForgotPassword && !isResettingPassword && (
            <div className="flex bg-[#080d1a] rounded-xl p-1 mb-7">
              <button
                type="button"
                onClick={() => switchMode(true)}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  isLogin
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  !isLogin
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>
          )}

          {message && (
            <div
              role="alert"
              className={`mb-5 rounded-xl border p-3 text-sm ${
                messageType === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && !isVerifying && !isForgotPassword && !isResettingPassword && (
              <>
                <div>
                  <label className="text-sm text-gray-300 block mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 text-gray-500" size={19} />
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      minLength={2}
                      className="w-full bg-[#080d1a] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-300 block mb-2">
                    Account Type
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full bg-[#080d1a] border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="job_seeker">Job Seeker</option>
                    <option value="recruiter">Recruiter</option>
                  </select>
                </div>
              </>
            )}

            {!isVerifying && !isResettingPassword && (
              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-500" size={19} />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#080d1a] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {!isVerifying && !isForgotPassword && !isResettingPassword && (
              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-500" size={19} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#080d1a] border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>
            )}

            {(isVerifying || isResettingPassword) && (
              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  {isVerifying ? "Email Verification OTP" : "Password Reset OTP"}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  minLength={6}
                  maxLength={6}
                  className="w-full bg-[#080d1a] border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-blue-500 tracking-[0.4em] text-center"
                />
              </div>
            )}

            {isResettingPassword && (
              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-500" size={19} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#080d1a] border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && !isVerifying && !isForgotPassword && !isResettingPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20"
            >
              {loading
                ? "Please wait..."
                : isVerifying
                  ? "Verify Email"
                  : isForgotPassword
                    ? "Send Reset OTP"
                    : isResettingPassword
                      ? "Reset Password"
                      : isLogin
                        ? "Sign In"
                        : "Create Account"}

              {!loading && <ArrowRight size={19} />}
            </button>

            {(isVerifying || isForgotPassword || isResettingPassword) && (
              <button
                type="button"
                onClick={goBackToLogin}
                className="w-full text-sm text-gray-400 hover:text-white"
              >
                Back to Login
              </button>
            )}
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            Secure AI-powered recruitment platform
          </p>
        </section>
      </motion.div>
    </main>
  );
}

export default App;