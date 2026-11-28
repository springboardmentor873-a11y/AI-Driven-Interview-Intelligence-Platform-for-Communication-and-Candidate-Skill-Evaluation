import { useState } from "react";
import { Link } from "react-router-dom";
import { FilterPills, Notice } from "../analytics/common";
import Button from "../ui/Button";
import { useApi } from "../../hooks/useApi";
import { RATING_STYLES, STATUSES, TYPE_LABELS, formatDuration, formatScore, pageRange, scoreTone, shortDate } from "../../utils/analytics";

const PAGE = 25;
const REFRESH_MS = 15000;

export default function SessionsTab({ initialStatus = "", attempt, onRetry }) {
  const [filters, setFilters] = useState({ status: initialStatus, offset: 0 });
  const { loading, failed, data } = useApi("/api/analytics/recruiter/sessions/", { ...filters, limit: PAGE }, { attempt, refreshMs: REFRESH_MS });
  const counts = data?.counts;
  const options = [
    { value: "", label: `All${counts ? ` (${counts.all})` : ""}` },
    ...Object.entries(STATUSES).map(([value, s]) => ({ value, label: `${s.label}${counts ? ` (${counts[value]})` : ""}` })),
  ];

  return (
    <div className="space-y-5">
      <FilterPills options={options} value={filters.status} onChange={(status) => setFilters({ status, offset: 0 })} label="Status" />
      <p className="text-xs text-white/40">
        This list refreshes by itself every {REFRESH_MS / 1000} seconds{data ? `. Updated ${new Date(data.generated_at).toLocaleTimeString()}` : ""}.
      </p>

      {loading && <div className="h-72 animate-pulse rounded-3xl bg-white/5" aria-busy="true" aria-label="Loading sessions" />}
      {failed && (
        <Notice icon="clock" title="Could not load sessions" note="Check your connection and try again.">
          <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button>
        </Notice>
      )}
      {data && !data.results.length && <Notice icon="clock" title="No sessions here" note={filters.status ? "No interviews have this status." : "Sessions appear when candidates start an interview from your templates."} />}
      {data?.results.length > 0 && (
        <ul className="space-y-3">
          {data.results.map((s) => {
            const status = STATUSES[s.status];
            const active = s.status === "in_progress" || s.status === "scheduled";
            return (
              <li key={s.id} className="rounded-3xl border border-white/10 bg-surface/80 p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <Link to={`/recruiter/candidates/${s.candidate.id}`} className="font-semibold hover:text-brand-400">{s.candidate.name}</Link>
                    <p className="mt-0.5 truncate text-sm text-white/60">
                      {s.template?.title || "Template removed"} · {[TYPE_LABELS[s.interview_type], s.difficulty].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.stalled && <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">Possibly abandoned</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>{status.label}</span>
                  </div>
                </div>

                {s.status === "in_progress" && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>{s.answered} of {s.questions} questions answered</span>
                      <span>{s.progress}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.progress}>
                      <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${s.progress}%` }} />
                    </div>
                  </div>
                )}

                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40">
                  <span>{active ? "Created" : "Finished"} {shortDate(s.ended_at || s.created_at)}</span>
                  {s.duration_seconds !== null && <span>Took {formatDuration(s.duration_seconds)}</span>}
                  {s.overall !== null && (
                    <span className={`font-semibold ${scoreTone(s.overall).text}`}>
                      Score {formatScore(s.overall)}{s.rating && RATING_STYLES[s.rating] ? ` · ${RATING_STYLES[s.rating].label}` : ""}
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {data?.results.length > 0 && (
        <div className="flex items-center justify-between text-sm text-white/50">
          <span>{pageRange(data.offset, data.results.length, data.count)} sessions</span>
          <span className="flex gap-2">
            <Button variant="ghost" className="!px-4 !py-1.5 text-sm" disabled={data.offset === 0} onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, f.offset - PAGE) }))}>Previous</Button>
            <Button variant="ghost" className="!px-4 !py-1.5 text-sm" disabled={data.offset + data.results.length >= data.count} onClick={() => setFilters((f) => ({ ...f, offset: f.offset + PAGE }))}>Next</Button>
          </span>
        </div>
      )}
    </div>
  );
}
