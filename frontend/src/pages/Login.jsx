import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { parseError } from "../utils/errors";

export default function Login() {
  const { user, loading, login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(parseError(err).general || "Login failed. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async (response) => {
    setError("");
    try {
      await googleLogin(response.credential);
      navigate("/dashboard");
    } catch (err) {
      setError(parseError(err).general || "Google sign-in failed.");
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to SmartHire AI"
      subtitle="Practice AI mock interviews, track your progress and walk into the real one ready."
      bullets={["Realistic AI interview simulations", "Instant scoring and feedback", "Track your improvement over time"]}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" name="email" placeholder="maya@email.com" value={form.email} onChange={onChange} required />
        <Input label="Password" type="password" name="password" placeholder="Your password" value={form.password} onChange={onChange} required />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" variant="solid" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in →"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> OR <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin onSuccess={onGoogle} onError={() => setError("Google sign-in was cancelled.")} />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        New here?{" "}
        <Link to="/register" className="font-semibold text-brand-600">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}