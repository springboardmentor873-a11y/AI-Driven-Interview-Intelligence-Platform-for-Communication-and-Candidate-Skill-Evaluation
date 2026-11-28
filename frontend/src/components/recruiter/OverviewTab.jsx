import { Link } from "react-router-dom";
import Panel from "../dashboard/Panel";
import BarRows from "../analytics/BarRows";
import RatingBar from "../analytics/RatingBar";
import SkillRadar from "../analytics/SkillRadar";
import { Metric, Notice, Skeleton } from "../analytics/common";
import Button from "../ui/Button";
import { useApi } from "../../hooks/useApi";
import { DIRECTIONS, STATUSES, TYPE_LABELS, formatScore, scoreTone, shortDate, weekLabel } from "../../utils/analytics";

export default function OverviewTab({ onOpenTab, attempt, onRetry }) {
  const { loading, failed, data } = useApi("/api/analytics/recruiter/", {}, { attempt });

  if (loading) return <Skeleton />;
  if (failed) {
    return (
      <Notice icon="clock" title="Could not load the overview" note="Check your connection and try again.">
        <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button>
      </Notice>
    );
  }
  if (!data.has_data) {
    return (
      <Notice icon="template" title="No interviews on your templates yet" note="When a candidate starts an interview from one of your published templates, their results show up here.">
        <Link to="/templates"><Button variant="solid" className="!px-5 !py-2 text-sm">Manage templates</Button></Link>
      </Notice>
    );
  }

  const { summary, status_counts: counts } = data;
  const weeks = data.weekly.filter((w) => w.interviews > 0);
  const radarParts = data.parts.map((p) => ({ ...p, recent_average: p.average }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Candidates" value={summary.candidates} note={`on ${summary.templates} ${summary.templates === 1 ? "template" : "templates"}`} delay={0} />
        <Metric label="Interviews scored" value={summary.scored} note={`${summary.sessions_total} started in total`} delay={80} />
        <Metric label="Average score" value={formatScore(summary.average_overall)} tone={scoreTone(summary.average_overall).text} note={summary.best_overall === null ? "" : `best ${formatScore(summary.best_overall)}`} delay={160} />
        <Metric label="Completion rate" value={summary.completion_rate === null ? "—" : `${summary.completion_rate}%`} note="of finished interviews, not cancelled" delay={240} />
      </div>

      <Panel title="Right now" linkLabel="Monitor sessions" onLinkClick={() => onOpenTab("sessions")} delay={60}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(STATUSES).map(([key, status]) => (
            <button key={key} type="button" onClick={() => onOpenTab("sessions", key)} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left transition hover:border-brand-500/40">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>{status.label}</span>
              <span className="mt-2 block text-2xl font-bold tabular-nums">{counts[key]}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/40">
          {data.activity.completed_last_7_days} finished in the last 7 days · {data.activity.completed_last_30_days} in the last 30 days
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Skills of your candidates" delay={100}>
          <SkillRadar parts={radarParts} />
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {data.parts.map((p) => (
              <li key={p.key} className="flex justify-between gap-3">
                <span className="text-white/60">{p.label}</span>
                <span className={`font-semibold tabular-nums ${scoreTone(p.average).text}`}>{formatScore(p.average)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/40">Average of every scored interview on your templates.</p>
        </Panel>

        <Panel title="Average score by week" delay={140}>
          <BarRows
            empty="No interviews finished in the last 12 weeks."
            rows={weeks.slice(-8).reverse().map((w) => ({ label: weekLabel(w.week_start), value: w.average_overall, note: `${w.interviews} ${w.interviews === 1 ? "interview" : "interviews"}` }))}
          />
          <p className="mt-4 text-xs text-white/40">Newest week first. Weeks with no interviews are left out.</p>
        </Panel>

        <Panel title="Top candidates" linkLabel="All candidates" onLinkClick={() => onOpenTab("candidates")} delay={180}>
          {data.top_candidates.length ? (
            <ol className="space-y-2">
              {data.top_candidates.map((row, index) => (
                <li key={row.candidate.id}>
                  <Link to={`/recruiter/candidates/${row.candidate.id}`} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:border-brand-500/40">
                    <span className="w-5 text-sm font-bold text-white/40">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{row.candidate.name}</span>
                      <span className="block text-xs text-white/40">{row.interviews} {row.interviews === 1 ? "interview" : "interviews"} · <span className={DIRECTIONS[row.direction].tone}>{DIRECTIONS[row.direction].arrow} {DIRECTIONS[row.direction].label}</span></span>
                    </span>
                    <span className={`text-xl font-bold tabular-nums ${scoreTone(row.average_overall).text}`}>{formatScore(row.average_overall)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/50">Candidates appear here after their first scored interview.</p>
          )}
        </Panel>

        <RatingBar counts={data.rating_counts} title="How interviews were rated" delay={220} />

        <Panel title="Results by template" className="lg:col-span-2" delay={260}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs text-white/40">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Template</th>
                  <th className="py-2 pr-3 font-semibold">Candidates</th>
                  <th className="py-2 pr-3 font-semibold">Interviews</th>
                  <th className="py-2 pr-3 font-semibold">Completed</th>
                  <th className="py-2 font-semibold">Average</th>
                </tr>
              </thead>
              <tbody>
                {data.templates.map((t) => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="py-3 pr-3">
                      <span className="font-semibold">{t.title}</span>
                      {!t.is_published && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">Draft</span>}
                      <span className="block text-xs text-white/40">{[TYPE_LABELS[t.interview_type], t.difficulty, t.domain].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{t.candidates}</td>
                    <td className="py-3 pr-3 tabular-nums">{t.sessions}</td>
                    <td className="py-3 pr-3 tabular-nums">{t.completion_rate === null ? "—" : `${t.completion_rate}%`}</td>
                    <td className={`py-3 font-bold tabular-nums ${scoreTone(t.average_overall).text}`}>{formatScore(t.average_overall)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-white/40">Completed is the share of finished interviews that were not cancelled. Last updated {shortDate(data.generated_at)}.</p>
        </Panel>
      </div>
    </div>
  );
}
