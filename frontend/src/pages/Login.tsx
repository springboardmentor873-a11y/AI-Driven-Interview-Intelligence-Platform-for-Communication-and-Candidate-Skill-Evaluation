
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  BrainCircuit,
  GraduationCap,
  BriefcaseBusiness,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import { loginUser, getCurrentUser } from "../api/auth";

type UserRole = "candidate" | "recruiter" | "admin";

const roles = [
  {
    value: "candidate" as UserRole,
    label: "Candidate",
    description: "Find jobs & practice interviews",
    icon: GraduationCap,
  },
  {
    value: "recruiter" as UserRole,
    label: "Recruiter",
    description: "Manage hiring & candidates",
    icon: BriefcaseBusiness,
  },
  {
    value: "admin" as UserRole,
    label: "Admin",
    description: "Manage the platform",
    icon: ShieldCheck,
  },
];

function Login() {
  const [selectedRole, setSelectedRole] =
    useState<UserRole>("candidate");

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Step 1: Login API
      const loginResponse = await loginUser(email, password);

      const token = loginResponse.access_token;

      if (!token) {
        throw new Error("Login token was not received.");
      }

      // Step 2: Save JWT token
      localStorage.setItem("access_token", token);

      // Step 3: Get logged-in user's profile
      const user = await getCurrentUser(token);

      const actualRole = user.role?.toLowerCase();

      // Step 4: Verify selected role with actual backend role
      if (actualRole !== selectedRole) {
        localStorage.removeItem("access_token");

        setError(
          `This account belongs to ${actualRole || "an unknown role"}. Please select the correct portal.`
        );

        return;
      }

      // Step 5: Role-based dashboard redirection
      switch (actualRole) {
        case "candidate":
          navigate("/candidate/dashboard", { replace: true });
          break;

        case "recruiter":
          navigate("/recruiter/dashboard", { replace: true });
          break;

        case "admin":
          navigate("/admin/dashboard", { replace: true });
          break;

        default:
          localStorage.removeItem("access_token");
          setError("Invalid user role. Please contact support.");
      }
    } catch (err: any) {
      localStorage.removeItem("access_token");

      const message = err.response?.data?.detail;

      setError(
        typeof message === "string"
          ? message
          : err.message || "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F0FDFA]">

      {/* Left Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#172554] text-white flex-col justify-center px-16 relative overflow-hidden">

        <div className="absolute w-80 h-80 bg-teal-500/20 rounded-full blur-3xl -top-20 -right-20" />

        <div className="absolute w-72 h-72 bg-blue-500/20 rounded-full blur-3xl -bottom-20 -left-20" />

        <div className="relative z-10">

          <div className="flex items-center gap-3 mb-12">
            <BrainCircuit size={38} className="text-teal-400" />

            <h1 className="text-3xl font-bold">
              SmartHire <span className="text-teal-400">AI</span>
            </h1>
          </div>

          <h2 className="text-5xl font-bold leading-tight">
            Unlock Your
            <span className="text-teal-400"> Potential.</span>
            <br />
            Ace Your Next Interview.
          </h2>

          <p className="text-gray-300 text-lg mt-6 leading-8 max-w-lg">
            Practice smarter, improve your skills and prepare
            confidently for your dream career with AI-powered
            interview assessments.
          </p>

          <div className="mt-12 flex gap-4">

            <div className="bg-white/10 p-4 rounded-xl">
              <h3 className="text-2xl font-bold text-teal-400">
                AI
              </h3>
              <p className="text-sm text-gray-300">
                Smart Assessment
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-xl">
              <h3 className="text-2xl font-bold text-teal-400">
                24/7
              </h3>
              <p className="text-sm text-gray-300">
                Practice Anytime
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8">

        <div className="bg-white w-full max-w-lg p-6 sm:p-9 rounded-2xl shadow-xl">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-7">
            <BrainCircuit size={30} className="text-teal-700" />

            <h1 className="text-2xl font-bold text-[#172554]">
              SmartHire <span className="text-teal-700">AI</span>
            </h1>
          </div>

          <div className="text-center mb-7">

            <h2 className="text-3xl font-bold text-[#172554]">
              Welcome Back!
            </h2>

            <p className="text-gray-500 mt-2">
              Choose your portal and sign in to continue.
            </p>

          </div>

          {/* Role Selection */}
          <div className="mb-7">

            <label className="block text-xs font-bold tracking-wider text-gray-500 mb-3">
              SELECT YOUR LOGIN PORTAL
            </label>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">

              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;

                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.value);
                      setError("");
                    }}
                    disabled={loading}
                    aria-pressed={isSelected}
                    className={`relative flex flex-col items-center text-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-teal-600 bg-teal-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50"
                    }`}
                  >

                    {isSelected && (
                      <CheckCircle2
                        size={17}
                        className="absolute top-2 right-2 text-teal-700"
                      />
                    )}

                    <Icon
                      size={27}
                      className={`mb-2 ${
                        isSelected
                          ? "text-teal-700"
                          : "text-gray-500"
                      }`}
                    />

                    <span
                      className={`text-sm font-bold ${
                        isSelected
                          ? "text-teal-800"
                          : "text-gray-700"
                      }`}
                    >
                      {role.label}
                    </span>

                    <span className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-4">
                      {role.description}
                    </span>

                  </button>
                );
              })}

            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleLogin}>

            {/* Email */}
            <div>

              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Email Address
              </label>

              <div className="flex items-center border border-gray-200 rounded-lg px-3 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100 transition">

                <Mail size={19} className="text-gray-400" />

                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full p-3 outline-none bg-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />

              </div>
            </div>

            {/* Password */}
            <div>

              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Password
              </label>

              <div className="flex items-center border border-gray-200 rounded-lg px-3 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100 transition">

                <Lock size={19} className="text-gray-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full p-3 outline-none bg-transparent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-teal-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>

              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">

              <Link
                to="/forgot-password"
                className="text-sm text-teal-700 font-semibold hover:underline"
              >
                Forgot Password?
              </Link>

            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg"
              >
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition shadow-md"
            >
              {loading
                ? "Signing In..."
                : `Sign In as ${roles.find((r) => r.value === selectedRole)?.label}`}
            </button>

          </form>

          {/* Register Link */}
          <p className="text-center text-gray-500 mt-7 text-sm">
            Don't have an account?{" "}

            <Link
              to="/register"
              className="text-teal-700 font-bold hover:underline"
            >
              Create Account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;
