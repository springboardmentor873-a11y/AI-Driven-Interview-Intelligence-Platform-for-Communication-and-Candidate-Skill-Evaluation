import { countShares } from "../../utils/analytics";

/** Horizontal bars for plain counts, scaled to the largest one. `rows` are `{label, value, dot}`. */
export default function CountBars({ rows, empty = "Nothing yet." }) {
  const shown = countShares(rows);
  if (!shown.some((row) => row.value > 0)) return <p className="text-sm text-white/50">{empty}</p>;
  return (
    <ul className="space-y-3">
      {shown.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-white/70">
              {row.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />}
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 font-bold tabular-nums">{row.value}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-700" style={{ width: `${row.percent}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
