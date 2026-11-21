const mark = (score) => (score >= 75 ? "text-green-300" : score >= 50 ? "text-amber-300" : "text-red-300");

function Tile({ label, value, score, note }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-xl font-bold ${score == null ? "text-white" : mark(score)}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-white/40">{note}</p>}
    </div>
  );
}

/** Speech results across the whole interview. */
export default function SpeechSummary({ summary }) {
  if (!summary) return null;
  if (!summary.answers_analyzed) {
    return summary.answers_without_transcript ? (
      <p className="mt-6 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/60">
        No words were captured in this interview, so there is no speech analysis. Check your microphone and use Chrome or Edge, or type your answers.
      </p>
    ) : null;
  }
  const scores = { ...summary.average_scores, "eye contact": summary.average_attention_score };
  const best = Object.entries(scores).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
  const weakest = best.length > 1 ? best[best.length - 1] : null;
  const fillerNote = summary.top_fillers.map((f) => `${f.word} x${f.count}`).join(", ");
  return (
    <section className="mt-6" aria-label="Delivery summary">
      <h2 className="text-lg font-bold">Delivery summary</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Communication" value={summary.average_communication != null ? `${Math.round(summary.average_communication)} / 100` : "-"} score={summary.average_communication} note={`${summary.answers_analyzed} answer(s) analysed`} />
        <Tile label="Average pace" value={summary.average_wpm ? `${summary.average_wpm} wpm` : "-"} note="Ideal: 120 to 170" />
        <Tile label="Filler words" value={summary.total_fillers} note={fillerNote || "None found"} />
        {summary.average_eye_contact_pct != null && (
          <Tile
            label="Eye contact"
            value={`${Math.round(summary.average_eye_contact_pct)}%`}
            score={summary.average_attention_score}
            note={summary.look_away_events ? `${summary.look_away_events} long look-away(s)` : "Around 70% is natural"}
          />
        )}
        <Tile label="Words spoken" value={summary.total_words} />
      </div>
      {weakest && weakest[1] < 75 && (
        <p className="mt-3 text-sm text-white/60">
          Work on first: <span className="font-semibold text-white">{weakest[0] === "fillers" ? "filler words" : weakest[0]}</span> (average {Math.round(weakest[1])} / 100).
        </p>
      )}
      {(summary.answers_skipped > 0 || summary.answers_without_transcript > 0) && (
        <p className="mt-1 text-xs text-white/40">
          Not counted: {summary.answers_skipped} skipped, {summary.answers_without_transcript} with no words captured.
        </p>
      )}
    </section>
  );
}
