import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import api, { API_URL, errorMessage } from "../api";
import AuthLayout, { inputCls, btnCls } from "./AuthLayout";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [params] = useSearchParams();
  const [error, setError] = useState(params.get("error") || "");
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);

  useEffect(() => {
    api.get("/api/auth/providers").then((r) => setGoogle(r.data.google)).catch(() => {});
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await login(form.email, form.password); nav("/dashboard"); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Log in" subtitle="Welcome back.">
      <form onSubmit={submit} className="space-y-4">
        <input className={inputCls} type="email" placeholder="Email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={inputCls} type="password" placeholder="Password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
      {google && (
        <button type="button" onClick={() => (window.location.href = `${API_URL}/api/auth/google/login`)}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white py-2 font-medium hover:bg-slate-50">
          Continue with Google
        </button>
      )}
      <p className="mt-6 text-sm text-slate-600">
        New here? <Link className="text-accent font-medium" to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
