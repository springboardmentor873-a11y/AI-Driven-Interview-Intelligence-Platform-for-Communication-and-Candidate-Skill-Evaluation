import assert from "node:assert/strict";
import { test } from "node:test";
import { PauseTracker } from "./pauses.js";

test("nothing heard means no hesitation data", () => {
  const p = new PauseTracker();
  p.begin(0);
  assert.equal(p.snapshot(), null);
});

test("the delay is the time until the first words", () => {
  const p = new PauseTracker();
  p.begin(1000);
  p.activity(4400);
  assert.equal(p.snapshot().response_delay_seconds, 3.4);
  assert.equal(p.snapshot().long_pauses, 0);
});

test("only gaps of 2.5 seconds or more count as long pauses", () => {
  const p = new PauseTracker();
  p.begin(0);
  [1000, 1400, 2000, 4400, 4800, 9800, 10100].forEach((t) => p.activity(t));
  // gaps: 0.4, 0.6, 2.4 (no), 0.4, 5.0 (yes), 0.3
  assert.deepEqual(p.snapshot(), { response_delay_seconds: 1, long_pauses: 1, longest_pause_seconds: 5, total_pause_seconds: 5 });
});

test("several pauses add up and the longest is kept", () => {
  const p = new PauseTracker();
  p.begin(0);
  [500, 3500, 4000, 8000].forEach((t) => p.activity(t)); // gaps 3.0, 0.5, 4.0
  const s = p.snapshot();
  assert.equal(s.long_pauses, 2);
  assert.equal(s.longest_pause_seconds, 4);
  assert.equal(s.total_pause_seconds, 7);
});

test("begin only counts once, and reset starts over", () => {
  const p = new PauseTracker();
  p.begin(0);
  p.begin(5000);
  p.activity(2000);
  assert.equal(p.snapshot().response_delay_seconds, 2);
  p.reset();
  assert.equal(p.snapshot(), null);
});
