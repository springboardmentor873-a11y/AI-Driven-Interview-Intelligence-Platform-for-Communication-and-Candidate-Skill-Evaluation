import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { errorMessage } from "../api";
import AuthLayout, { inputCls, btnCls } from "./AuthLayout";

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "candidate" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await register(form); nav("/dashboard"); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start practicing in a minute.">
      <form onSubmit={submit} className="space-y-4">
        <input className={inputCls} placeholder="Full name" required minLength={2}
          value={form.full_name} onChange={set("full_name")} />
        <input className={inputCls} type="email" placeholder="Email" required
          value={form.email} onChange={set("email")} />
        <input className={inputCls} type="password" placeholder="Password (min 8 characters)"
          required minLength={8} value={form.password} onChange={set("password")} />
        <select className={inputCls} value={form.role} onChange={set("role")}>
          <option value="candidate">I'm a candidate</option>
          <option value="recruiter">I'm a recruiter</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        Already registered? <Link className="text-accent font-medium" to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
