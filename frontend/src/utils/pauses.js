// Hesitation measured from when the speech recognizer reports words (Milestone 3, Day 5).
// Plain math with no browser code, so it can be tested.

export const PAUSE_MS = 2500; // silence this long in the middle of an answer is a "long pause"

export class PauseTracker {
  constructor(pauseMs = PAUSE_MS) {
    this.pauseMs = pauseMs;
    this.reset();
  }

  reset() {
    this.began = null; // when listening started
    this.last = null; // when the recognizer last reported words
    this.firstWord = null; // seconds from the start until the first words
    this.count = 0;
    this.total = 0;
    this.longest = 0;
  }

  /** Listening has started at nowMs (only the first call counts). */
  begin(nowMs) {
    if (this.began === null) this.began = nowMs;
  }

  /** The recognizer reported words at nowMs. */
  activity(nowMs) {
    if (this.began === null) this.began = nowMs;
    if (this.firstWord === null) {
      this.firstWord = Math.round((nowMs - this.began) / 100) / 10;
    } else if (nowMs - this.last >= this.pauseMs) {
      const gap = (nowMs - this.last) / 1000;
      this.count += 1;
      this.total += gap;
      this.longest = Math.max(this.longest, gap);
    }
    this.last = nowMs;
  }

  /** What is sent with the answer, or null if no words were heard. Silence after the last word is not a pause. */
  snapshot() {
    if (this.firstWord === null) return null;
    const round = (n) => Math.round(n * 10) / 10;
    return {
      response_delay_seconds: this.firstWord,
      long_pauses: this.count,
      longest_pause_seconds: round(this.longest),
      total_pause_seconds: round(this.total),
    };
  }
}
