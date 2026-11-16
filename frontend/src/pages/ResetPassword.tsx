
import { useState, type FormEvent } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { resetPassword } from "../api/auth";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new password reset link.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(
        token,
        newPassword,
        confirmPassword
      );

      setMessage(response.message);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);

    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0FDFA] px-4 py-10">

      <div className="bg-white w-full max-w-md p-8 md:p-10 rounded-2xl shadow-xl">

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#CCFBF1]">
          <ShieldCheck size={30} className="text-[#0F766E]" />
        </div>

        <h1 className="text-3xl font-bold text-[#172554]">
          Reset Password
        </h1>

        <p className="text-gray-500 mt-3 leading-6 text-sm">
          Create a new password for your SmartHire AI account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              New Password
            </label>

            <div className="flex items-center border border-gray-200 rounded-lg px-3 focus-within:border-teal-600">
              <Lock size={18} className="text-gray-400" />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="w-full p-3 outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-teal-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Confirm New Password
            </label>

            <div className="flex items-center border border-gray-200 rounded-lg px-3 focus-within:border-teal-600">
              <Lock size={18} className="text-gray-400" />

              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="w-full p-3 outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-teal-700"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? "Updating Password..." : "Reset Password"}
          </button>

        </form>

        <Link
          to="/login"
          className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-[#0F766E] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>

      </div>
    </div>
  );
}

export default ResetPassword;

