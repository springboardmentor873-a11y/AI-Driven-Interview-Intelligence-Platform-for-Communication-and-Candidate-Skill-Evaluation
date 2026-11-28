import { useState } from "react";
import { FilterPills, Notice } from "../analytics/common";
import Button from "../ui/Button";
import { useApi } from "../../hooks/useApi";
import { FEED_KINDS, timeAgo } from "../../utils/analytics";

const STEP = 30;
const MAX = 100;
const REFRESH_MS = 30000;
const OPTIONS = [{ value: "", label: "Everything" }, ...Object.entries(FEED_KINDS).map(([value, k]) => ({ value, label: k.label }))];

export default function ActivityTab({ attempt, onRetry }) {
  const [filters, setFilters] = useState({ kind: "", limit: STEP });
  const { loading, failed, data } = useApi("/api/analytics/admin/activity/", filters, { attempt, refreshMs: REFRESH_MS });
  const canShowMore = data && data.results.length >= filters.limit && filters.limit < MAX;

  return (
    <div className="space-y-5">
      <FilterPills options={OPTIONS} value={filters.kind} onChange={(kind) => setFilters({ kind, limit: STEP })} label="Kind of activity" />
      <p className="text-xs text-white/40">The newest first. It refreshes by itself every {REFRESH_MS / 1000} seconds. Admin actions are kept as an audit log.</p>

      {loading && <div className="h-72 animate-pulse rounded-3xl bg-white/5" aria-busy="true" aria-label="Loading activity" />}
      {failed && (
        <Notice icon="clock" title="Could not load the activity" note="Check your connection and try again.">
          <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button>
        </Notice>
      )}
      {data && !data.results.length && <Notice icon="clock" title="Nothing here yet" note="Activity appears as people sign up, take interviews and as admins make changes." />}
      {data?.results.length > 0 && (
        <ul className="divide-y divide-white/5 rounded-3xl border border-white/10 bg-surface/80 px-2 shadow-card sm:px-4">
          {data.results.map((event, index) => (
            <li key={`${event.kind}-${event.event}-${event.at}-${index}`} className="flex items-start gap-3 py-3.5">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${FEED_KINDS[event.kind].dot}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{event.summary}</p>
                <p className="mt-0.5 text-xs text-white/40">{FEED_KINDS[event.kind].label}{event.actor?.email ? ` · ${event.actor.email}` : ""}</p>
              </div>
              <time dateTime={event.at} title={new Date(event.at).toLocaleString()} className="shrink-0 text-xs text-white/50">{timeAgo(event.at)}</time>
            </li>
          ))}
        </ul>
      )}
      {canShowMore && (
        <div className="text-center">
          <Button variant="ghost" className="!px-5 !py-2 text-sm" onClick={() => setFilters((f) => ({ ...f, limit: Math.min(MAX, f.limit + STEP) }))}>Show more</Button>
        </div>
      )}
    </div>
  );
}
