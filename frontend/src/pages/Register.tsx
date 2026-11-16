
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  BrainCircuit,
} from "lucide-react";
import { registerUser } from "../api/auth";

function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      await registerUser(
        fullName.trim(),
        email.trim(),
        password,
        role
      );

      setSuccess("Account created successfully! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err: any) {
      const message = err.response?.data?.detail;

      setError(
        typeof message === "string"
          ? message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">

      {/* LEFT SECTION */}
      <div className="hidden md:flex w-1/2 bg-[#172554] text-white flex-col justify-center px-16 relative overflow-hidden">

        <div className="absolute w-80 h-80 bg-teal-500/10 rounded-full -top-20 -right-20" />
        <div className="absolute w-96 h-96 bg-teal-500/10 rounded-full -bottom-32 -left-20" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-[#0F766E] p-3 rounded-xl">
              <BrainCircuit size={30} />
            </div>
            <h1 className="text-3xl font-bold">SmartHire AI</h1>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-6">
            Start Your Journey
            <br />
            With SmartHire AI
          </h2>

          <p className="text-blue-100 text-lg leading-relaxed max-w-lg">
            Create your account and take the next step towards
            smarter recruitment and career growth.
          </p>

          <div className="mt-10 space-y-4 text-blue-100">
            <p>✓ AI-powered interview preparation</p>
            <p>✓ Smart candidate assessment</p>
            <p>✓ Personalized career growth</p>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-10">

        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex md:hidden bg-[#0F766E] text-white p-3 rounded-xl mb-4">
              <BrainCircuit size={28} />
            </div>

            <h2 className="text-3xl font-bold text-[#172554]">
              Create Account
            </h2>

            <p className="text-gray-500 mt-2">
              Join SmartHire AI today
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">

            {/* FULL NAME */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>

              <div className="relative">
                <User className="absolute left-3 top-3.5 text-gray-400" size={19} />

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full border border-gray-300 rounded-lg py-3 pl-11 pr-4 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={19} />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full border border-gray-300 rounded-lg py-3 pl-11 pr-4 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            {/* ROLE */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Register As
              </label>

              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "candidate" | "recruiter")
                }
                className="w-full border border-gray-300 rounded-lg py-3 px-4 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100 bg-white"
              >
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
              </select>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={19} />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="w-full border border-gray-300 rounded-lg py-3 pl-11 pr-12 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={19} />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full border border-gray-300 rounded-lg py-3 pl-11 pr-12 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-3.5 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
                {success}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

          </form>

          <p className="text-center text-gray-600 mt-7">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#0F766E] font-semibold hover:underline"
            >
              Login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Register;
