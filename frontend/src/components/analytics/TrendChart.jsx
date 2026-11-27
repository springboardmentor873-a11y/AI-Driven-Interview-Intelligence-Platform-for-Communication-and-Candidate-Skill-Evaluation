import { useState } from "react";
import {
  SERIES, TYPE_LABELS, WATCH_BELOW, WEAK_BELOW, formatScore, linePath, nearestIndex, scaleY, seriesPoints, shortDate,
} from "../../utils/analytics";

const W = 720;
const H = 300;
const BOX = { left: 48, right: W - 20, top: 16, bottom: H - 36 };
const GRID = [0, 25, 50, 75, 100];

/**
 * Line chart of the scores over time (oldest on the left). Hover or tap to pick an interview, or focus the chart
 * and use the arrow keys. A table with the same numbers is under it for screen readers.
 */
export default function TrendChart({ trend, shown }) {
  const [picked, setPicked] = useState(null);
  const active = Math.min(picked ?? trend.length - 1, trend.length - 1);
  const row = trend[active];
  const lines = SERIES.filter((s) => shown.includes(s.key));

  const pick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    setPicked(nearestIndex(x, trend.length, BOX.left, BOX.right));
  };
  const onKeyDown = (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    setPicked(Math.max(0, Math.min(trend.length - 1, active + step)));
  };

  const activeX = BOX.left + (trend.length <= 1 ? (BOX.right - BOX.left) / 2 : (active / (trend.length - 1)) * (BOX.right - BOX.left));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none rounded-2xl bg-white/[0.02] outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        role="group"
        tabIndex={0}
        aria-label={`Score trend over ${trend.length} interviews. Use the left and right arrow keys to move between interviews.`}
        onMouseMove={pick}
        onClick={pick}
        onKeyDown={onKeyDown}
      >
        {GRID.map((value) => {
          const y = scaleY(value, BOX.top, BOX.bottom);
          return (
            <g key={value}>
              <line x1={BOX.left} x2={BOX.right} y1={y} y2={y} stroke="white" strokeOpacity={0.08} />
              <text x={BOX.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="white" fillOpacity={0.45}>{value}</text>
            </g>
          );
        })}
        {[WEAK_BELOW, WATCH_BELOW].map((value) => {
          const y = scaleY(value, BOX.top, BOX.bottom);
          return <line key={value} x1={BOX.left} x2={BOX.right} y1={y} y2={y} stroke="#fbbf24" strokeOpacity={0.35} strokeDasharray="4 5" />;
        })}

        <line x1={activeX} x2={activeX} y1={BOX.top} y2={BOX.bottom} stroke="white" strokeOpacity={0.25} />

        {lines.map((line) => {
          const points = seriesPoints(trend, line.key, BOX);
          const thick = line.key === "overall";
          return (
            <g key={line.key}>
              <path d={linePath(points)} fill="none" stroke={line.color} strokeWidth={thick ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={thick ? 1 : 0.85} />
              {points.map((p, i) => p && (
                <circle key={i} cx={p.x} cy={p.y} r={i === active ? 5 : trend.length > 25 ? 1.5 : 3} fill={line.color} stroke="#14141c" strokeWidth={i === active ? 2 : 0} />
              ))}
            </g>
          );
        })}

        {[0, Math.floor((trend.length - 1) / 2), trend.length - 1]
          .filter((index, i, all) => all.indexOf(index) === i)
          .map((index) => {
            const x = BOX.left + (trend.length <= 1 ? (BOX.right - BOX.left) / 2 : (index / (trend.length - 1)) * (BOX.right - BOX.left));
            return (
              <text key={index} x={x} y={H - 12} textAnchor="middle" fontSize="11" fill="white" fillOpacity={0.45}>
                {shortDate(trend[index].date)}
              </text>
            );
          })}
      </svg>

      <p className="mt-2 text-xs text-white/40">Dashed lines mark 60 (Average) and 75 (Good).</p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-live="polite">
        <p className="text-sm font-semibold">
          {row.title || `${TYPE_LABELS[row.interview_type]} interview`}
          <span className="ml-2 font-normal text-white/50">
            {[TYPE_LABELS[row.interview_type], row.difficulty, row.domain].filter(Boolean).join(" · ")} · {shortDate(row.date)}
          </span>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SERIES.map((s) => (
            <div key={s.key}>
              <dt className="flex items-center gap-1.5 text-xs text-white/50">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums">{formatScore(row[s.key])}</dd>
            </div>
          ))}
        </dl>
      </div>

      <details className="mt-3 text-sm text-white/60">
        <summary className="cursor-pointer font-semibold text-brand-400">View the numbers as a table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead className="text-white/40">
              <tr>
                <th className="py-1 pr-3 font-semibold">Date</th>
                <th className="py-1 pr-3 font-semibold">Type</th>
                {SERIES.map((s) => <th key={s.key} className="py-1 pr-3 font-semibold">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...trend].reverse().map((r) => (
                <tr key={r.session_id} className="border-t border-white/5">
                  <td className="py-1.5 pr-3">{shortDate(r.date)}</td>
                  <td className="py-1.5 pr-3">{TYPE_LABELS[r.interview_type]}</td>
                  {SERIES.map((s) => <td key={s.key} className="py-1.5 pr-3 tabular-nums">{formatScore(r[s.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
