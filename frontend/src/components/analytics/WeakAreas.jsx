import Panel from "../dashboard/Panel";
import Icon from "../ui/Icon";
import { RISKS } from "../../utils/analytics";

/** Weak skills and topics. A tip is only shown when the server sent one (candidates get tips, recruiters do not). */
export default function WeakAreas({
  areas,
  title = "Where to focus",
  empty = "Nothing needs work right now. Keep practising to keep it that way.",
  note = "Predictions follow the straight-line trend of the latest interviews and start after 3 of them. They are estimates, not promises.",
  className = "",
  delay = 160,
}) {
  return (
    <Panel title={title} className={className} delay={delay}>
      {areas.length ? (
        <ul className="space-y-3">
          {areas.map((area) => (
            <li key={`${area.kind}-${area.key}`} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{area.label}</span>
                {area.kind === "topic" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">Topic</span>}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISKS[area.risk].style}`}>{RISKS[area.risk].label}</span>
              </div>
              <p className="mt-2 text-sm text-white/60">{area.reason}</p>
              {area.tip && (
                <p className="mt-2 flex gap-2 text-sm text-white/80">
                  <Icon name="sparkle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  {area.tip}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60">{empty}</p>
      )}
      <p className="mt-4 text-xs text-white/40">{note}</p>
    </Panel>
  );
}
