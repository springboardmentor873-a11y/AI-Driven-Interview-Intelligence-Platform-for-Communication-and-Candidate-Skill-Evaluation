import { X, Loader2 } from "lucide-react";

export function PageHeading({ eyebrow, title, description, action, badge }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7 pb-6 border-b border-slate-200">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, helper, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "text-slate-600 bg-slate-100",
    green: "text-emerald-700 bg-emerald-50",
    blue: "text-blue-700 bg-blue-50",
    purple: "text-indigo-700 bg-indigo-50",
    amber: "text-amber-700 bg-amber-50",
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              tones[tone] || tones.slate
            }`}
          >
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        {helper && (
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            {helper}
          </p>
        )}
      </div>
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Badge({ children, variant = "slate", icon: Icon }) {
  const variants = {
    slate: "badge-slate",
    green: "badge-green",
    blue: "badge-blue",
    purple: "badge-purple",
    amber: "badge-amber",
    red: "badge-red",
  };

  return (
    <span className={`badge ${variants[variant] || variants.slate}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

// Backward-compatible Tag alias
export const Tag = ({ children, tone = "slate" }) => (
  <Badge variant={tone === "purple" ? "purple" : tone}>{children}</Badge>
);

export function ProgressBar({ value = 0, max = 100, label, helper }) {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div>
      {(label || helper) && (
        <div className="flex items-center justify-between text-xs mb-1.5">
          {label && <span className="font-semibold text-slate-700">{label}</span>}
          {helper && <span className="text-slate-500">{helper}</span>}
        </div>
      )}
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Backward-compatible Progress alias
export const Progress = ({ value = 0 }) => <ProgressBar value={value} />;

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={22} />
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, description, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-modal border border-slate-200 w-full max-w-md p-6 z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="icon-btn -mr-2 -mt-2 text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function GoogleButton({ onClick, loading, label = "Continue with Google" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="btn-google"
    >
      {loading ? (
        <Loader2 className="animate-spin text-slate-500" size={16} />
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
