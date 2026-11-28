import { useState } from "react";
import { Link } from "react-router-dom";
import { FilterPills, Notice } from "../analytics/common";
import Button from "../ui/Button";
import { useApi } from "../../hooks/useApi";
import { COMPARE_MAX, COMPARE_MIN, DIRECTIONS, RATING_STYLES, TYPE_LABELS, formatScore, pageRange, scoreTone, shortDate } from "../../utils/analytics";

const PAGE = 25;
const TYPES = [{ value: "", label: "All types" }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))];
const SORTS = [
  { value: "average", label: "Best average" },
  { value: "latest", label: "Most recent interview" },
  { value: "interviews", label: "Most interviews" },
  { value: "name", label: "Name (A to Z)" },
];
const inputClass = "rounded-full border border-white/10 bg-ink px-4 py-2 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export default function CandidatesTab({ selected, onToggle, onClear, onCompare, attempt, onRetry }) {
  const [filters, setFilters] = useState({ type: "", q: "", sort: "average", offset: 0 });
  const [draft, setDraft] = useState("");
  const update = (patch) => setFilters((current) => ({ ...current, offset: 0, ...patch }));
  const { loading, failed, data } = useApi("/api/analytics/recruiter/candidates/", { ...filters, limit: PAGE }, { attempt });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: draft.trim() });
          }}
        >
          <input className={`${inputClass} w-56`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search name or email" aria-label="Search candidates" maxLength={100} />
          <Button type="submit" variant="solid" className="!px-5 !py-2 text-sm">Search</Button>
        </form>
        <label className="flex items-center gap-2 text-sm text-white/60">
          Sort by
          <select className={inputClass} value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <FilterPills options={TYPES} value={filters.type} onChange={(type) => update({ type })} label="Interview type" />
      {filters.q && (
        <p className="text-sm text-white/60">
          Showing results for “{filters.q}”.{" "}
          <button type="button" className="font-semibold text-brand-400" onClick={() => { setDraft(""); update({ q: "" }); }}>Clear search</button>
        </p>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm">
          <span className="font-semibold">{selected.length} selected</span>
          <span className="text-white/50">pick {COMPARE_MIN} to {COMPARE_MAX} to compare</span>
          <span className="ml-auto flex gap-2">
            <Button variant="solid" className="!px-4 !py-1.5 text-sm" disabled={selected.length < COMPARE_MIN} onClick={onCompare}>Compare</Button>
            <button type="button" className="rounded-full px-3 py-1.5 text-white/60 hover:text-white" onClick={onClear}>Clear</button>
          </span>
        </div>
      )}

      {loading && <div className="h-72 animate-pulse rounded-3xl bg-white/5" aria-busy="true" aria-label="Loading candidates" />}
      {failed && (
        <Notice icon="clock" title="Could not load candidates" note="Check your connection and try again.">
          <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button>
        </Notice>
      )}
      {data && !data.results.length && (
        <Notice icon="users" title="No candidates found" note={filters.q || filters.type ? "Try a different search or interview type." : "Candidates appear after they start an interview from one of your templates."} />
      )}
      {data?.results.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-surface/80 p-2 shadow-card sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs text-white/40">
                <tr>
                  <th className="w-10 py-2 pl-2 font-semibold"><span className="sr-only">Compare</span></th>
                  <th className="py-2 pr-3 font-semibold">Candidate</th>
                  <th className="py-2 pr-3 font-semibold">Interviews</th>
                  <th className="py-2 pr-3 font-semibold">Average</th>
                  <th className="py-2 pr-3 font-semibold">Latest</th>
                  <th className="py-2 pr-3 font-semibold">Trend</th>
                  <th className="py-2 pr-2 font-semibold">Last interview</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => {
                  const id = row.candidate.id;
                  const checked = selected.includes(id);
                  const direction = DIRECTIONS[row.direction];
                  return (
                    <tr key={id} className="border-t border-white/5">
                      <td className="py-3 pl-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand-500"
                          checked={checked}
                          disabled={!checked && selected.length >= COMPARE_MAX}
                          onChange={() => onToggle(id)}
                          aria-label={`Select ${row.candidate.name} for comparison`}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <Link to={`/recruiter/candidates/${id}`} className="font-semibold hover:text-brand-400">{row.candidate.name}</Link>
                        <span className="block text-xs text-white/40">{row.candidate.email}</span>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {row.interviews}
                        {row.sessions > row.interviews && <span className="block text-xs text-white/40">{row.sessions} started</span>}
                      </td>
                      <td className={`py-3 pr-3 text-lg font-bold tabular-nums ${scoreTone(row.average_overall).text}`}>{formatScore(row.average_overall)}</td>
                      <td className="py-3 pr-3">
                        <span className="tabular-nums">{formatScore(row.latest_overall)}</span>
                        {row.latest_rating && <span className={`block text-xs ${RATING_STYLES[row.latest_rating.value].text}`}>{row.latest_rating.label}</span>}
                      </td>
                      <td className={`py-3 pr-3 text-xs font-semibold ${direction.tone}`}>{direction.arrow} {direction.label}</td>
                      <td className="py-3 pr-2 text-white/60">{row.last_interview_at ? shortDate(row.last_interview_at) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/5 px-2 pt-3 text-sm text-white/50">
            <span>{pageRange(data.offset, data.results.length, data.count)} candidates</span>
            <span className="flex gap-2">
              <Button variant="ghost" className="!px-4 !py-1.5 text-sm" disabled={data.offset === 0} onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, f.offset - PAGE) }))}>Previous</Button>
              <Button variant="ghost" className="!px-4 !py-1.5 text-sm" disabled={data.offset + data.results.length >= data.count} onClick={() => setFilters((f) => ({ ...f, offset: f.offset + PAGE }))}>Next</Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
