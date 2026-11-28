import { useState } from "react";
import Panel from "../dashboard/Panel";
import CountBars from "../analytics/CountBars";
import WeeklyBars from "../analytics/WeeklyBars";
import { Notice } from "../analytics/common";
import Button from "../ui/Button";
import client from "../../api/client";
import { useApi } from "../../hooks/useApi";
import { AI_PURPOSES, ERROR_KINDS, connectionMessage, fieldErrors, parseOptionalInt, shortDate, timeAgo } from "../../utils/analytics";

const inputClass = "w-full rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";
const NUMBER_FIELDS = ["timeout_seconds", "review_rate_per_hour"];

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-red-300" role="alert">{error}</p> : <p className="mt-1.5 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function SettingsForm({ initial }) {
  // `data` is what the server last said. A save replaces it with the answer to the save, so the form is never reloaded
  // (reloading would wipe the "Saved" message and any connection test result).
  const [data, setData] = useState(initial);
  const [form, setForm] = useState({
    enabled: initial.enabled,
    model: initial.model.override,
    fallback_model: initial.fallback_model.override,
    timeout_seconds: initial.timeout_seconds.override ?? "",
    review_rate_per_hour: initial.review_rate_per_hour.override ?? "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ saving: false, saved: false, problem: "" });
  const [test, setTest] = useState(null);
  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    const body = { enabled: form.enabled, model: form.model.trim(), fallback_model: form.fallback_model.trim() };
    const local = {};
    for (const field of NUMBER_FIELDS) {
      const value = parseOptionalInt(form[field]);
      if (value === undefined) local[field] = "Use a whole number, or leave it blank for the server default.";
      else body[field] = value;
    }
    setErrors(local);
    if (Object.keys(local).length) return;
    setStatus({ saving: true, saved: false, problem: "" });
    try {
      const { data: saved } = await client.patch("/api/admin/settings/ai/", body);
      setData(saved);
      setForm({ enabled: saved.enabled, model: saved.model.override, fallback_model: saved.fallback_model.override, timeout_seconds: saved.timeout_seconds.override ?? "", review_rate_per_hour: saved.review_rate_per_hour.override ?? "" });
      setStatus({ saving: false, saved: true, problem: "" });
    } catch (error) {
      const fields = fieldErrors(error.response?.data);
      setErrors(fields);
      setStatus({ saving: false, saved: false, problem: Object.keys(fields).length ? "Some values need fixing." : "Could not save. Check your connection and try again." });
    }
  };

  const runTest = async () => {
    setTest({ running: true });
    try {
      const { data: result } = await client.post("/api/admin/settings/ai/test/");
      setTest({ result });
    } catch (error) {
      setTest({ problem: error.response?.status === 429 ? "That is enough tests for now. Try again in an hour." : "Could not run the test. Try again." });
    }
  };

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
        <div>
          <p className="font-semibold" id="ai-switch-label">AI features</p>
          <p className="mt-1 text-xs text-white/50">When off, feedback, question generation, answer review and resume parsing use their built-in rule-based versions.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enabled}
          aria-labelledby="ai-switch-label"
          onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.enabled ? "bg-emerald-500" : "bg-white/20"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${form.enabled ? "left-6" : "left-1"}`} />
        </button>
      </div>

      <p className="flex items-center gap-2 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${data.key_configured ? "bg-emerald-400" : "bg-amber-400"}`} />
        API key: {data.key_configured ? "set on the server" : "not set, so the AI cannot be used"}
        <span className="text-xs text-white/40">(kept on the server, never shown or changed here)</span>
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="ai-model" label="Model" hint={`Blank uses the server default (${data.model.default}).`} error={errors.model}>
          <input id="ai-model" className={inputClass} value={form.model} onChange={set("model")} placeholder={data.model.default} maxLength={80} />
        </Field>
        <Field id="ai-fallback" label="Backup model" hint={`Tried on the last attempt when the main one is busy. Blank uses ${data.fallback_model.default || "none"}.`} error={errors.fallback_model}>
          <input id="ai-fallback" className={inputClass} value={form.fallback_model} onChange={set("fallback_model")} placeholder={data.fallback_model.default || "none"} maxLength={80} />
        </Field>
        <Field id="ai-timeout" label="Timeout (seconds)" hint={`5 to 120. Blank uses the server default (${data.timeout_seconds.default}).`} error={errors.timeout_seconds}>
          <input id="ai-timeout" className={inputClass} inputMode="numeric" value={form.timeout_seconds} onChange={set("timeout_seconds")} placeholder={String(data.timeout_seconds.default)} />
        </Field>
        <Field id="ai-rate" label="AI reviews per user per hour" hint={`1 to 1000. Blank uses the server default (${data.review_rate_per_hour.default}).`} error={errors.review_rate_per_hour}>
          <input id="ai-rate" className={inputClass} inputMode="numeric" value={form.review_rate_per_hour} onChange={set("review_rate_per_hour")} placeholder={data.review_rate_per_hour.default.split("/")[0]} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="solid" className="!px-6 !py-2.5 text-sm" disabled={status.saving}>{status.saving ? "Saving…" : "Save settings"}</Button>
        <Button type="button" variant="ghost" className="!px-5 !py-2.5 text-sm" disabled={test?.running} onClick={runTest}>{test?.running ? "Testing…" : "Test connection"}</Button>
        <span aria-live="polite" className="text-sm">
          {status.saved && <span className="text-emerald-300">Saved. It applies to the next AI call.</span>}
          {status.problem && <span className="text-red-300">{status.problem}</span>}
        </span>
      </div>
      {(test?.result || test?.problem) && (
        <p className={`rounded-2xl border px-4 py-3 text-sm ${test.result?.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`} role="status">
          {test.problem || connectionMessage(test.result)}
        </p>
      )}
      <p className="text-xs text-white/40">
        Testing makes one small real AI call with the <strong>saved</strong> settings, so save first. Changes apply to the next AI call on every server.
        {data.updated_at && ` Last changed ${timeAgo(data.updated_at)}${data.updated_by ? ` by ${data.updated_by.email}` : ""}.`}
      </p>
    </form>
  );
}

function Usage({ usage }) {
  const windows = [
    { key: "last_24_hours", label: "Last 24 hours" },
    { key: "last_7_days", label: "Last 7 days" },
    { key: "last_30_days", label: "Last 30 days" },
  ];
  const { coverage } = usage;
  const share = (a, b) => (a + b ? `${Math.round((100 * a) / (a + b))}%` : "—");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Panel title="Calls" className="lg:col-span-2" delay={100}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="text-xs text-white/40">
              <tr>
                <th className="py-2 pr-3 font-semibold">Period</th>
                <th className="py-2 pr-3 font-semibold">Calls</th>
                <th className="py-2 pr-3 font-semibold">Succeeded</th>
                <th className="py-2 pr-3 font-semibold">Failed</th>
                <th className="py-2 pr-3 font-semibold">Average time</th>
                <th className="py-2 font-semibold">Used backup model</th>
              </tr>
            </thead>
            <tbody>
              {windows.map(({ key, label }) => {
                const w = usage.windows[key];
                return (
                  <tr key={key} className="border-t border-white/5">
                    <th scope="row" className="py-3 pr-3 text-left font-medium text-white/70">{label}</th>
                    <td className="py-3 pr-3 tabular-nums">{w.calls}</td>
                    <td className="py-3 pr-3 tabular-nums">{w.success_rate === null ? "—" : `${w.success_rate}%`}</td>
                    <td className={`py-3 pr-3 tabular-nums ${w.failures ? "text-red-300" : ""}`}>{w.failures}</td>
                    <td className="py-3 pr-3 tabular-nums">{w.average_latency_ms === null ? "—" : `${w.average_latency_ms} ms`}</td>
                    <td className="py-3 tabular-nums">{w.used_backup_model}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/40">One call can include retries. The time is for the whole call. Prompts and answers are not stored.</p>
      </Panel>

      <Panel title="Calls per day" className="lg:col-span-2" delay={140}>
        <WeeklyBars
          periods={usage.daily.map((d) => ({ label: shortDate(`${d.date}T12:00:00Z`, undefined, "UTC"), values: [d.calls, d.failures] }))}
          series={[{ name: "Calls", color: "#a78bfa" }, { name: "Failed", color: "#f87171" }]}
          unit=" of AI calls"
        />
      </Panel>

      <Panel title="By feature (7 days)" delay={180}>
        {usage.by_purpose.length ? (
          <ul className="space-y-3">
            {usage.by_purpose.map((p) => (
              <li key={p.name} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{AI_PURPOSES[p.name] || p.name}</span>
                <span className="text-right text-white/60">
                  <span className="font-bold tabular-nums text-white">{p.calls}</span> {p.calls === 1 ? "call" : "calls"}
                  {p.failures > 0 && <span className="text-red-300"> · {p.failures} failed</span>}
                  {p.average_latency_ms !== null && ` · ${p.average_latency_ms} ms`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50">No AI calls in the last 7 days.</p>
        )}
        {usage.by_model.length > 1 && <p className="mt-4 text-xs text-white/40">Models used: {usage.by_model.map((m) => `${m.name} (${m.calls})`).join(", ")}.</p>}
      </Panel>

      <Panel title="Why calls failed (7 days)" delay={200}>
        <CountBars rows={usage.errors.map((e) => ({ label: ERROR_KINDS[e.kind] || e.kind, value: e.count }))} empty="No failed calls in the last 7 days." />
      </Panel>

      <Panel title="Written by the AI or by rules" delay={220}>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-white/60">Interview feedback written by the AI</dt><dd className="font-bold tabular-nums">{share(coverage.feedback.ai, coverage.feedback.basic)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-white/60">Resumes read by the AI</dt><dd className="font-bold tabular-nums">{share(coverage.resumes.ai, coverage.resumes.basic)}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-white/40">The rest used the built-in rules, because the AI was off, not set up or failed.</p>
      </Panel>

      <Panel title="Recent failures" delay={240}>
        {usage.recent_failures.length ? (
          <ul className="space-y-2 text-sm">
            {usage.recent_failures.map((f, index) => (
              <li key={`${f.at}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2.5">
                <span>
                  {AI_PURPOSES[f.purpose] || f.purpose} · <span className="text-red-300">{ERROR_KINDS[f.error_kind] || f.error_kind}</span>
                  <span className="block text-xs text-white/40">{f.model || "no model"} · {f.attempts} {f.attempts === 1 ? "attempt" : "attempts"}</span>
                </span>
                <time dateTime={f.at} className="shrink-0 text-xs text-white/50">{timeAgo(f.at)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50">No failed calls on record.</p>
        )}
      </Panel>
    </div>
  );
}

export default function AITab({ attempt, onRetry }) {
  const settings = useApi("/api/admin/settings/ai/", {}, { attempt });
  const usage = useApi("/api/analytics/admin/ai/", {}, { attempt, refreshMs: 60000 });

  return (
    <div className="space-y-6">
      <Panel title="AI settings" delay={40}>
        {settings.loading && <div className="h-64 animate-pulse rounded-2xl bg-white/5" aria-busy="true" aria-label="Loading AI settings" />}
        {settings.failed && (
          <Notice icon="clock" title="Could not load the AI settings" note="Check your connection and try again.">
            <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button>
          </Notice>
        )}
        {settings.data && <SettingsForm initial={settings.data} />}
      </Panel>

      {usage.loading && <div className="h-72 animate-pulse rounded-3xl bg-white/5" aria-busy="true" aria-label="Loading AI usage" />}
      {usage.failed && <Notice icon="clock" title="Could not load the AI usage" note="Check your connection and try again."><Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button></Notice>}
      {usage.data && <Usage usage={usage.data} />}
    </div>
  );
}
