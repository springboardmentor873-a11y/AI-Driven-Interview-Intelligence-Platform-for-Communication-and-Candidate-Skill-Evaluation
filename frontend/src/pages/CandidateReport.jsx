import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Panel from "../components/dashboard/Panel";
import BarRows from "../components/analytics/BarRows";
import RatingBar from "../components/analytics/RatingBar";
import SkillsPanel from "../components/analytics/SkillsPanel";
import TrendPanel from "../components/analytics/TrendPanel";
import WeakAreas from "../components/analytics/WeakAreas";
import { FilterPills, Metric, Notice, ProgressMetric, Skeleton } from "../components/analytics/common";
import Button from "../components/ui/Button";
import { useApi } from "../hooks/useApi";
import { RATING_STYLES, STATUSES, TYPE_LABELS, formatDuration, formatScore, initials, ordinal, scoreTone, shortDate } from "../utils/analytics";

const FILTERS = [{ value: "", label: "All interviews" }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))];
const BACK = "/recruiter/analytics?tab=candidates";

function Strengths({ items }) {
  return (
    <Panel title="Strengths" delay={140}>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <span className="font-semibold">{item.label}</span>
              <span className="text-xl font-bold tabular-nums text-emerald-300">{formatScore(item.recent_average)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60">No skill is at 75 or above yet.</p>
      )}
      <p className="mt-4 text-xs text-white/40">Skills averaging 75 or more over the latest 5 interviews.</p>
    </Panel>
  );
}

function Standing({ standing, summary }) {
  return (
    <Panel title="Among your candidates" delay={180}>
      {standing.available ? (
        <div>
          <p className="text-4xl font-extrabold">{ordinal(standing.percentile)} <span className="text-lg font-semibold text-white/50">percentile</span></p>
          <p className="mt-2 text-sm text-white/60">Higher than {standing.percentile}% of your other {standing.candidates_compared - 1} scored candidates.</p>
          <p className="mt-2 text-xs text-white/40">This candidate's average {formatScore(standing.candidate_average)} · all your candidates {formatScore(standing.cohort_average)}</p>
        </div>
      ) : (
        <p className="text-sm text-white/60">A place among your candidates appears once at least 3 of them have scored interviews.</p>
      )}
      <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/40">
        {summary.completed} finished · {summary.cancelled} cancelled · {summary.sessions_total} started on your templates
      </p>
    </Panel>
  );
}

function Sessions({ sessions }) {
  return (
    <Panel title="Recent interviews" className="lg:col-span-2" delay={260}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs text-white/40">
            <tr>
              <th className="py-2 pr-3 font-semibold">Template</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Date</th>
              <th className="py-2 pr-3 font-semibold">Took</th>
              <th className="py-2 font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-3 pr-3">
                  <span className="font-semibold">{s.template?.title || "Template removed"}</span>
                  <span className="block text-xs text-white/40">{[TYPE_LABELS[s.interview_type], s.difficulty, s.domain].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="py-3 pr-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUSES[s.status].style}`}>{STATUSES[s.status].label}</span>
                  {s.stalled && <span className="ml-2 text-xs text-amber-300">Possibly abandoned</span>}
                </td>
                <td className="py-3 pr-3 text-white/60">{shortDate(s.ended_at || s.created_at)}</td>
                <td className="py-3 pr-3 text-white/60">{formatDuration(s.duration_seconds)}</td>
                <td className={`py-3 font-bold tabular-nums ${scoreTone(s.overall).text}`}>
                  {formatScore(s.overall)}
                  {s.rating && RATING_STYLES[s.rating] && <span className="ml-2 text-xs font-normal text-white/50">{RATING_STYLES[s.rating].label}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-white/40">Only interviews on your templates are shown.</p>
    </Panel>
  );
}

function Report({ data }) {
  const { overall } = data;
  const rating = overall.rating ? RATING_STYLES[overall.rating.value] : null;
  return (
    <div className="space-y-6">
      {data.has_data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric label="Average score" value={formatScore(overall.average)} tone={scoreTone(overall.average).text} note={`${data.summary.scored} scored ${data.summary.scored === 1 ? "interview" : "interviews"}`} delay={0} />
            <Metric label="Latest score" value={formatScore(overall.latest)} tone={rating?.text} note={rating ? rating.label : ""} delay={80} />
            <Metric label="Best score" value={formatScore(overall.best)} note={overall.predicted_next !== null ? `trend points to about ${formatScore(overall.predicted_next)} next` : ""} delay={160} />
            <ProgressMetric overall={overall} />
          </div>
          <TrendPanel trend={data.trend} summary={data.summary} />
        </>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {data.has_data && (
          <>
            <SkillsPanel parts={data.parts} className="lg:col-span-2" note="Scores are the average of the latest 5 interviews on your templates." />
            <Strengths items={data.strengths} />
            <WeakAreas areas={data.weak_areas} title="Weak areas" empty="No weak areas found in this candidate's interviews." delay={160} />
            <Standing standing={data.standing} summary={data.summary} />
            <Panel title="By template" delay={200}>
              <BarRows
                empty="No scored interviews yet."
                rows={data.by_template.map((t) => ({ label: t.title, value: t.average_overall, note: `${t.interviews} ${t.interviews === 1 ? "interview" : "interviews"} · best ${formatScore(t.best_overall)} · latest ${formatScore(t.latest_overall)}` }))}
              />
            </Panel>
            <Panel title="By interview type" delay={220}>
              <BarRows
                empty="No scored interviews yet."
                rows={data.by_type.map((t) => ({ label: t.label, value: t.average_overall, note: `${t.interviews} ${t.interviews === 1 ? "interview" : "interviews"}` }))}
              />
            </Panel>
            <Panel title="By question topic" delay={240}>
              <BarRows
                empty="Topics appear when the questions have a topic."
                rows={data.by_category.slice(0, 8).map((c) => ({ label: c.name, value: c.average, note: `${c.answers} ${c.answers === 1 ? "answer" : "answers"}${c.skipped ? ` · ${c.skipped} skipped` : ""}` }))}
              />
              <p className="mt-4 text-xs text-white/40">Weakest first. A skipped question counts as 0.</p>
            </Panel>
            <RatingBar counts={overall.rating_counts} title="How the interviews were rated" delay={250} />
          </>
        )}
        <Sessions sessions={data.sessions} />
      </div>
    </div>
  );
}

export default function CandidateReport() {
  const { id } = useParams();
  const [type, setType] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { loading, failed, status, data } = useApi(`/api/analytics/recruiter/candidates/${id}/`, type ? { type } : {}, { attempt });
  const typeName = type ? TYPE_LABELS[type] : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      <Navbar />
      <main className="relative mx-auto max-w-6xl space-y-6 px-6 py-10">
        <Link to={BACK} className="text-sm font-semibold text-brand-400 hover:text-brand-500">← All candidates</Link>

        {failed && status === 404 && (
          <Notice icon="users" title="Candidate not found" note="This candidate has no interviews on your templates.">
            <Link to={BACK}><Button variant="solid" className="!px-5 !py-2 text-sm">Back to candidates</Button></Link>
          </Notice>
        )}
        {failed && status !== 404 && (
          <Notice icon="clock" title="Could not load this report" note="Check your connection and try again.">
            <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
          </Notice>
        )}
        {loading && <Skeleton />}

        {data && (
          <>
            <header className="animate-fade-up">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-btn-brand text-xl font-bold">{initials(data.candidate.name)}</span>
                <div className="min-w-0">
                  <h1 className="truncate text-3xl font-extrabold sm:text-4xl">{data.candidate.name}</h1>
                  <p className="mt-1 text-sm text-white/60">{data.candidate.email} · joined {shortDate(data.candidate.joined)}</p>
                </div>
              </div>
              <div className="mt-5">
                <FilterPills options={FILTERS} value={type} onChange={setType} label="Interview type" />
              </div>
            </header>
            {!data.has_data && (
              <Notice
                icon="chart"
                title={typeName ? `No scored ${typeName} interviews yet` : "No scored interviews yet"}
                note="Scores appear here once this candidate finishes an interview on one of your templates."
              />
            )}
            <Report key={type} data={data} />
          </>
        )}
      </main>
    </div>
  );
}
