import assert from "node:assert/strict";
import { test } from "node:test";
import { AttentionTracker, analyzeFace } from "./attention.js";

// A face looking straight at the camera. Overrides move single points.
function face(overrides = {}) {
  const pts = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (i, x, y) => { pts[i] = { x, y }; };
  set(234, 0.35, 0.5); set(454, 0.65, 0.5);          // cheeks: face width 0.3
  set(10, 0.5, 0.2); set(152, 0.5, 0.8); set(1, 0.5, 0.52); // forehead, chin, nose (pitch 0.53)
  // right eye (outer 33, inner 133) and left eye (inner 362, outer 263), each 0.06 wide, 0.02 open
  set(33, 0.38, 0.4); set(133, 0.44, 0.4); set(159, 0.41, 0.39); set(145, 0.41, 0.41); set(468, 0.41, 0.4);
  set(362, 0.56, 0.4); set(263, 0.62, 0.4); set(386, 0.59, 0.39); set(374, 0.59, 0.41); set(473, 0.59, 0.4);
  for (const [i, v] of Object.entries(overrides)) set(Number(i), v[0], v[1]);
  return pts;
}

test("no face, or too few points, is not a face", () => {
  assert.equal(analyzeFace(undefined).face, false);
  assert.equal(analyzeFace([]).face, false);
});

test("a face looking at the camera counts as eye contact", () => {
  const r = analyzeFace(face());
  assert.deepEqual([r.face, r.blink, r.eyeContact], [true, false, true]);
});

test("a turned head is not eye contact", () => {
  assert.equal(analyzeFace(face({ 1: [0.57, 0.52] })).eyeContact, false); // nose 0.07 / 0.3 = 0.23 off centre
  assert.equal(analyzeFace(face({ 1: [0.52, 0.52] })).eyeContact, true);  // a small turn is fine
});

test("eyes looking to the side are not eye contact", () => {
  const r = analyzeFace(face({ 468: [0.435, 0.4], 473: [0.615, 0.4] })); // irises near the eye corners
  assert.equal(r.eyeContact, false);
  assert.ok(r.side > 0.3);
});

test("a head tilted far down or up is not eye contact", () => {
  assert.equal(analyzeFace(face({ 1: [0.5, 0.7] })).eyeContact, false); // pitch 0.83
  assert.equal(analyzeFace(face({ 1: [0.5, 0.3] })).eyeContact, false); // pitch 0.17
});

test("closed eyes are reported as a blink, not as looking away", () => {
  const r = analyzeFace(face({ 145: [0.41, 0.3905], 374: [0.59, 0.3905] }));
  assert.equal(r.blink, true);
  assert.equal(r.eyeContact, false);
});

const contact = { face: true, blink: false, eyeContact: true };
const away = { face: true, blink: false, eyeContact: false };
const gone = { face: false, blink: false, eyeContact: false };
const blink = { face: true, blink: true, eyeContact: false };

function run(tracker, frames, start = 0, step = 200) {
  frames.forEach((f, i) => tracker.add(f, start + i * step));
  return start + frames.length * step;
}

test("percentages are weighted by time", () => {
  const t = new AttentionTracker();
  run(t, [...Array(30).fill(contact), ...Array(10).fill(away)]); // 30 + 10 frames, 200 ms apart
  const s = t.snapshot();
  // 75% of the frames, a little more in time because a change takes 3 frames to be believed
  assert.ok(s.eye_contact_pct > 75 && s.eye_contact_pct < 82, String(s.eye_contact_pct));
  assert.equal(s.face_visible_pct, 100);
  assert.equal(s.look_away_events, 0);
});

test("one odd frame does not flip the state", () => {
  const t = new AttentionTracker();
  run(t, [...Array(10).fill(contact), away, ...Array(10).fill(contact)]);
  assert.equal(t.snapshot().eye_contact_pct, 100);
});

test("blinks keep the previous state", () => {
  const t = new AttentionTracker();
  run(t, [...Array(10).fill(contact), blink, blink, blink, blink, ...Array(10).fill(contact)]);
  assert.equal(t.snapshot().eye_contact_pct, 100);
});

test("a long look away is one event, a short one is none", () => {
  const t = new AttentionTracker();
  let now = run(t, Array(10).fill(contact));
  now = run(t, Array(15).fill(away), now);      // 3 seconds away
  now = run(t, Array(10).fill(contact), now);
  now = run(t, Array(5).fill(away), now);       // 1 second away: not an event
  run(t, Array(10).fill(contact), now);
  const s = t.snapshot();
  assert.equal(s.look_away_events, 1);
  assert.ok(s.longest_look_away_seconds >= 2.4 && s.longest_look_away_seconds <= 3.2);
});

test("a look away that is still going on is counted in the snapshot", () => {
  const t = new AttentionTracker();
  const now = run(t, Array(10).fill(contact));
  run(t, Array(20).fill(away), now);
  assert.equal(t.snapshot().look_away_events, 1);
});

test("being out of frame lowers face visibility and eye contact", () => {
  const t = new AttentionTracker();
  run(t, [...Array(20).fill(contact), ...Array(20).fill(gone)]);
  const s = t.snapshot();
  assert.ok(s.face_visible_pct > 45 && s.face_visible_pct < 56, String(s.face_visible_pct));
  assert.equal(s.eye_contact_pct, s.face_visible_pct);
  assert.equal(s.look_away_events, 1);
});

test("long gaps between frames count for at most one second", () => {
  const t = new AttentionTracker();
  t.add(contact, 0);
  t.add(contact, 60000); // the tab was hidden for a minute
  assert.equal(t.snapshot().tracked_seconds, 1);
});

test("nothing measured gives null, and reset clears everything", () => {
  const t = new AttentionTracker();
  assert.equal(t.snapshot(), null);
  run(t, Array(10).fill(contact));
  t.reset();
  assert.equal(t.snapshot(), null);
});
