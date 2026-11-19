import { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import client from "../api/client";
import { parseError } from "../utils/errors";

const TYPES = { hr: "HR", technical: "Technical", behavioral: "Behavioral", aptitude: "Aptitude" };
const LEVELS = { easy: "Easy", medium: "Medium", hard: "Hard" };
const EMPTY = {
  title: "",
  description: "",
  interview_type: "technical",
  difficulty: "medium",
  domain: "",
  duration_minutes: 30,
  question_count: 10,
  is_published: true,
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

function TemplateForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({ fields: {}, general: "" });
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial.id);

  const set = (name) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({ fields: {}, general: "" });
    const body = {
      title: form.title,
      description: form.description,
      interview_type: form.interview_type,
      difficulty: form.difficulty,
      domain: form.domain,
      duration_minutes: Number(form.duration_minutes),
      question_count: Number(form.question_count),
      is_published: form.is_published,
    };
    try {
      const { data } = editing
        ? await client.put(`/api/interviews/templates/${initial.id}/`, body)
        : await client.post("/api/interviews/templates/", body);
      onSaved(data);
    } catch (err) {
      setErrors(parseError(err));
    } finally {
      setSaving(false);
    }
  };

  const f = errors.fields;
  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-surface p-6">
      <h2 className="text-lg font-bold">{editing ? "Edit template" : "New template"}</h2>
      <Field label="Title" error={f.title}>
        <input className={fieldClass} value={form.title} onChange={set("title")} placeholder="Backend screening round" maxLength={200} required />
      </Field>
      <Field label="Description (optional)" error={f.description}>
        <textarea className={fieldClass} rows={2} value={form.description} onChange={set("description")} maxLength={2000} />
      </Field>
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="Questions (1-20)" error={f.question_count}>
            <input className={fieldClass} type="number" min={1} max={20} value={form.question_count} onChange={set("question_count")} required />
          </Field>
          <Field label="Minutes (5-180)" error={f.duration_minutes}>
            <input className={fieldClass} type="number" min={5} max={180} value={form.duration_minutes} onChange={set("duration_minutes")} required />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm text-white/80">
        <input type="checkbox" checked={form.is_published} onChange={set("is_published")} className="h-4 w-4 accent-brand-500" />
        Published (candidates can see and use it)
      </label>
      {errors.general && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{errors.general}</p>}
      <div className="flex gap-3">
        <Button type="submit" variant="solid" disabled={saving}>
          {saving ? "Saving..." : editing ? "Save changes" : "Create template"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState(null);
  const [editing, setEditing] = useState(null); // null = form closed, EMPTY = new, template = edit
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/api/interviews/templates/")
      .then((res) => setTemplates(res.data))
      .catch(() => {
        setTemplates([]);
        setError("Could not load your templates.");
      });
  }, []);

  const saved = (template) => {
    setTemplates((list) =>
      list.some((t) => t.id === template.id)
        ? list.map((t) => (t.id === template.id ? template : t))
        : [template, ...list],
    );
    setEditing(null);
  };

  const togglePublished = async (t) => {
    setError("");
    try {
      const { data } = await client.patch(`/api/interviews/templates/${t.id}/`, { is_published: !t.is_published });
      setTemplates((list) => list.map((x) => (x.id === t.id ? data : x)));
    } catch (err) {
      setError(parseError(err).general || "Could not update this template.");
    }
  };

  const remove = async (t) => {
    const used = t.session_count ? ` ${t.session_count} interview(s) already used it; they will be kept.` : "";
    if (!window.confirm(`Delete "${t.title}"?${used}`)) return;
    setError("");
    try {
      await client.delete(`/api/interviews/templates/${t.id}/`);
      setTemplates((list) => list.filter((x) => x.id !== t.id));
    } catch {
      setError("Could not delete this template.");
    }
  };

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Interview templates</h1>
            <p className="mt-2 text-white/60">
              Set up an interview once. Candidates pick a published template and get questions built for it.
            </p>
          </div>
          {!editing && (
            <Button variant="solid" onClick={() => setEditing(EMPTY)}>
              New template
            </Button>
          )}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        {editing && (
          <TemplateForm key={editing.id || "new"} initial={editing} onSaved={saved} onCancel={() => setEditing(null)} />
        )}

        <div className="mt-8 space-y-4">
          {templates === null && <p className="text-white/50">Loading...</p>}
          {templates?.length === 0 && !editing && (
            <p className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-white/50">
              No templates yet. Create your first one.
            </p>
          )}
          {templates?.map((t) => (
            <div key={t.id} className="rounded-2xl border border-white/10 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{t.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.is_published ? "bg-green-500/15 text-green-300" : "bg-white/10 text-white/60"
                      }`}
                    >
                      {t.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  {t.description && <p className="mt-1 text-sm text-white/60">{t.description}</p>}
                  <p className="mt-2 text-sm text-white/50">
                    {[TYPES[t.interview_type], LEVELS[t.difficulty], t.domain].filter(Boolean).join(" · ")}
                    {" · "}
                    {t.question_count} questions · {t.duration_minutes} min · used {t.session_count} time
                    {t.session_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="solid" className="!px-4 !py-2 text-sm" onClick={() => setEditing(t)}>Edit</Button>
                  <Button variant="ghost" className="!px-4 !py-2 text-sm" onClick={() => togglePublished(t)}>
                    {t.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button variant="ghost" className="!px-4 !py-2 text-sm !text-red-400" onClick={() => remove(t)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
