import { Link } from "react-router-dom";
import Icon from "../ui/Icon";

/** A big clickable shortcut. Without `to` it is shown as "coming soon". */
export default function ActionCard({ icon, title, note, to, delay = 0 }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${
            to ? "bg-btn-brand text-white shadow-glow" : "bg-white/5 text-white/40"
          }`}
        >
          <Icon name={icon} />
        </span>
        {to ? (
          <Icon name="arrow" className="h-5 w-5 text-white/30 transition group-hover:translate-x-1 group-hover:text-brand-400" />
        ) : (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-white/50">{note}</p>
    </>
  );

  const base = "group animate-fade-up rounded-3xl border border-white/10 bg-surface/80 p-6 shadow-card backdrop-blur transition duration-300";
  const style = { animationDelay: `${delay}ms` };

  return to ? (
    <Link to={to} style={style} className={`${base} hover:-translate-y-1 hover:border-brand-500/60 hover:bg-surface`}>
      {body}
    </Link>
  ) : (
    <div style={style} className={`${base} opacity-70`}>
      {body}
    </div>
  );
}
