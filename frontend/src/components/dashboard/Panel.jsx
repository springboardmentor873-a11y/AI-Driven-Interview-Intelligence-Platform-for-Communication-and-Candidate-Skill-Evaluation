import { Link } from "react-router-dom";

export default function Panel({ title, linkTo, linkLabel, onLinkClick, children, className = "", delay = 0 }) {
  return (
    <section
      className={`min-w-0 animate-fade-up rounded-3xl border border-white/10 bg-surface/80 p-6 shadow-card backdrop-blur ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="text-sm font-semibold text-brand-400 hover:text-brand-500">
            {linkLabel} →
          </Link>
        )}
        {onLinkClick && (
          <button type="button" onClick={onLinkClick} className="text-sm font-semibold text-brand-400 hover:text-brand-500">
            {linkLabel} →
          </button>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
