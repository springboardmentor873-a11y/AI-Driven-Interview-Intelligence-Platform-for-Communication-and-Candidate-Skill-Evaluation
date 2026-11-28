import test from "node:test";
import assert from "node:assert/strict";
import {
  compareParams, connectionMessage, countShares, fieldErrors, formatChange, formatDuration, formatScore, initials, linePath, nearestIndex, ordinal, pageRange, parseOptionalInt, radarPoint, radarPolygon, rankingText, ratingShares,
  scaleX, scaleY, scoreTone, seriesPoints, shortDate, timeAgo, toggleSelection, weekLabel,
} from "./analytics.js";

const box = { left: 0, right: 100, top: 0, bottom: 100 };

test("formatScore drops trailing zeros and shows a dash for nothing", () => {
  assert.equal(formatScore(72.5), "72.5");
  assert.equal(formatScore(80), "80");
  assert.equal(formatScore(79.96), "80");
  assert.equal(formatScore(null), "—");
  assert.equal(formatScore(undefined), "—");
});

test("formatChange shows the sign", () => {
  assert.equal(formatChange(12.5), "+12.5");
  assert.equal(formatChange(-3), "−3");
  assert.equal(formatChange(0), "0");
  assert.equal(formatChange(null), "—");
});

test("scoreTone uses the 60 and 75 lines", () => {
  assert.equal(scoreTone(59.9).text, "text-red-300");
  assert.equal(scoreTone(60).text, "text-amber-300");
  assert.equal(scoreTone(74.9).text, "text-amber-300");
  assert.equal(scoreTone(75).text, "text-emerald-300");
  assert.equal(scoreTone(null).text, "text-white/40");
});

test("scaleX spreads interviews across the width and centres a single one", () => {
  assert.equal(scaleX(0, 3, 10, 110), 10);
  assert.equal(scaleX(1, 3, 10, 110), 60);
  assert.equal(scaleX(2, 3, 10, 110), 110);
  assert.equal(scaleX(0, 1, 10, 110), 60);
});

test("scaleY puts 100 at the top, 0 at the bottom and clamps", () => {
  assert.equal(scaleY(100, 20, 220), 20);
  assert.equal(scaleY(0, 20, 220), 220);
  assert.equal(scaleY(50, 20, 220), 120);
  assert.equal(scaleY(150, 20, 220), 20);
  assert.equal(scaleY(-5, 20, 220), 220);
});

test("seriesPoints leaves a gap where a score was not measured", () => {
  const trend = [{ communication: 80 }, { communication: null }, { communication: 60 }];
  const points = seriesPoints(trend, "communication", box);
  assert.deepEqual(points.map((p) => p && p.value), [80, null, 60]);
  assert.equal(points[0].x, 0);
  assert.equal(points[2].x, 100);
  assert.equal(points[2].y, 40);
});

test("linePath draws one line, and breaks it at a gap", () => {
  const p = (x, y) => ({ x, y, value: 0 });
  assert.equal(linePath([p(0, 10), p(50, 20), p(100, 30)]), "M0.0 10.0 L50.0 20.0 L100.0 30.0");
  assert.equal(linePath([p(0, 10), null, p(100, 30)]), "M0.0 10.0 M100.0 30.0");
  assert.equal(linePath([null, null]), "");
  assert.equal(linePath([]), "");
});

test("nearestIndex finds the closest interview and stays in range", () => {
  assert.equal(nearestIndex(0, 5, 0, 100), 0);
  assert.equal(nearestIndex(60, 5, 0, 100), 2);
  assert.equal(nearestIndex(90, 5, 0, 100), 4);
  assert.equal(nearestIndex(-50, 5, 0, 100), 0);
  assert.equal(nearestIndex(500, 5, 0, 100), 4);
  assert.equal(nearestIndex(40, 1, 0, 100), 0);
});

test("radar axis 0 points up and the axes go clockwise", () => {
  const up = radarPoint(0, 4, 100, 50, 50, 40);
  assert.ok(Math.abs(up.x - 50) < 1e-9 && Math.abs(up.y - 10) < 1e-9);
  const right = radarPoint(1, 4, 100, 50, 50, 40);
  assert.ok(Math.abs(right.x - 90) < 1e-9 && Math.abs(right.y - 50) < 1e-9);
  const half = radarPoint(2, 4, 50, 50, 50, 40);
  assert.ok(Math.abs(half.x - 50) < 1e-9 && Math.abs(half.y - 70) < 1e-9);
});

test("a missing radar score sits at the centre", () => {
  const point = radarPoint(1, 4, null, 50, 50, 40);
  assert.equal(point.x, 50);
  assert.equal(point.y, 50);
});

test("radarPolygon lists one corner per score", () => {
  assert.equal(radarPolygon([100, 100, 100, 100], 50, 50, 40).split(" ").length, 4);
});

test("shortDate", () => {
  assert.equal(shortDate("2026-11-23T10:00:00Z", "en-GB", "UTC"), "23 Nov");
});

test("ratingShares turn counts into percentages, and are empty with no interviews", () => {
  const shares = ratingShares({ excellent: 1, good: 1, average: 2, needs_improvement: 0, poor: 0 });
  assert.deepEqual(shares.map((s) => s.percent), [25, 25, 50, 0, 0]);
  assert.deepEqual(ratingShares({}), []);
  assert.deepEqual(ratingShares(undefined), []);
});

test("rankingText", () => {
  assert.equal(rankingText({ available: true, percentile: 75, candidates_compared: 5 }), "Your average is higher than 75% of the other 4 candidates.");
  assert.equal(rankingText({ available: false, reason: "Not yet." }), "Not yet.");
  assert.equal(rankingText(undefined), "");
});

test("ordinal numbers", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 50, 75, 100, 101, 111].map(ordinal),
    ["0th", "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "50th", "75th", "100th", "101st", "111th"]);
});

test("toggleSelection adds, removes and stops at the limit", () => {
  assert.deepEqual(toggleSelection([], 5), [5]);
  assert.deepEqual(toggleSelection([5, 6], 5), [6]);
  assert.deepEqual(toggleSelection([1, 2, 3, 4], 9), [1, 2, 3, 4]);
  assert.deepEqual(toggleSelection([1, 2, 3, 4], 2), [1, 3, 4]);
  assert.deepEqual(toggleSelection([1, 2], 3, 2), [1, 2]);
});

test("formatDuration", () => {
  assert.equal(formatDuration(null), "—");
  assert.equal(formatDuration(45), "45 sec");
  assert.equal(formatDuration(720), "12 min");
  assert.equal(formatDuration(3900), "1 h 5 min");
  assert.equal(formatDuration(7200), "2 h 0 min");
});

test("initials", () => {
  assert.equal(initials("Amy Adams"), "AA");
  assert.equal(initials("amy"), "A");
  assert.equal(initials("Mary Jane Watson"), "MJ");
  assert.equal(initials(""), "?");
  assert.equal(initials(undefined), "?");
});

test("weekLabel", () => {
  assert.equal(weekLabel("2026-11-23", "en-GB", "UTC"), "Week of 23 Nov");
});

test("pageRange", () => {
  assert.equal(pageRange(0, 25, 60), "1–25 of 60");
  assert.equal(pageRange(50, 10, 60), "51–60 of 60");
  assert.equal(pageRange(0, 0, 0), "0 of 0");
});

test("compareParams", () => {
  assert.deepEqual(compareParams([3, 7]), { candidates: "3,7" });
  assert.deepEqual(compareParams([3, 7, 9], "hr"), { candidates: "3,7,9", type: "hr" });
});

test("timeAgo", () => {
  const now = new Date("2026-11-28T12:00:00Z").getTime();
  const ago = (seconds) => new Date(now - seconds * 1000).toISOString();
  assert.equal(timeAgo(ago(5), now), "just now");
  assert.equal(timeAgo(ago(120), now), "2 min ago");
  assert.equal(timeAgo(ago(3 * 3600), now), "3 h ago");
  assert.equal(timeAgo(ago(86400), now), "1 day ago");
  assert.equal(timeAgo(ago(3 * 86400), now), "3 days ago");
  assert.equal(timeAgo("2026-11-01T10:00:00Z", now, "en-GB", "UTC"), "1 Nov");
  assert.equal(timeAgo(new Date(now + 60000).toISOString(), now), "just now"); // a clock a little ahead
});

test("parseOptionalInt", () => {
  assert.equal(parseOptionalInt(""), null);
  assert.equal(parseOptionalInt("  "), null);
  assert.equal(parseOptionalInt(null), null);
  assert.equal(parseOptionalInt("30"), 30);
  assert.equal(parseOptionalInt(" 45 "), 45);
  assert.equal(parseOptionalInt("-5"), undefined);
  assert.equal(parseOptionalInt("3.5"), undefined);
  assert.equal(parseOptionalInt("abc"), undefined);
});

test("fieldErrors keeps the first message of each field", () => {
  assert.deepEqual(fieldErrors({ timeout_seconds: ["Too high.", "x"], model: "Bad." }), { timeout_seconds: "Too high.", model: "Bad." });
  assert.deepEqual(fieldErrors(undefined), {});
  assert.deepEqual(fieldErrors("nope"), {});
});

test("countShares scales to the largest count", () => {
  assert.deepEqual(countShares([{ value: 2 }, { value: 4 }, { value: 0 }]).map((r) => r.percent), [50, 100, 0]);
  assert.deepEqual(countShares([{ value: 0 }]).map((r) => r.percent), [0]);
  assert.deepEqual(countShares([]), []);
});

test("connectionMessage", () => {
  assert.match(connectionMessage({ ok: true, model: "m", latency_ms: 420 }), /works.*m.*420 ms/);
  assert.match(connectionMessage({ ok: false, reason: "no_key" }), /No API key/);
  assert.match(connectionMessage({ ok: false, reason: "disabled" }), /switched off/);
  assert.match(connectionMessage({ ok: false, reason: "failed", model: "m", error_kind: "rejected" }), /m failed: Rejected/);
  assert.match(connectionMessage({ ok: false, reason: "failed", model: "m", error_kind: "weird" }), /unknown error/);
});
