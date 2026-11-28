import Icon from "../ui/Icon";
import { DIRECTIONS, formatChange } from "../../utils/analytics";

/** A number card. */
export function Metric({ label, value, note, tone = "text-white", delay = 0 }) {
  return (
    <div className="animate-fade-up rounded-3xl border border-white/10 bg-surface/80 p-5 shadow-card backdrop-blur" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-sm text-white/50">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 min-h-[1.25rem] text-xs text-white/40">{note}</p>
    </div>
  );
}

/** The "Progress" card: change since the first interview. `overall` is the overall stats of an analytics response. */
export function ProgressMetric({ overall, delay = 240 }) {
  const direction = DIRECTIONS[overall.direction];
  const tone = overall.change > 0 ? "text-emerald-300" : overall.change < 0 ? "text-red-300" : "text-white";
  return (
    <Metric
      label="Progress"
      value={formatChange(overall.change)}
      tone={tone}
      note={overall.change === null ? "Needs 2 scored interviews" : `since the first interview · ${direction.label.toLowerCase()}`}
      delay={delay}
    />
  );
}

/** Grey blocks shown while a page loads. */
export function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/5" />)}
      </div>
      <div className="h-96 animate-pulse rounded-3xl bg-white/5" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
        <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
      </div>
    </div>
  );
}

/** An empty or error message with an optional button. */
export function Notice({ icon, title, note, children }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/40">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/50">{note}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/** A row of round buttons where exactly one is on. `options` are `{value, label}`. */
export function FilterPills({ options, value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${value === option.value ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
