import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { useAuth } from "../context/AuthContext";
import { parseError } from "../utils/errors";

export default function Register() {
  const { user, loading, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "candidate",
    password: "",
  });
  const [errors, setErrors] = useState({ fields: {}, general: "" });
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({ fields: {}, general: "" });
    setSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setErrors(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async (response) => {
    try {
      await googleLogin(response.credential);
      navigate("/dashboard");
    } catch (err) {
      setErrors({ fields: {}, general: parseError(err).general || "Google sign-in failed." });
    }
  };

  const f = errors.fields;

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your SmartHire AI account"
      subtitle="Set up in under a minute and run your first mock interview today."
      bullets={["Run your first mock in minutes", "Resume-based interview questions", "No credit card, no commitment"]}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" name="first_name" placeholder="Maya" value={form.first_name} onChange={onChange} error={f.first_name} required />
          <Input label="Last name" name="last_name" placeholder="Chen" value={form.last_name} onChange={onChange} error={f.last_name} />
        </div>
        <Input label="Email" type="email" name="email" placeholder="maya@email.com" value={form.email} onChange={onChange} error={f.email} required />
        <Select label="I am a" name="role" value={form.role} onChange={onChange} error={f.role}>
          <option value="candidate">Candidate</option>
          <option value="recruiter">Recruiter</option>
        </Select>
        <Input label="Password" type="password" name="password" placeholder="At least 8 characters" value={form.password} onChange={onChange} error={f.password} required />
        {errors.general && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.general}</p>}
        <Button type="submit" variant="solid" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Get Started →"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> OR <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin onSuccess={onGoogle} onError={() => setErrors({ fields: {}, general: "Google sign-in was cancelled." })} text="signup_with" />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}