// Eye-contact and attention measurement from face landmarks (Milestone 3, Day 4).
//
// Everything here is plain math with no browser or MediaPipe code, so it can be tested with
// made-up landmarks. The MediaPipe Face Landmarker (478 points per face, including the irises)
// is wired up in hooks/useAttentionTracker.js.
//
// The limits below are first values that look sensible on paper. They have NOT been tuned on real
// faces yet: try them with a few people and cameras and adjust LIMITS if the badge is too strict or
// too forgiving.

// Landmark numbers of the MediaPipe face mesh
const POINT = { nose: 1, forehead: 10, chin: 152, cheekA: 234, cheekB: 454 };
const EYES = [
  { outer: 33, inner: 133, upper: 159, lower: 145, iris: 468 }, // the person's right eye
  { outer: 263, inner: 362, upper: 386, lower: 374, iris: 473 }, // the person's left eye
];

export const LIMITS = {
  headTurn: 0.09, // nose off the middle of the face, as a share of face width (about 25 degrees)
  headPitch: [0.42, 0.75], // nose position between forehead and chin: outside means head up or down a lot
  gazeSide: 0.11, // iris off the middle of the eye, as a share of eye width (about 15 degrees)
  gazeVertical: [0.25, 0.75], // iris position between upper and lower eyelid
  blink: 0.12, // eye opening / eye width below this means closed: the sample is ignored
};

// How strongly an expression must show before it counts. Same caveat as LIMITS: not tuned on real faces yet.
export const EXPRESSION = { tense: 0.4, smile: 0.35, raised: 0.5, smoothing: 0.4 };

const mean = (a, b) => (a + b) / 2;
const span = (p, q, axis) => Math.abs(p[axis] - q[axis]);

/**
 * Expression strengths (0 to 1) from MediaPipe face blendshapes, given as a list of
 * { categoryName, score }. Returns null when there are none.
 *   smile   both mouth corners pulled up
 *   tense   brows pulled down, lips pressed or mouth corners down (also a very serious, concentrating face)
 *   raised  eyebrows lifted or eyes wide (surprised, or just animated)
 */
export function expressionScores(categories) {
  if (!categories || categories.length === 0) return null;
  const by = {};
  for (const c of categories) by[c.categoryName] = c.score;
  const pair = (name) => mean(by[`${name}Left`] ?? 0, by[`${name}Right`] ?? 0);
  return {
    smile: pair("mouthSmile"),
    tense: Math.max(pair("browDown"), pair("mouthPress"), pair("mouthFrown")),
    raised: Math.max(by.browInnerUp ?? 0, pair("browOuterUp"), pair("eyeWide")),
  };
}

/** The label for smoothed expression strengths: tense, smile, raised or neutral. */
export function expressionLabel(scores) {
  if (scores.tense >= EXPRESSION.tense) return "tense";
  if (scores.smile >= EXPRESSION.smile) return "smile";
  if (scores.raised >= EXPRESSION.raised) return "raised";
  return "neutral";
}

/**
 * Look at one frame. `landmarks` is the list of {x, y} points of one face, or nothing when no face
 * was found; `blendshapes` (optional) are that face's expression scores. Returns
 * { face, blink, eyeContact, ...measurements }.
 */
export function analyzeFace(landmarks, blendshapes) {
  if (!landmarks || landmarks.length < 478) return { face: false, blink: false, eyeContact: false };
  const p = (i) => landmarks[i];

  const faceWidth = span(p(POINT.cheekA), p(POINT.cheekB), "x");
  const faceHeight = span(p(POINT.forehead), p(POINT.chin), "y");
  if (faceWidth < 1e-6 || faceHeight < 1e-6) return { face: false, blink: false, eyeContact: false };

  const middleX = mean(p(POINT.cheekA).x, p(POINT.cheekB).x);
  const turn = (p(POINT.nose).x - middleX) / faceWidth; // 0 = facing the camera
  const pitch = (p(POINT.nose).y - p(POINT.forehead).y) / faceHeight;

  let side = 0;
  let vertical = 0;
  let opening = 0;
  for (const eye of EYES) {
    const left = Math.min(p(eye.outer).x, p(eye.inner).x);
    const width = span(p(eye.outer), p(eye.inner), "x");
    if (width < 1e-6) return { face: false, blink: false, eyeContact: false };
    const gap = p(eye.lower).y - p(eye.upper).y;
    side += (p(eye.iris).x - left) / width - 0.5;
    vertical += gap > 1e-6 ? (p(eye.iris).y - p(eye.upper).y) / gap : 0.5;
    opening += gap / width;
  }
  side /= EYES.length;
  vertical /= EYES.length;
  opening /= EYES.length;

  const measurements = { turn, pitch, side, vertical, opening, expression: expressionScores(blendshapes) };
  if (opening < LIMITS.blink) return { face: true, blink: true, eyeContact: false, ...measurements };

  const headOk = Math.abs(turn) <= LIMITS.headTurn && pitch >= LIMITS.headPitch[0] && pitch <= LIMITS.headPitch[1];
  const eyesOk = Math.abs(side) <= LIMITS.gazeSide && vertical >= LIMITS.gazeVertical[0] && vertical <= LIMITS.gazeVertical[1];
  return { face: true, blink: false, eyeContact: headOk && eyesOk, ...measurements };
}

const CONTACT = "contact";
const AWAY = "away";
const ABSENT = "absent";

/**
 * Turns a stream of frames into the numbers saved with an answer.
 *
 * - A state change (eye contact / looking away / face not visible) only counts after `steady`
 *   frames in a row, so one odd frame does not flip it.
 * - Frames that caught a blink keep the previous state.
 * - Time is weighted: a gap between frames counts as time (at most 1 second per gap).
 * - A "look-away event" is a stretch of looking away or being out of frame lasting `awaySeconds`
 *   or more.
 */
export class AttentionTracker {
  constructor({ steady = 3, awaySeconds = 2 } = {}) {
    this.steady = steady;
    this.awaySeconds = awaySeconds;
    this.reset();
  }

  reset() {
    this.state = null;
    this.candidate = null;
    this.candidateCount = 0;
    this.lastAt = null;
    this.stateSince = null;
    this.ms = { [CONTACT]: 0, [AWAY]: 0, [ABSENT]: 0 };
    this.events = 0;
    this.longestAwayMs = 0;
    this.smooth = null;
    this.expressionLabel = null;
    this.exprMs = { smile: 0, tense: 0, raised: 0, neutral: 0 };
  }

  /** Add one frame (the result of analyzeFace) seen at time `nowMs`. */
  add(frame, nowMs) {
    if (!frame.blink || this.state === null) {
      const seen = !frame.face ? ABSENT : frame.eyeContact ? CONTACT : AWAY;
      this._observe(seen, nowMs);
    }
    const gap = this.lastAt !== null ? Math.min(Math.max(nowMs - this.lastAt, 0), 1000) : 0;
    if (this.state !== null) this.ms[this.state] += gap;
    this._addExpression(frame, gap);
    this.lastAt = nowMs;
    return this.state;
  }

  // Expression is only judged while a face is visible. Strengths are smoothed so a flicker does not change the label.
  _addExpression(frame, gap) {
    if (!frame.face || !frame.expression || this.state === ABSENT) {
      if (!frame.face) this.expressionLabel = null;
      return;
    }
    const a = EXPRESSION.smoothing;
    const now = frame.expression;
    this.smooth = this.smooth
      ? { smile: this.smooth.smile + a * (now.smile - this.smooth.smile), tense: this.smooth.tense + a * (now.tense - this.smooth.tense), raised: this.smooth.raised + a * (now.raised - this.smooth.raised) }
      : { ...now };
    this.expressionLabel = expressionLabel(this.smooth);
    this.exprMs[this.expressionLabel] += gap;
  }

  /** How the face looked, as shares of the time it was visible, or null if no expression data. */
  expressionSnapshot() {
    const total = Object.values(this.exprMs).reduce((sum, ms) => sum + ms, 0);
    if (total <= 0) return null;
    const pct = (ms) => Math.round((ms / total) * 1000) / 10;
    return {
      face_seconds: Math.round(total / 100) / 10,
      smile_pct: pct(this.exprMs.smile),
      tense_pct: pct(this.exprMs.tense),
      raised_pct: pct(this.exprMs.raised),
      neutral_pct: pct(this.exprMs.neutral),
    };
  }

  _observe(seen, nowMs) {
    if (this.state === null) {
      this.state = seen;
      this.stateSince = nowMs;
      return;
    }
    if (seen === this.state) {
      this.candidate = null;
      this.candidateCount = 0;
      return;
    }
    this.candidateCount = seen === this.candidate ? this.candidateCount + 1 : 1;
    this.candidate = seen;
    if (this.candidateCount >= this.steady) {
      this._closeRun(nowMs);
      this.state = seen;
      this.stateSince = nowMs;
      this.candidate = null;
      this.candidateCount = 0;
    }
  }

  _closeRun(nowMs) {
    if (this.state === CONTACT) return;
    const ran = nowMs - this.stateSince;
    if (ran >= this.awaySeconds * 1000) this.events += 1;
    this.longestAwayMs = Math.max(this.longestAwayMs, ran);
  }

  /** The numbers so far, or null before any time was measured. Does not reset. */
  snapshot(nowMs = this.lastAt) {
    const total = this.ms[CONTACT] + this.ms[AWAY] + this.ms[ABSENT];
    if (total <= 0) return null;
    let events = this.events;
    let longest = this.longestAwayMs;
    if (this.state !== null && this.state !== CONTACT && nowMs != null) {
      const ran = nowMs - this.stateSince; // the stretch still going on
      if (ran >= this.awaySeconds * 1000) events += 1;
      longest = Math.max(longest, ran);
    }
    const pct = (ms) => Math.round((ms / total) * 1000) / 10;
    return {
      tracked_seconds: Math.round(total / 100) / 10,
      face_visible_pct: pct(this.ms[CONTACT] + this.ms[AWAY]),
      eye_contact_pct: pct(this.ms[CONTACT]),
      look_away_events: events,
      longest_look_away_seconds: Math.min(Math.round(longest / 100) / 10, Math.round(total / 100) / 10),
    };
  }
}
