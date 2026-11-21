// Quick live estimates shown while the candidate is speaking. The final analysis on the
// server uses fuller rules (and can differ a little), so these are labelled as estimates.

const LIVE_FILLERS = /\b(?:um+|uh+|uhm|erm?|ah|hmm+)\b/gi;

export const countWords = (text) => (text.match(/[A-Za-z0-9']+/g) || []).length;

export const countLiveFillers = (text) => (text.match(LIVE_FILLERS) || []).length;

/** A short hint for a speaking speed in words per minute (120 to 170 suits an interview). */
export function paceHint(wpm) {
  if (wpm < 100) return { text: "Too slow: pick up the pace", ok: false };
  if (wpm < 120) return { text: "A little slow", ok: false };
  if (wpm <= 170) return { text: "Good pace", ok: true };
  if (wpm <= 190) return { text: "A little fast", ok: false };
  return { text: "Too fast: slow down", ok: false };
}
