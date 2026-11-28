import { useState } from "react";
import Panel from "../dashboard/Panel";
import TrendChart from "./TrendChart";
import { SERIES } from "../../utils/analytics";

/** "Score trend": switches for each line, the chart, and a note when only the newest interviews are drawn. */
export default function TrendPanel({ trend, summary, delay = 80 }) {
  const [shown, setShown] = useState(["overall"]);
  const toggle = (key) => setShown((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <Panel title="Score trend" delay={delay}>
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
      {shown.length ? (
        <TrendChart trend={trend} shown={shown} />
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/50">Pick at least one line to show.</p>
      )}
      {summary.scored > summary.in_chart && (
        <p className="mt-3 text-xs text-white/40">Showing the latest {summary.in_chart} of {summary.scored} scored interviews.</p>
      )}
    </Panel>
  );
}
