import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Panel from "../components/dashboard/Panel";
import BarRows from "../components/analytics/BarRows";
import SkillRadar from "../components/analytics/SkillRadar";
import TrendChart from "../components/analytics/TrendChart";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import client from "../api/client";
import {
  DIRECTIONS, RATING_STYLES, RISKS, SERIES, TYPE_LABELS, formatChange, formatScore, ordinal, rankingText, ratingShares, scoreTone, shortDate,
} from "../utils/analytics";

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

function Metric({ label, value, note, tone = "text-white", delay = 0 }) {
  return (
    <div className="animate-fade-up rounded-3xl border border-white/10 bg-surface/80 p-5 shadow-card backdrop-blur" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-sm text-white/50">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 min-h-[1.25rem] text-xs text-white/40">{note}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your analytics">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/5" />)}
      </div>
      <div className="h-96 animate-pulse rounded-3xl bg-white/5" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
        <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
      </div>
    </div>
  );
}

function Notice({ icon, title, note, children }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/40">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/50">{note}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Progress({ overall }) {
  const direction = DIRECTIONS[overall.direction];
  const tone = overall.change > 0 ? "text-emerald-300" : overall.change < 0 ? "text-red-300" : "text-white";
  return (
    <Metric
      label="Progress"
      value={formatChange(overall.change)}
      tone={tone}
      note={overall.change === null ? "Needs 2 scored interviews" : `since your first interview · ${direction.label.toLowerCase()}`}
      delay={240}
    />
  );
}

function Skills({ parts }) {
  return (
    <Panel title="Skills" className="lg:col-span-2" delay={120}>
      <div className="grid items-center gap-6 md:grid-cols-2">
        <SkillRadar parts={parts} />
        <ul className="space-y-4">
          {parts.map((part) => {
            const direction = DIRECTIONS[part.direction];
            return (
              <li key={part.key} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{part.label}</span>
                  <span className={`text-xl font-bold tabular-nums ${scoreTone(part.recent_average).text}`}>{formatScore(part.recent_average)}</span>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {part.weight}% of the overall score · best {formatScore(part.best)} · latest {formatScore(part.latest)}
                </p>
                <p className={`mt-1 text-xs font-semibold ${direction.tone}`}>
                  {direction.arrow} {direction.label}
                  {part.predicted_next !== null && <span className="font-normal text-white/50"> · trend points to about {formatScore(part.predicted_next)} next time</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 text-xs text-white/40">Scores are the average of your latest 5 interviews.</p>
    </Panel>
  );
}

function WeakAreas({ areas, hasTrend }) {
  return (
    <Panel title="Where to focus" delay={160}>
      {areas.length ? (
        <ul className="space-y-3">
          {areas.map((area) => (
            <li key={`${area.kind}-${area.key}`} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{area.label}</span>
                {area.kind === "topic" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">Topic</span>}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISKS[area.risk].style}`}>{RISKS[area.risk].label}</span>
              </div>
              <p className="mt-2 text-sm text-white/60">{area.reason}</p>
              <p className="mt-2 flex gap-2 text-sm text-white/80">
                <Icon name="sparkle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                {area.tip}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60">
          {hasTrend ? "Nothing needs work right now. Keep practising to keep it that way." : "Finish a few interviews and your weak areas will show up here."}
        </p>
      )}
      <p className="mt-4 text-xs text-white/40">
        Predictions follow the straight-line trend of your latest interviews and start after 3 of them. They are estimates, not promises.
      </p>
    </Panel>
  );
}

function Ratings({ counts, className }) {
  const shares = ratingShares(counts);
  return (
    <Panel title="How your interviews were rated" className={className} delay={200}>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label={shares.map((s) => `${RATING_STYLES[s.key].label}: ${s.count}`).join(", ")}>
        {shares.filter((s) => s.count).map((s) => <div key={s.key} className={RATING_STYLES[s.key].bar} style={{ width: `${s.percent}%` }} />)}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
        {shares.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${RATING_STYLES[s.key].bar}`} />
            <span className="text-white/60">{RATING_STYLES[s.key].label}</span>
            <span className="ml-auto font-semibold tabular-nums">{s.count}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
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
  const [shown, setShown] = useState(["overall"]);
  const { overall, parts, trend } = data;
  const rating = overall.rating ? RATING_STYLES[overall.rating.value] : null;
  const toggle = (key) => setShown((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Average score" value={formatScore(overall.average)} tone={scoreTone(overall.average).text} note={`${data.summary.scored} scored ${data.summary.scored === 1 ? "interview" : "interviews"}`} delay={0} />
        <Metric label="Latest score" value={formatScore(overall.latest)} tone={rating?.text} note={rating ? rating.label : ""} delay={80} />
        <Metric label="Best score" value={formatScore(overall.best)} note={overall.predicted_next !== null ? `trend points to about ${formatScore(overall.predicted_next)} next` : ""} delay={160} />
        <Progress overall={overall} />
      </div>

      <Panel title="Score trend" delay={80}>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Lines to show">
          {SERIES.map((s) => {
            const on = shown.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.key)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-white/50 hover:text-white"}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, opacity: on ? 1 : 0.4 }} />
                {s.label}
              </button>
            );
          })}
        </div>
        {shown.length ? <TrendChart trend={trend} shown={shown} /> : <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/50">Pick at least one line to show.</p>}
        {data.summary.scored > data.summary.in_chart && (
          <p className="mt-3 text-xs text-white/40">Showing your latest {data.summary.in_chart} of {data.summary.scored} scored interviews.</p>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Skills parts={parts} />
        <WeakAreas areas={data.weak_areas} hasTrend={overall.samples >= 3} />
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

        <Ratings counts={overall.rating_counts} className="lg:col-span-2" />
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
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Interview type">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={type === f.value}
                onClick={() => setType(f.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${type === f.value ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
              >
                {f.label}
              </button>
            ))}
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
