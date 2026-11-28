import Panel from "../dashboard/Panel";
import { RATING_STYLES, ratingShares } from "../../utils/analytics";

/** One bar showing how many interviews got each rating, from Excellent to Poor. */
export default function RatingBar({ counts, title = "How the interviews were rated", className = "", delay = 200 }) {
  const shares = ratingShares(counts);
  return (
    <Panel title={title} className={className} delay={delay}>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label={shares.map((s) => `${RATING_STYLES[s.key].label}: ${s.count}`).join(", ")}>
        {shares.filter((s) => s.count).map((s) => <div key={s.key} className={RATING_STYLES[s.key].bar} style={{ width: `${s.percent}%` }} />)}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
        {shares.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${RATING_STYLES[s.key].bar}`} />
            <span className="text-white/60">{RATING_STYLES[s.key].label}</span>
            <span className="ml-auto font-semibold tabular-nums">{s.count}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
