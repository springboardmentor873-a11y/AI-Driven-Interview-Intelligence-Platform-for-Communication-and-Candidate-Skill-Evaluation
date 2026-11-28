import { useState } from "react";
import Panel from "../dashboard/Panel";
import CompareRadar from "../analytics/CompareRadar";
import { FilterPills, Notice } from "../analytics/common";
import Button from "../ui/Button";
import { useApi } from "../../hooks/useApi";
import { COMPARE_COLORS, COMPARE_MIN, DIRECTIONS, TYPE_LABELS, compareParams, formatChange, formatScore, scoreTone } from "../../utils/analytics";

const TYPES = [{ value: "", label: "All types" }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))];
const PARTS = [
  { key: "communication", label: "Communication" },
  { key: "confidence", label: "Confidence" },
  { key: "technical_relevance", label: "Technical relevance" },
  { key: "professionalism", label: "Professionalism" },
];

function Table({ data }) {
  const people = data.candidates;
  const rows = [
    { key: "overall", label: "Average score", value: (c) => c.overall.average, leaders: data.leaders.overall, cohort: data.cohort.overall, bold: true },
    { key: "latest", label: "Latest score", value: (c) => c.overall.latest },
    { key: "best", label: "Best score", value: (c) => c.overall.best },
    { key: "change", label: "Progress since first", text: (c) => formatChange(c.overall.change) },
    { key: "interviews", label: "Scored interviews", text: (c) => String(c.interviews) },
    ...PARTS.map((p) => ({ key: p.key, label: p.label, value: (c) => c.parts[p.key].average, leaders: data.leaders[p.key], cohort: data.cohort[p.key] })),
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead>
          <tr className="text-xs text-white/40">
            <th className="py-2 pr-3 font-semibold"><span className="sr-only">Measure</span></th>
            {people.map((c, i) => (
              <th key={c.candidate.id} className="py-2 pr-3 font-semibold">
                <span className="flex items-center gap-2 text-sm text-white">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COMPARE_COLORS[i] }} />
                  {c.candidate.name}
                </span>
              </th>
            ))}
            <th className="py-2 font-semibold">All your candidates</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-white/5">
              <th scope="row" className="py-3 pr-3 text-left font-medium text-white/60">{row.label}</th>
              {people.map((c) => {
                const value = row.value ? row.value(c) : null;
                const leads = row.leaders?.includes(c.candidate.id);
                return (
                  <td key={c.candidate.id} className={`py-3 pr-3 tabular-nums ${row.bold ? "text-lg font-bold" : ""} ${row.value ? scoreTone(value).text : ""}`}>
                    {row.text ? row.text(c) : formatScore(value)}
                    {leads && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">Highest</span>}
                  </td>
                );
              })}
              <td className="py-3 tabular-nums text-white/50">{row.cohort === undefined ? "" : formatScore(row.cohort)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompareTab({ selected, onToggle, onClear, onPick, attempt, onRetry }) {
  const [type, setType] = useState("");
  const ready = selected.length >= COMPARE_MIN;
  const { loading, failed, status, data } = useApi("/api/analytics/recruiter/compare/", ready ? compareParams(selected, type) : null, { attempt });

  if (!ready) {
    return (
      <Notice icon="users" title="Pick 2 to 4 candidates to compare" note="Tick the boxes next to their names on the Candidates tab, then press Compare.">
        <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onPick}>Choose candidates</Button>
      </Notice>
    );
  }
  if (failed && status === 404) {
    return (
      <Notice icon="users" title="One of these candidates is not on your templates" note="You can only compare candidates who took one of your interviews.">
        <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={() => { onClear(); onPick(); }}>Choose again</Button>
      </Notice>
    );
  }

  return (
    <div className="space-y-5">
      <FilterPills options={TYPES} value={type} onChange={setType} label="Interview type" />
      {loading && <div className="h-96 animate-pulse rounded-3xl bg-white/5" aria-busy="true" aria-label="Loading comparison" />}
      {failed && (
        <Notice icon="clock" title="Could not load the comparison" note="Check your connection and try again.">
          <Button variant="solid" className="!px-5 !py-2 text-sm" onClick={onRetry}>Try again</Button>
        </Notice>
      )}
      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            {data.candidates.map((c, i) => (
              <span key={c.candidate.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3 pr-1.5 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COMPARE_COLORS[i] }} />
                {c.candidate.name}
                <button type="button" aria-label={`Remove ${c.candidate.name} from the comparison`} className="grid h-6 w-6 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white" onClick={() => onToggle(c.candidate.id)}>×</button>
              </span>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-5">
            <Panel title="Skills" className="lg:col-span-2" delay={60}>
              <CompareRadar
                labels={PARTS.map((p) => p.label)}
                series={data.candidates.map((c, i) => ({ id: c.candidate.id, name: c.candidate.name, color: COMPARE_COLORS[i], values: PARTS.map((p) => c.parts[p.key].average) }))}
              />
            </Panel>
            <Panel title="Side by side" className="lg:col-span-3" delay={100}>
              <Table data={data} />
              <p className="mt-3 text-xs text-white/40">Averages over each candidate's scored interviews on your templates. “Highest” needs at least two candidates with a score.</p>
              <ul className="mt-3 space-y-1 text-xs text-white/50">
                {data.candidates.map((c) => (
                  <li key={c.candidate.id}>
                    {c.candidate.name}: <span className={DIRECTIONS[c.overall.direction].tone}>{DIRECTIONS[c.overall.direction].arrow} {DIRECTIONS[c.overall.direction].label}</span>
                    {c.overall.predicted_next !== null && ` · trend points to about ${formatScore(c.overall.predicted_next)} next time`}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
