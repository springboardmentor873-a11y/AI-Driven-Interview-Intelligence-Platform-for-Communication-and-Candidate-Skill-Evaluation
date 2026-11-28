import Panel from "../dashboard/Panel";
import SkillRadar from "./SkillRadar";
import { DIRECTIONS, formatScore, scoreTone } from "../../utils/analytics";

/** The radar and the four scoring areas. `parts` is the `parts` list of an analytics response. */
export default function SkillsPanel({ parts, note = "Scores are the average of the latest 5 interviews.", className = "", delay = 120 }) {
  return (
    <Panel title="Skills" className={className} delay={delay}>
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
      <p className="mt-4 text-xs text-white/40">{note}</p>
    </Panel>
  );
}
