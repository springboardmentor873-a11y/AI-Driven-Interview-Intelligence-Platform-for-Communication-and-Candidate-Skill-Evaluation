import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { parseError } from "../utils/errors";

const ROLES = {
  candidate: {
    label: "Candidate",
    subtitle: "Practice AI mock interviews, track your progress and walk into the real one ready.",
    bullets: ["Realistic AI interview simulations", "Instant scoring and feedback", "Track your improvement over time"],
  },
  recruiter: {
    label: "Recruiter",
    subtitle: "Create interviews, review candidate results and hire with confidence.",
    bullets: ["Build interview templates", "Review candidate reports", "Compare candidates objectively"],
  },
  admin: {
    label: "Admin",
    subtitle: "Manage users and keep the platform running smoothly.",
    bullets: ["Manage users and roles", "Monitor platform activity", "Keep accounts secure"],
  },
};

export default function Login() {
  const { user, loading, login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The chosen role lives in the URL (?role=recruiter) so a refresh or a shared link keeps it
  const requested = params.get("role");
  const role = ROLES[requested] ? requested : "candidate";
  const config = ROLES[role];

  // The Google button keeps the callback it was given, so read the role from a ref
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const chooseRole = (next) => {
    setError("");
    setParams(next === "candidate" ? {} : { role: next }, { replace: true });
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password, role);
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
      await googleLogin(response.credential, roleRef.current);
      navigate("/dashboard");
    } catch (err) {
      setError(parseError(err).general || "Google sign-in failed.");
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to SmartHire AI"
      subtitle={config.subtitle}
      bullets={config.bullets}
    >
      <div role="group" aria-label="Sign in as" className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
        {Object.entries(ROLES).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            aria-pressed={role === key}
            onClick={() => chooseRole(key)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              role === key ? "bg-white text-brand-600 shadow" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" name="email" placeholder="maya@email.com" value={form.email} onChange={onChange} required />
        <Input label="Password" type="password" name="password" placeholder="Your password" value={form.password} onChange={onChange} required />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" variant="solid" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : `Sign in as ${config.label} →`}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> OR <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin onSuccess={onGoogle} onError={() => setError("Google sign-in was cancelled.")} />
      </div>

      {role !== "admin" && (
        <p className="mt-6 text-center text-sm text-gray-500">
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand-600">
            Create an account
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
