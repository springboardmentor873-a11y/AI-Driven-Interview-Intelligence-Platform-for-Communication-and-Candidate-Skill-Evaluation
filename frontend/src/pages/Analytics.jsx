import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Panel from "../components/dashboard/Panel";
import BarRows from "../components/analytics/BarRows";
import RatingBar from "../components/analytics/RatingBar";
import SkillsPanel from "../components/analytics/SkillsPanel";
import TrendPanel from "../components/analytics/TrendPanel";
import WeakAreas from "../components/analytics/WeakAreas";
import { FilterPills, Metric, Notice, ProgressMetric, Skeleton } from "../components/analytics/common";
import Button from "../components/ui/Button";
import client from "../api/client";
import { RATING_STYLES, TYPE_LABELS, formatScore, ordinal, rankingText, scoreTone, shortDate } from "../utils/analytics";

const FILTERS = [{ value: "", label: "All interviews" }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))];

/** Loads the analytics for one interview type. `attempt` changes when the candidate taps "Try again". */
function useAnalytics(type, attempt) {
  const key = `${type}|${attempt}`;
  const [result, setResult] = useState({ key: null });
  useEffect(() => {
    let alive = true;
    client
      .get("/api/analytics/candidate/", { params: type ? { type } : {} })
      .then((res) => {
        if (alive) setResult({ key, data: res.data });
      })
      .catch(() => {
        if (alive) setResult({ key, failed: true });
      });
    return () => {
      alive = false;
    };
  }, [key, type]);
  return result.key === key ? result : { loading: true };
}

function Standing({ ranking, activity }) {
  return (
    <Panel title="How you compare" delay={240}>
      {ranking.available ? (
        <div>
          <p className="text-4xl font-extrabold">{ordinal(ranking.percentile)} <span className="text-lg font-semibold text-white/50">percentile</span></p>
          <p className="mt-2 text-sm text-white/60">{rankingText(ranking)}</p>
          <p className="mt-2 text-xs text-white/40">Your average {formatScore(ranking.your_average)} · everyone's average {formatScore(ranking.cohort_average)}. Nobody is named.</p>
        </div>
      ) : (
        <p className="text-sm text-white/60">{rankingText(ranking)}</p>
      )}
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
        <div>
          <dd className="text-xl font-bold tabular-nums">{activity.completed_last_7_days}</dd>
          <dt className="text-xs text-white/40">last 7 days</dt>
        </div>
        <div>
          <dd className="text-xl font-bold tabular-nums">{activity.completed_last_30_days}</dd>
          <dt className="text-xs text-white/40">last 30 days</dt>
        </div>
        <div>
          <dd className="text-xl font-bold">{activity.last_interview_at ? shortDate(activity.last_interview_at) : "—"}</dd>
          <dt className="text-xs text-white/40">last interview</dt>
        </div>
      </dl>
    </Panel>
  );
}

function Report({ data }) {
  const { overall, parts, trend } = data;
  const rating = overall.rating ? RATING_STYLES[overall.rating.value] : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Average score" value={formatScore(overall.average)} tone={scoreTone(overall.average).text} note={`${data.summary.scored} scored ${data.summary.scored === 1 ? "interview" : "interviews"}`} delay={0} />
        <Metric label="Latest score" value={formatScore(overall.latest)} tone={rating?.text} note={rating ? rating.label : ""} delay={80} />
        <Metric label="Best score" value={formatScore(overall.best)} note={overall.predicted_next !== null ? `trend points to about ${formatScore(overall.predicted_next)} next` : ""} delay={160} />
        <ProgressMetric overall={overall} />
      </div>

      <TrendPanel trend={trend} summary={data.summary} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SkillsPanel parts={parts} className="lg:col-span-2" note="Scores are the average of your latest 5 interviews." />
        <WeakAreas areas={data.weak_areas} empty={overall.samples >= 3 ? "Nothing needs work right now. Keep practising to keep it that way." : "Finish a few interviews and your weak areas will show up here."} />
        <Standing ranking={data.ranking} activity={data.activity} />

        <Panel title="By interview type" delay={160}>
          <BarRows
            empty="No scored interviews yet."
            rows={data.by_type.map((t) => ({ label: t.label, value: t.average_overall, note: `${t.interviews} ${t.interviews === 1 ? "interview" : "interviews"} · best ${formatScore(t.best_overall)} · latest ${formatScore(t.latest_overall)}` }))}
          />
        </Panel>

        <Panel title="By question topic" delay={200}>
          <BarRows
            empty="Topics appear after you answer questions that have a topic."
            rows={data.by_category.slice(0, 8).map((c) => ({ label: c.name, value: c.average, note: `${c.answers} ${c.answers === 1 ? "answer" : "answers"}${c.skipped ? ` · ${c.skipped} skipped` : ""}` }))}
          />
          <p className="mt-4 text-xs text-white/40">Weakest first. A skipped question counts as 0.</p>
        </Panel>

        <RatingBar counts={overall.rating_counts} title="How your interviews were rated" className="lg:col-span-2" />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [type, setType] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { loading, failed, data } = useAnalytics(type, attempt);
  const typeName = type ? TYPE_LABELS[type] : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      <Navbar />
      <main className="relative mx-auto max-w-6xl space-y-6 px-6 py-10">
        <header className="animate-fade-up">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Performance analytics</h1>
          <p className="mt-2 max-w-2xl text-white/60">See how your interview scores change over time, which skills are strong, and what to practise next.</p>
          <div className="mt-5">
            <FilterPills options={FILTERS} value={type} onChange={setType} label="Interview type" />
          </div>
        </header>

        {loading && <Skeleton />}
        {failed && (
          <Notice icon="clock" title="Could not load your analytics" note="Check your connection and try again.">
            <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
          </Notice>
        )}
        {data && !data.has_data && (
          <Notice
            icon="chart"
            title={typeName ? `No scored ${typeName} interviews yet` : "No scored interviews yet"}
            note={data.summary.sessions_total ? "Finish an interview and its scores will appear here. Cancelled or unfinished interviews are not scored." : "Finish a mock interview and your scores, trends and weak areas will appear here."}
          >
            <Link to="/interview"><Button variant="solid" className="!px-5 !py-2 text-sm">Start a mock interview</Button></Link>
          </Notice>
        )}
        {data?.has_data && <Report key={type} data={data} />}
      </main>
    </div>
  );
}
