
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { forgotPassword } from "../api/auth";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await forgotPassword(email);
      setMessage(response.message);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Unable to process your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#CCFBF1]">
          <ShieldCheck size={30} className="text-[#0F766E]" />
        </div>

        <h1 className="text-3xl font-bold text-[#172554]">
          Forgot Password?
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Enter your registered email address. We will send you a
          password reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#172554]">
              Email Address
            </label>

            <div className="flex items-center rounded-lg border border-gray-300 px-3 focus-within:border-[#0F766E]">
              <Mail size={18} className="text-gray-400" />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                className="w-full border-none bg-transparent px-3 py-3 text-sm outline-none"
              />
            </div>
          </div>

          {message && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F766E] py-3 font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;
