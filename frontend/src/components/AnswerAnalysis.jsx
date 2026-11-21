const mark = (score) => (score >= 75 ? "text-green-300" : score >= 50 ? "text-amber-300" : "text-red-300");

const EXPRESSION_NAMES = { smile: "Smiling", tense: "Tense / serious", raised: "Brows raised", neutral: "Neutral" };

function Stat({ label, value, score, hint }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2" title={hint}>
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className={`text-sm font-semibold ${score == null ? "text-white" : mark(score)}`}>{value}</p>
    </div>
  );
}

/** The speech analysis of one answer: transcript, numbers and the grammar notes. */
export default function AnswerAnalysis({ answer }) {
  const a = answer.analysis;
  if (!a || !a.status) return null;
  if (a.status === "skipped") return null;
  if (a.status === "no_transcript") {
    return (
      <p className="mt-3 text-sm text-white/50">
        No words were captured for this answer, so it could not be analysed. Check that your microphone works and that you are using Chrome or Edge, or type your answers.
      </p>
    );
  }

  const basic = a.grammar?.source !== "ai";
  const fillerList = Object.entries(a.fillers?.counts || {}).map(([word, n]) => `${word} x${n}`).join(", ");
  return (
    <div className="mt-3 space-y-3">
      <p className="rounded-lg bg-white/5 px-3 py-2 text-sm italic leading-relaxed text-white/70">{answer.transcript}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {a.communication_score != null && <Stat label="Communication" value={`${Math.round(a.communication_score)} / 100`} score={a.communication_score} />}
        {a.pace && <Stat label="Pace" value={`${a.pace.wpm} wpm`} score={a.pace.score} hint={`Pace is ${a.pace.label}. About 120 to 170 words per minute suits an interview.`} />}
        {a.fillers && <Stat label="Filler words" value={a.fillers.total} score={a.fillers.score} hint={fillerList || "None found"} />}
        {a.clarity && <Stat label="Clarity" value={`${a.clarity.score} / 100`} score={a.clarity.score} hint="Estimated from how confidently your browser recognised your words" />}
        {a.grammar && <Stat label="Grammar" value={`${a.grammar.score} / 100`} score={a.grammar.score} />}
        {a.completeness && <Stat label="Completeness" value={`${a.completeness.score} / 100`} score={a.completeness.score} />}
        {a.attention && (
          <Stat
            label="Eye contact"
            value={`${Math.round(a.attention.eye_contact_pct)}%`}
            score={a.attention.score}
            hint={`Face visible ${Math.round(a.attention.face_visible_pct)}% of the time. Around 70% is natural.`}
          />
        )}
        {a.technical && <Stat label="Relevance" value={`${a.technical.score} / 100`} score={a.technical.score} hint="How well the answer deals with this question: accuracy, keywords, problem solving, domain knowledge" />}
        {a.organization && <Stat label="Organization" value={`${a.organization.score} / 100`} score={a.organization.score} hint="Clear opening, logical order, clear ending" />}
        {a.tone && <Stat label="Professional tone" value={`${a.tone.score} / 100`} score={a.tone.score} hint="Respectful, suitable language for an interview" />}
        {a.confidence && (
          <Stat
            label="Confidence"
            value={`${Math.round(a.confidence.score)} / 100`}
            score={a.confidence.score}
            hint="From eye contact, staying in frame, facial expressiveness, hesitation and speaking confidence"
          />
        )}
        {a.hesitation && (
          <Stat
            label="Hesitation"
            value={a.hesitation.long_pauses ? `${a.hesitation.long_pauses} long pause(s)` : "None"}
            score={a.hesitation.score}
            hint={`First word after ${a.hesitation.response_delay_seconds} s. A long pause is 2.5 s or more.`}
          />
        )}
        {a.expression && <Stat label="Expression" value={EXPRESSION_NAMES[a.expression.dominant]} hint={`Smiling ${Math.round(a.expression.smile_pct)}%, tense ${Math.round(a.expression.tense_pct)}%, eyebrows raised ${Math.round(a.expression.raised_pct)}%, neutral ${Math.round(a.expression.neutral_pct)}% of the time`} />}
        <Stat label="Words" value={a.word_count} />
      </div>
      {a.technical?.note && <p className="text-xs text-white/60">About the content: {a.technical.note}</p>}
      {fillerList && <p className="text-xs text-white/50">Filler words: {fillerList}</p>}
      {a.hesitation && a.hesitation.response_delay_seconds > 3 && (
        <p className="text-xs text-white/50">You started speaking {a.hesitation.response_delay_seconds} seconds after the question appeared. Under 3 seconds feels natural.</p>
      )}
      {a.attention?.look_away_events > 0 && (
        <p className="text-xs text-white/50">
          You looked away from the camera {a.attention.look_away_events} time(s) for 2 seconds or more (longest {a.attention.longest_look_away_seconds} s).
        </p>
      )}
      {a.pace && a.pace.label !== "good" && <p className="text-xs text-white/50">Your pace was {a.pace.label}. Aim for about 120 to 170 words per minute.</p>}
      {a.grammar?.issues?.length > 0 && (
        <ul className="space-y-1 text-xs text-white/60">
          {a.grammar.issues.map((issue, i) => (
            <li key={i}>
              &ldquo;{issue.text}&rdquo; &rarr; <span className="text-green-300">{issue.suggestion}</span>
            </li>
          ))}
        </ul>
      )}
      {basic && <p className="text-[11px] text-white/30">Basic check: the AI review of grammar and completeness was not available for this answer.</p>}
    </div>
  );
}
