const W = 720;
const H = 220;
const BOX = { left: 36, right: W - 12, top: 12, bottom: H - 30 };

/**
 * Grouped bars over time (oldest on the left). `periods` are `{label, values: [..]}` with one value per series,
 * `series` are `{name, color}`. A short text summary is the accessible name, and a table sits under the chart.
 */
export default function WeeklyBars({ periods, series, unit = "" }) {
  const largest = Math.max(1, ...periods.flatMap((p) => p.values));
  const top = largest <= 4 ? largest : Math.ceil(largest / 4) * 4; // a round number for the top gridline
  const slot = (BOX.right - BOX.left) / periods.length;
  const bar = Math.min(18, (slot * 0.8) / series.length);
  const y = (value) => BOX.bottom - (value / top) * (BOX.bottom - BOX.top);
  const totals = series.map((s, i) => `${s.name} ${periods.reduce((sum, p) => sum + p.values[i], 0)}`).join(", ");

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-white/60">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-white/[0.02]" role="img" aria-label={`${periods.length} periods${unit}: ${totals}`}>
        {[0, 0.5, 1].map((share) => (
          <g key={share}>
            <line x1={BOX.left} x2={BOX.right} y1={y(top * share)} y2={y(top * share)} stroke="white" strokeOpacity={0.08} />
            <text x={BOX.left - 8} y={y(top * share) + 4} textAnchor="end" fontSize="11" fill="white" fillOpacity={0.45}>{Math.round(top * share)}</text>
          </g>
        ))}
        {periods.map((period, index) => {
          const center = BOX.left + slot * index + slot / 2;
          const start = center - (bar * series.length) / 2;
          return (
            <g key={period.label + index}>
              {period.values.map((value, i) => (
                <rect key={series[i].name} x={start + i * bar} y={y(value)} width={Math.max(bar - 2, 2)} height={BOX.bottom - y(value)} rx={3} fill={series[i].color} fillOpacity={0.9} />
              ))}
              {(index === 0 || index === periods.length - 1 || index === Math.floor(periods.length / 2)) && (
                <text x={center} y={H - 10} textAnchor="middle" fontSize="11" fill="white" fillOpacity={0.45}>{period.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-3 text-sm text-white/60">
        <summary className="cursor-pointer font-semibold text-brand-400">View the numbers as a table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-xs">
            <thead className="text-white/40">
              <tr>
                <th className="py-1 pr-3 font-semibold">Period</th>
                {series.map((s) => <th key={s.name} className="py-1 pr-3 font-semibold">{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...periods].reverse().map((p, index) => (
                <tr key={p.label + index} className="border-t border-white/5">
                  <td className="py-1.5 pr-3">{p.label}</td>
                  {p.values.map((v, i) => <td key={series[i].name} className="py-1.5 pr-3 tabular-nums">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
