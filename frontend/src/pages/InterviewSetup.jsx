import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import client from "../api/client";
import { parseError } from "../utils/errors";

const TYPES = { hr: "HR", technical: "Technical", behavioral: "Behavioral", aptitude: "Aptitude" };
const LEVELS = { easy: "Easy", medium: "Medium", hard: "Hard" };
const STATUS = {
  scheduled: { label: "Not started", style: "bg-white/10 text-white/70" },
  in_progress: { label: "In progress", style: "bg-amber-500/15 text-amber-300" },
  completed: { label: "Completed", style: "bg-green-500/15 text-green-300" },
  cancelled: { label: "Cancelled", style: "bg-red-500/10 text-red-300" },
};

const fieldClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function Field({ label, error, children }) {
  return (
    <label className="block text-sm font-medium text-white/80">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [resume, setResume] = useState(undefined); // undefined = loading, null = none
  const [sessions, setSessions] = useState(null);
  const [templateId, setTemplateId] = useState(""); // "" = custom interview
  const [form, setForm] = useState({ interview_type: "technical", difficulty: "medium", domain: "", question_count: 5 });
  const [errors, setErrors] = useState({ fields: {}, general: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    client.get("/api/interviews/templates/").then((r) => setTemplates(r.data)).catch(() => {});
    client.get("/api/resumes/").then((r) => setResume(r.data.find((x) => x.is_primary) || null)).catch(() => setResume(null));
    client.get("/api/interviews/sessions/").then((r) => setSessions(r.data)).catch(() => setSessions([]));
  }, []);

  const template = templates.find((t) => String(t.id) === templateId);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    setErrors({ fields: {}, general: "" });
    const body = template
      ? { template_id: template.id }
      : { ...form, question_count: Number(form.question_count) };
    try {
      const { data } = await client.post("/api/interviews/sessions/", body);
      navigate(`/interview/${data.id}`);
    } catch (err) {
      setErrors(parseError(err));
      setCreating(false);
    }
  };

  const cancel = async (session) => {
    if (!window.confirm("Cancel this interview?")) return;
    try {
      const { data } = await client.post(`/api/interviews/sessions/${session.id}/cancel/`);
      setSessions((list) => list.map((s) => (s.id === session.id ? { ...s, ...data } : s)));
    } catch (err) {
      setErrors({ fields: {}, general: parseError(err).general || "Could not cancel this interview." });
    }
  };

  const f = errors.fields;
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-extrabold">Start a mock interview</h1>
        <p className="mt-2 text-white/60">
          Pick a recruiter's template or set up your own. You will check your camera and microphone before the first question.
        </p>

        <form onSubmit={create} className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-surface p-6">
          <Field label="Interview" error={f.template_id}>
            <select className={fieldClass} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Custom interview</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.recruiter_name})
                </option>
              ))}
            </select>
          </Field>

          {template ? (
            <div className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
              {template.description && <p className="mb-1">{template.description}</p>}
              {[TYPES[template.interview_type], LEVELS[template.difficulty], template.domain].filter(Boolean).join(" · ")}
              {" · "}
              {template.question_count} questions · {template.duration_minutes} min
              <p className="mt-2 text-xs text-white/50">
                {template.recruiter_name} can see your scores, skills and progress for interviews you take on this template.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Interview type" error={f.interview_type}>
                <select className={fieldClass} value={form.interview_type} onChange={set("interview_type")}>
                  {Object.entries(TYPES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty" error={f.difficulty}>
                <select className={fieldClass} value={form.difficulty} onChange={set("difficulty")}>
                  {Object.entries(LEVELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Domain (optional)" error={f.domain}>
                <input className={fieldClass} value={form.domain} onChange={set("domain")} placeholder="e.g. healthcare" maxLength={100} />
              </Field>
              <Field label="Number of questions (1-20)" error={f.question_count}>
                <input className={fieldClass} type="number" min={1} max={20} value={form.question_count} onChange={set("question_count")} required />
              </Field>
            </div>
          )}

          <p className="text-sm text-white/50">
            {resume === undefined
              ? "Checking your resume..."
              : resume
                ? `Questions will use your primary resume: ${resume.original_name}.`
                : null}
            {resume === null && (
              <>
                You have no resume yet, so you will get general questions.{" "}
                <Link to="/resumes" className="font-semibold text-brand-400">Upload one</Link> for questions about your own skills.
              </>
            )}
          </p>

          {errors.general && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{errors.general}</p>}
          <Button type="submit" variant="solid" disabled={creating}>
            {creating ? "Preparing your questions..." : "Create interview"}
          </Button>
        </form>

        <h2 className="mt-12 text-xl font-bold">Your interviews</h2>
        <div className="mt-4 space-y-3">
          {sessions === null && <p className="text-white/50">Loading...</p>}
          {sessions?.length === 0 && <p className="text-white/50">Nothing yet. Your interviews will appear here.</p>}
          {sessions?.map((s) => {
            const status = STATUS[s.status];
            const open = s.status === "scheduled" || s.status === "in_progress";
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {s.template_title || `${TYPES[s.interview_type]} interview`}
                    <span className={`ml-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>{status.label}</span>
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {[TYPES[s.interview_type], LEVELS[s.difficulty], s.domain].filter(Boolean).join(" · ")} · answered{" "}
                    {s.answered_count} of {s.question_total} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/interview/${s.id}`}>
                    <Button variant="solid" className="!px-4 !py-2 text-sm">
                      {open ? (s.status === "in_progress" ? "Continue" : "Begin") : "View"}
                    </Button>
                  </Link>
                  {open && (
                    <Button variant="ghost" className="!px-4 !py-2 text-sm" onClick={() => cancel(s)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
