import { formatScore, scoreTone } from "../../utils/analytics";

/** Horizontal bars out of 100. `rows` are `{label, value, note}`. Colour follows the 60 and 75 lines. */
export default function BarRows({ rows, empty }) {
  if (!rows.length) return <p className="text-sm text-white/50">{empty}</p>;
  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const tone = scoreTone(row.value);
        return (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{row.label}</span>
              <span className={`shrink-0 font-bold tabular-nums ${tone.text}`}>{formatScore(row.value)}</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
              role="meter"
              aria-label={row.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={row.value ?? 0}
            >
              <div className={`h-full rounded-full ${tone.bar} transition-all duration-700`} style={{ width: `${row.value ?? 0}%` }} />
            </div>
            {row.note && <p className="mt-1 text-xs text-white/40">{row.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}
