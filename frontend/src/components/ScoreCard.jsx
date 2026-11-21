const RATING_STYLES = {
  excellent: "bg-green-500/15 text-green-300",
  good: "bg-green-500/10 text-green-300",
  average: "bg-amber-500/15 text-amber-300",
  needs_improvement: "bg-orange-500/15 text-orange-300",
  poor: "bg-red-500/15 text-red-300",
};

const PARTS = [
  { key: "communication", label: "Communication", hint: "Clarity, grammar, filler words, pace and completeness" },
  { key: "confidence", label: "Confidence", hint: "Eye contact, facial engagement, hesitation, speaking confidence and attention" },
  { key: "technical_relevance", label: "Technical relevance", hint: "Accuracy, relevant keywords, problem solving and domain knowledge" },
  { key: "professionalism", label: "Professionalism", hint: "Time management, organization, professional communication and etiquette" },
];

const bar = (score) => (score >= 75 ? "bg-green-400" : score >= 50 ? "bg-amber-400" : "bg-red-400");

/** The overall score, rating and the four parts. A part that could not be measured is shown as such. */
export default function ScoreCard({ score }) {
  if (!score) return null;
  const { counts } = score;
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5" aria-label="Interview score">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-white/40">Overall score</p>
          <p className="text-4xl font-extrabold">
            {score.overall != null ? Math.round(score.overall) : "-"}
            <span className="text-lg font-semibold text-white/40"> / 100</span>
          </p>
        </div>
        {score.rating && (
          <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${RATING_STYLES[score.rating] || "bg-white/10"}`}>{score.rating_label}</span>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {PARTS.map(({ key, label, hint }) => {
          const value = score[key];
          return (
            <div key={key} title={hint}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">
                  {label} <span className="text-white/30">({Math.round(score.weights[key] * 100)}%)</span>
                </span>
                <span className="font-semibold">{value != null ? Math.round(value) : "Not measured"}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                {value != null && <div className={`h-full rounded-full ${bar(value)}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />}
              </div>
            </div>
          );
        })}
      </div>

      {!score.complete && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          This score is partial: {score.missing.map((m) => m.replace("_", " ")).join(" and ")} could not be measured, so the overall score uses the other parts. The AI review may have been unavailable. Try it again below.
        </p>
      )}
      <p className="mt-3 text-xs text-white/40">
        {counts.answered} of {counts.questions_total} questions scored.
        {counts.skipped > 0 && ` ${counts.skipped} skipped or unanswered (counted as 0).`}
        {counts.excluded_no_transcript > 0 && ` ${counts.excluded_no_transcript} left out because no words were captured.`}
      </p>
    </section>
  );
}
