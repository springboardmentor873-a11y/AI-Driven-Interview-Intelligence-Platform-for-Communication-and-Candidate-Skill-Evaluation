import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { countLiveFillers, countWords, paceHint } from "../utils/liveSpeech";

const mmss = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * One question with its countdown. Render it with key={question.id} so every
 * question starts a fresh timer and a fresh transcript. When time runs out the
 * answer is sent automatically, once.
 *
 * The answer is captured as text: live speech recognition when the browser and
 * microphone allow it, otherwise (or on request) a box to type in.
 * onSubmit(secondsUsed, { transcript, transcript_source, speech_confidence }).
 */
export default function QuestionCard({ question, index, total, busy, micReady = false, onSubmit }) {
  const limit = question.time_limit_seconds;
  const [remaining, setRemaining] = useState(limit);
  const startedAt = useRef(0);
  const expiredOnce = useRef(false);
  const submitRef = useRef(onSubmit);
  const collectRef = useRef(null);
  const sendingRef = useRef(false);
  const speech = useSpeechRecognition();
  const { start: startListening } = speech;
  const [typed, setTyped] = useState(null); // null until the person edits: then their text wins
  const [forceTyping, setForceTyping] = useState(false);

  const typing = !micReady || !speech.supported || speech.status === "error" || forceTyping;
  const spoken = `${speech.heard.final} ${speech.heard.interim}`.trim();
  const typedValue = typed ?? spoken; // words heard before switching to typing are kept

  // Live estimate of speaking pace, counted from the first words so thinking time does not slow it down
  const words = countWords(spoken);
  const speakingFor = limit - remaining - (speech.heard.firstWordSeconds ?? 0);
  const livePace = words >= 10 && speakingFor >= 8 ? Math.round(words / (speakingFor / 60)) : null;
  const hint = livePace ? paceHint(livePace) : null;
  const liveFillers = countLiveFillers(spoken);

  const sendRef = useRef(null);
  const send = async (seconds, skip = false) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      if (skip) {
        speech.abort();
        submitRef.current(0, {});
      } else {
        submitRef.current(seconds, await collectRef.current());
      }
    } finally {
      sendingRef.current = false;
    }
  };

  useEffect(() => {
    sendRef.current = send;
    submitRef.current = onSubmit;
    collectRef.current = async () => {
      if (typing) return { transcript: typedValue.trim(), transcript_source: "typed" };
      await speech.stop(); // give the recognizer a moment to finish the last words
      const heard = speech.snapshot();
      return {
        transcript: heard.transcript,
        transcript_source: "speech",
        speech_confidence: heard.confidence,
        ...(heard.hesitation ? { hesitation: heard.hesitation } : {}),
      };
    };
  });

  useEffect(() => {
    if (micReady) startListening(); // does nothing in browsers without speech recognition
  }, [micReady, startListening]);

  const switchToTyping = () => {
    setTyped(spoken);
    setForceTyping(true);
    speech.abort();
  };

  useEffect(() => {
    startedAt.current = Date.now();
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil(limit - (Date.now() - startedAt.current) / 1000));
      setRemaining(left);
      if (left === 0 && !expiredOnce.current) {
        expiredOnce.current = true;
        sendRef.current(limit);
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
      <p className="mt-4 text-sm text-white/50">
        {typing ? "Type your answer." : "Answer out loud."} Press submit when you are done, or the answer is sent when time runs out.
      </p>

      {typing ? (
        <div className="mt-5">
          {micReady && !speech.supported && (
            <p className="mb-2 text-xs text-amber-300">Speech recognition is not available in this browser, so type your answer. Chrome or Edge on a computer works best.</p>
          )}
          {speech.status === "error" && <p className="mb-2 text-xs text-amber-300">{speech.error}</p>}
          {!micReady && <p className="mb-2 text-xs text-white/50">No microphone is connected, so type your answer.</p>}
          <textarea
            value={typedValue}
            onChange={(e) => setTyped(e.target.value)}
            maxLength={10000}
            rows={5}
            aria-label="Your answer"
            placeholder="Type your answer here..."
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-brand-500 focus:outline-none"
          />
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${speech.status === "listening" ? "animate-pulse bg-green-400" : "bg-white/30"}`} />
              {speech.status === "listening" ? "Listening - live transcript" : "Starting speech recognition..."}
            </span>
            <button type="button" onClick={switchToTyping} className="underline hover:text-white/80">Type instead</button>
          </div>
          <p className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-white/90" aria-live="polite">
            {spoken ? (
              <>
                {speech.heard.final}
                {speech.heard.interim && <span className="text-white/40"> {speech.heard.interim}</span>}
              </>
            ) : (
              <span className="text-white/30">Start speaking. Your words appear here.</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-2 text-xs text-white/50" aria-label="Live estimates">
            <span>{words} words</span>
            {hint ? (
              <span className={hint.ok ? "text-green-300" : "text-amber-300"}>{livePace} wpm: {hint.text}</span>
            ) : (
              <span>Pace shows after a few sentences</span>
            )}
            <span className={liveFillers ? "text-amber-300" : ""}>{liveFillers} um/uh</span>
            <span className="text-white/30">live estimate</span>
          </div>
          <p className="mt-2 text-[11px] text-white/30">Chrome and Edge may send your voice to their speech service to turn it into text.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="solid" disabled={busy} onClick={() => send(secondsUsed())}>
          {busy ? "Saving..." : index === total ? "Submit and finish" : "Submit answer"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => send(0, true)}>
          Skip question
        </Button>
      </div>
    </div>
  );
}
