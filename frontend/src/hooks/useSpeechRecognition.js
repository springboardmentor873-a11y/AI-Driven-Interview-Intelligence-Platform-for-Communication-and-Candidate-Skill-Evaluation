import { useCallback, useEffect, useRef, useState } from "react";

const FATAL = {
  "not-allowed": "Microphone access was blocked for speech recognition.",
  "service-not-allowed": "Speech recognition is not allowed in this browser.",
  "audio-capture": "No microphone was found for speech recognition.",
  "language-not-supported": "Speech recognition does not support your language setting.",
};

const getCtor = () => (typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
const pickLang = () => (navigator.language?.toLowerCase().startsWith("en") ? navigator.language : "en-US");

export const speechSupported = () => Boolean(getCtor());

/**
 * Live speech-to-text with the browser's own recognizer (Chrome and Edge work best).
 * Browsers end a session after a pause, so it restarts itself until stop() or abort().
 *
 *   start()    begin listening
 *   stop()     stop and wait briefly for the last words (returns a promise)
 *   snapshot() { transcript, confidence } of everything heard so far
 *   abort()    stop at once (used when the page is left)
 */
export default function useSpeechRecognition() {
  const supported = speechSupported();
  const [heard, setHeard] = useState({ final: "", interim: "" });
  const [status, setStatus] = useState("idle"); // idle | listening | error
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const wantRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const confRef = useRef({ sum: 0, count: 0 });
  const startedAtRef = useRef(0);
  const rapidRef = useRef(0);
  const waitersRef = useRef([]);

  const fail = useCallback((message) => {
    wantRef.current = false;
    setStatus("error");
    setError(message);
  }, []);

  const release = useCallback(() => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach((done) => done());
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || wantRef.current) return;
    wantRef.current = true;
    rapidRef.current = 0;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = pickLang();

    rec.onstart = () => setStatus("listening");
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const best = result[0];
        if (result.isFinal) {
          finalRef.current = `${finalRef.current} ${best.transcript}`.trim();
          if (best.confidence > 0) confRef.current = { sum: confRef.current.sum + best.confidence, count: confRef.current.count + 1 };
        } else {
          interim += best.transcript;
        }
      }
      interimRef.current = interim.trim();
      rapidRef.current = 0;
      setHeard({ final: finalRef.current, interim: interimRef.current });
    };
    rec.onerror = (event) => {
      if (FATAL[event.error]) fail(FATAL[event.error]);
    };
    rec.onend = () => {
      if (!wantRef.current) {
        setStatus((s) => (s === "error" ? s : "idle"));
        release();
        return;
      }
      // The browser ended the session (a pause, or its time limit): listen again.
      rapidRef.current = Date.now() - startedAtRef.current < 700 ? rapidRef.current + 1 : 0;
      if (rapidRef.current >= 5) {
        fail("Speech recognition keeps stopping. Please type your answer instead.");
        release();
        return;
      }
      try {
        startedAtRef.current = Date.now();
        rec.start();
      } catch {
        fail("Speech recognition stopped. Please type your answer instead.");
        release();
      }
    };
    recRef.current = rec;
    try {
      startedAtRef.current = Date.now();
      rec.start();
    } catch {
      fail("Could not start speech recognition. Please type your answer instead.");
    }
  }, [fail, release]);

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const rec = recRef.current;
        wantRef.current = false;
        if (!rec) return resolve();
        const timer = setTimeout(resolve, 1200); // never hold up the answer for more than a moment
        waitersRef.current.push(() => {
          clearTimeout(timer);
          resolve();
        });
        try {
          rec.stop();
        } catch {
          release();
        }
      }),
    [release],
  );

  const abort = useCallback(() => {
    wantRef.current = false;
    const rec = recRef.current;
    if (!rec) return;
    rec.onend = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onstart = null;
    try {
      rec.abort();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
    release();
  }, [release]);

  const snapshot = useCallback(() => {
    const { sum, count } = confRef.current;
    return {
      // words the browser had heard but not yet finalised still count
      transcript: `${finalRef.current} ${interimRef.current}`.trim(),
      confidence: count ? Math.round((sum / count) * 100) / 100 : null,
    };
  }, []);

  useEffect(() => abort, [abort]); // stop listening when the question or page goes away

  return { supported, status, error, heard, start, stop, abort, snapshot };
}
