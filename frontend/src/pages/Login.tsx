
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  BrainCircuit,
} from "lucide-react";

import { loginUser, getCurrentUser } from "../api/auth";

function Login() {
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

      // Step 4: Check user role and redirect
      switch (user.role) {
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
          : "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F0FDFA]">

      {/* Left Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#172554] text-white flex-col justify-center px-16 relative overflow-hidden">

        <div className="absolute w-80 h-80 bg-teal-500/20 rounded-full blur-3xl -top-20 -right-20"></div>

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
              <h3 className="text-2xl font-bold text-teal-400">AI</h3>
              <p className="text-sm text-gray-300">Smart Assessment</p>
            </div>

            <div className="bg-white/10 p-4 rounded-xl">
              <h3 className="text-2xl font-bold text-teal-400">24/7</h3>
              <p className="text-sm text-gray-300">Practice Anytime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">

        <div className="bg-white w-full max-w-md p-8 md:p-10 rounded-2xl shadow-xl">

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <BrainCircuit size={30} className="text-teal-700" />
            <h1 className="text-2xl font-bold text-[#172554]">
              SmartHire <span className="text-teal-700">AI</span>
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-[#172554]">
            Welcome Back!
          </h2>

          <p className="text-gray-500 mt-2 mb-8">
            Sign in to continue your journey.
          </p>

          <form className="space-y-5" onSubmit={handleLogin}>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Email Address
              </label>

              <div className="flex items-center border border-gray-200 rounded-lg px-3 focus-within:border-teal-600">
                <Mail size={19} className="text-gray-400" />

                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full p-3 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Password
              </label>

              <div className="flex items-center border border-gray-200 rounded-lg px-3 focus-within:border-teal-600">
                <Lock size={19} className="text-gray-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full p-3 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-teal-700"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-teal-700 font-semibold hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition shadow-md"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

          </form>

          <p className="text-center text-gray-500 mt-7 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-teal-700 font-bold hover:underline">
              Create Account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;
