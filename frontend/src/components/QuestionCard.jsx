import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";

const mmss = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * One question with its countdown. Render it with key={question.id} so every
 * question starts a fresh timer. When time runs out the answer is sent
 * automatically, once.
 */
export default function QuestionCard({ question, index, total, busy, onSubmit }) {
  const limit = question.time_limit_seconds;
  const [remaining, setRemaining] = useState(limit);
  const startedAt = useRef(0);
  const expiredOnce = useRef(false);
  const submitRef = useRef(onSubmit);

  useEffect(() => {
    submitRef.current = onSubmit;
  });

  useEffect(() => {
    startedAt.current = Date.now();
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil(limit - (Date.now() - startedAt.current) / 1000));
      setRemaining(left);
      if (left === 0 && !expiredOnce.current) {
        expiredOnce.current = true;
        submitRef.current(limit);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [limit]);

  const secondsUsed = () => Math.min(limit, Math.round((Date.now() - startedAt.current) / 1000));
  const tone = remaining <= 10 ? "text-red-400" : remaining <= 30 ? "text-amber-300" : "text-white";

  return (
    <div className="rounded-3xl border border-white/10 bg-surface p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-brand-400">
          Question {index} of {total}
          {question.category ? ` · ${question.category}` : ""}
        </span>
        <span className={`font-mono text-2xl font-bold tabular-nums ${tone}`} role="timer" aria-label="Time left">
          {mmss(remaining)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${(remaining / limit) * 100}%` }} />
      </div>

      <h2 className="mt-8 text-2xl font-bold leading-snug sm:text-3xl">{question.text}</h2>
      <p className="mt-4 text-sm text-white/50">Answer out loud. Press submit when you are done, or the answer is sent when time runs out.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="solid" disabled={busy} onClick={() => onSubmit(secondsUsed())}>
          {busy ? "Saving..." : index === total ? "Submit and finish" : "Submit answer"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => onSubmit(0)}>
          Skip question
        </Button>
      </div>
    </div>
  );
}
