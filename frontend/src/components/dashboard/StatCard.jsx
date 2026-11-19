import Icon from "../ui/Icon";

const TONES = {
  violet: "from-violet-500/30 to-violet-500/5 text-violet-300",
  pink: "from-pink-500/30 to-pink-500/5 text-pink-300",
  amber: "from-amber-500/30 to-amber-500/5 text-amber-300",
  green: "from-emerald-500/30 to-emerald-500/5 text-emerald-300",
};

export default function StatCard({ icon, label, value, tone = "violet", delay = 0, loading }) {
  return (
    <div
      className="animate-fade-up rounded-3xl border border-white/10 bg-surface/80 p-5 shadow-card backdrop-blur"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${TONES[tone]}`}>
        <Icon name={icon} />
      </span>
      {loading ? (
        <div className="mt-4 h-8 w-12 animate-pulse rounded-lg bg-white/10" />
      ) : (
        <p className="mt-4 text-3xl font-extrabold tabular-nums">{value}</p>
      )}
      <p className="mt-1 text-sm text-white/50">{label}</p>
    </div>
  );
}
