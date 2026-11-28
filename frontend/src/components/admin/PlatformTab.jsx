import Panel from "../dashboard/Panel";
import CountBars from "../analytics/CountBars";
import RatingBar from "../analytics/RatingBar";
import SkillRadar from "../analytics/SkillRadar";
import WeeklyBars from "../analytics/WeeklyBars";
import { Metric, Notice, Skeleton } from "../analytics/common";
import Button from "../ui/Button";
import { useApi } from "../../hooks/useApi";
import { STATUSES, TYPE_LABELS, formatDuration, formatScore, scoreTone, shortDate, weekLabel } from "../../utils/analytics";

const ROLE_ROWS = [
  { key: "candidate", label: "Candidates", dot: "bg-violet-400" },
  { key: "recruiter", label: "Recruiters", dot: "bg-pink-400" },
  { key: "admin", label: "Admins", dot: "bg-amber-400" },
];

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
      <dt className="text-xs text-white/40">{label}</dt>
    </div>
  );
}

export default function PlatformTab({ onOpenTab, attempt, onRetry }) {
  const { loading, failed, data } = useApi("/api/analytics/admin/", {}, { attempt });

  if (loading) return <Skeleton />;
  if (failed) {
    return (
      <Notice icon="clock" title="Could not load the platform analytics" note="Check your connection and try again.">
        <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button>
      </Notice>
    );
  }

  const { users, interviews, content, ai } = data;
  const radarParts = interviews.parts.map((p) => ({ ...p, recent_average: p.average }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Users" value={users.total} note={`${users.active} active · ${users.inactive} deactivated`} delay={0} />
        <Metric label="Interviews" value={interviews.total} note={`${interviews.scored} scored`} delay={80} />
        <Metric label="Average score" value={formatScore(interviews.average_overall)} tone={scoreTone(interviews.average_overall).text} note={interviews.best_overall === null ? "" : `best ${formatScore(interviews.best_overall)}`} delay={160} />
        <Metric label="Completion rate" value={interviews.completion_rate === null ? "—" : `${interviews.completion_rate}%`} note="of finished interviews, not cancelled" delay={240} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="People" delay={60}>
          <CountBars rows={ROLE_ROWS.map((r) => ({ label: r.label, value: users.by_role[r.key], dot: r.dot }))} />
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="joined in 7 days" value={users.new_last_7_days} />
            <Stat label="joined in 30 days" value={users.new_last_30_days} />
            <Stat label="recruiters active (30 days)" value={users.active_recruiters_30_days} />
            <Stat label="candidates active (7 days)" value={users.active_candidates_7_days} />
            <Stat label="candidates active (30 days)" value={users.active_candidates_30_days} />
          </dl>
          <p className="mt-3 text-xs text-white/40">Active means they started an interview (candidates) or had one taken on their templates (recruiters).</p>
        </Panel>

        <Panel title="Sign-ups per week" delay={100}>
          <WeeklyBars
            periods={users.signups_weekly.map((w) => ({ label: weekLabel(w.week_start).replace("Week of ", ""), values: [w.signups] }))}
            series={[{ name: "Sign-ups", color: "#38bdf8" }]}
            unit=" of sign-ups"
          />
        </Panel>

        <Panel title="Interviews per week" className="lg:col-span-2" delay={140}>
          <WeeklyBars
            periods={interviews.weekly.map((w) => ({ label: weekLabel(w.week_start).replace("Week of ", ""), values: [w.started, w.completed] }))}
            series={[{ name: "Started", color: "#a78bfa" }, { name: "Finished and scored", color: "#34d399" }]}
            unit=" of interviews"
          />
        </Panel>

        <Panel title="Interviews by status" delay={180}>
          <CountBars rows={Object.entries(STATUSES).map(([key, s]) => ({ label: s.label, value: interviews.status_counts[key] }))} empty="No interviews yet." />
          <p className="mt-4 text-xs text-white/40">
            Average length {formatDuration(interviews.average_duration_seconds)} · typical (median) {formatDuration(interviews.median_duration_seconds)}
          </p>
        </Panel>

        <Panel title="Interviews by type" delay={200}>
          <CountBars rows={Object.entries(TYPE_LABELS).map(([key, label]) => ({ label, value: interviews.type_counts[key] || 0 }))} empty="No interviews yet." />
        </Panel>

        <Panel title="Skills across the platform" delay={220}>
          <SkillRadar parts={radarParts} />
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {interviews.parts.map((p) => (
              <li key={p.key} className="flex justify-between gap-3">
                <span className="text-white/60">{p.label}</span>
                <span className={`font-semibold tabular-nums ${scoreTone(p.average).text}`}>{formatScore(p.average)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title="Content" delay={240}>
            <dl className="grid grid-cols-2 gap-3">
              <Stat label="templates" value={content.templates} />
              <Stat label="published" value={content.published_templates} />
              <Stat label="resumes" value={content.resumes} />
              <Stat label="parsed by AI" value={content.resume_sources.ai} />
            </dl>
            {content.resume_sources.basic > 0 && (
              <p className="mt-3 text-xs text-white/40">{content.resume_sources.basic} {content.resume_sources.basic === 1 ? "resume was" : "resumes were"} read by the built-in rules instead of the AI.</p>
            )}
          </Panel>

          <Panel title="AI service" linkLabel="AI settings and usage" onLinkClick={() => onOpenTab("ai")} delay={260}>
            <p className="flex items-center gap-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${ai.enabled ? "bg-emerald-400" : "bg-red-400"}`} />
              {ai.enabled ? "On" : "Switched off by an admin"}
            </p>
            <p className="mt-2 text-sm text-white/60">
              {ai.calls ? `${ai.calls} ${ai.calls === 1 ? "call" : "calls"} in the last 24 hours, ${ai.success_rate}% succeeded${ai.average_latency_ms === null ? "" : `, ${ai.average_latency_ms} ms on average`}.` : "No AI calls in the last 24 hours."}
            </p>
          </Panel>
        </div>

        <RatingBar counts={interviews.rating_counts} title="How interviews were rated" className="lg:col-span-2" delay={280} />

        <Panel title="Busiest recruiters" delay={300}>
          {data.top_recruiters.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-xs text-white/40">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Recruiter</th>
                    <th className="py-2 pr-3 font-semibold">Templates</th>
                    <th className="py-2 pr-3 font-semibold">Candidates</th>
                    <th className="py-2 pr-3 font-semibold">Interviews</th>
                    <th className="py-2 font-semibold">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_recruiters.map((r) => (
                    <tr key={r.recruiter.id} className="border-t border-white/5">
                      <td className="py-3 pr-3"><span className="font-semibold">{r.recruiter.name}</span><span className="block text-xs text-white/40">{r.recruiter.email}</span></td>
                      <td className="py-3 pr-3 tabular-nums">{r.templates}</td>
                      <td className="py-3 pr-3 tabular-nums">{r.candidates}</td>
                      <td className="py-3 pr-3 tabular-nums">{r.interviews}</td>
                      <td className={`py-3 font-bold tabular-nums ${scoreTone(r.average_overall).text}`}>{formatScore(r.average_overall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-white/50">No recruiter has had an interview taken on their templates yet.</p>
          )}
        </Panel>

        <Panel title="Most used templates" delay={320}>
          {data.top_templates.length ? (
            <ol className="space-y-2">
              {data.top_templates.map((t, index) => (
                <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <span className="w-5 text-sm font-bold text-white/40">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.title}</span>
                    <span className="block text-xs text-white/40">{TYPE_LABELS[t.interview_type]} · by {t.owner} · {t.sessions} {t.sessions === 1 ? "interview" : "interviews"}</span>
                  </span>
                  <span className={`text-lg font-bold tabular-nums ${scoreTone(t.average_overall).text}`}>{formatScore(t.average_overall)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/50">No template has been used yet.</p>
          )}
          <p className="mt-3 text-xs text-white/40">Last updated {shortDate(data.generated_at)}.</p>
        </Panel>
      </div>
    </div>
  );
}
