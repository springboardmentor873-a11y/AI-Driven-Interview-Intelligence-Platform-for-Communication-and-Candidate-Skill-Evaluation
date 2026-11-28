// Pure helpers for the analytics page: scaling, chart paths and the words and colours shown to the candidate.
// Nothing here touches React or the browser, so it can be tested with `npm test`.

// The four scores from the SRS, then the overall score. Colours are different enough to tell apart
// without relying on the legend alone (the legend also names each line).
export const SERIES = [
  { key: "overall", label: "Overall", color: "#f472b6" },
  { key: "communication", label: "Communication", color: "#a78bfa" },
  { key: "confidence", label: "Confidence", color: "#fbbf24" },
  { key: "technical_relevance", label: "Technical relevance", color: "#34d399" },
  { key: "professionalism", label: "Professionalism", color: "#38bdf8" },
];

// The same lines the server uses to call an area weak (see docs/api.md, Analytics)
export const WEAK_BELOW = 60;
export const WATCH_BELOW = 75;

export const TYPE_LABELS = { hr: "HR", technical: "Technical", behavioral: "Behavioral", aptitude: "Aptitude" };

export const STATUSES = {
  scheduled: { label: "Scheduled", style: "bg-sky-500/15 text-sky-300" },
  in_progress: { label: "In progress", style: "bg-emerald-500/15 text-emerald-300" },
  completed: { label: "Completed", style: "bg-white/10 text-white/70" },
  cancelled: { label: "Cancelled", style: "bg-red-500/15 text-red-300" },
};

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;
// One colour per compared candidate, in the order they were picked
export const COMPARE_COLORS = ["#f472b6", "#38bdf8", "#fbbf24", "#34d399"];

export const DIRECTIONS = {
  improving: { label: "Improving", arrow: "↑", tone: "text-emerald-300" },
  steady: { label: "Steady", arrow: "→", tone: "text-white/60" },
  declining: { label: "Declining", arrow: "↓", tone: "text-red-300" },
  not_enough_data: { label: "Needs 3+ interviews", arrow: "·", tone: "text-white/40" },
};

export const RISKS = {
  high: { label: "Needs work", style: "bg-red-500/15 text-red-300" },
  medium: { label: "Keep an eye on it", style: "bg-amber-500/15 text-amber-300" },
};

export const RATING_STYLES = {
  excellent: { label: "Excellent", bar: "bg-emerald-400", text: "text-emerald-300" },
  good: { label: "Good", bar: "bg-teal-400", text: "text-teal-300" },
  average: { label: "Average", bar: "bg-amber-400", text: "text-amber-300" },
  needs_improvement: { label: "Needs improvement", bar: "bg-orange-400", text: "text-orange-300" },
  poor: { label: "Poor", bar: "bg-red-400", text: "text-red-300" },
};

/** A score for display: no trailing zero, and a dash when there is none. */
export function formatScore(value) {
  return value === null || value === undefined ? "—" : String(Number(value.toFixed(1)));
}

/** A change in points with its sign, using a real minus sign. */
export function formatChange(value) {
  if (value === null || value === undefined) return "—";
  const text = String(Math.abs(Number(value.toFixed(1))));
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : "0";
}

/** The colour class for a bar or number, using the same 60 and 75 lines as the weak-area outlook. */
export function scoreTone(value) {
  if (value === null || value === undefined) return { bar: "bg-white/20", text: "text-white/40" };
  if (value < WEAK_BELOW) return { bar: "bg-red-400", text: "text-red-300" };
  if (value < WATCH_BELOW) return { bar: "bg-amber-400", text: "text-amber-300" };
  return { bar: "bg-emerald-400", text: "text-emerald-300" };
}

/** "23 Nov" for a date. `locale` and `timeZone` are only given by tests. */
export function shortDate(iso, locale, timeZone) {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone });
}

// --- line chart ---------------------------------------------------------------

/** X position of point `index` of `count`, spread between `left` and `right` (a single point sits in the middle). */
export function scaleX(index, count, left, right) {
  return count <= 1 ? (left + right) / 2 : left + (index / (count - 1)) * (right - left);
}

/** Y position of a 0-100 score: 100 at `top`, 0 at `bottom`. */
export function scaleY(value, top, bottom) {
  return bottom - (Math.max(0, Math.min(100, value)) / 100) * (bottom - top);
}

/** One entry per interview for a series: `{x, y, value}`, or null where that score was not measured. */
export function seriesPoints(trend, key, box) {
  return trend.map((row, index) => {
    const value = row[key];
    if (value === null || value === undefined) return null;
    return { x: scaleX(index, trend.length, box.left, box.right), y: scaleY(value, box.top, box.bottom), value };
  });
}

/** An SVG path through the points. A missing score breaks the line instead of being drawn as 0. */
export function linePath(points) {
  let path = "";
  let drawing = false;
  for (const point of points) {
    if (!point) {
      drawing = false;
      continue;
    }
    path += `${drawing ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)} `;
    drawing = true;
  }
  return path.trim();
}

/** Which interview is nearest to an x position (used for hovering and arrow keys). */
export function nearestIndex(x, count, left, right) {
  if (count <= 1) return 0;
  const index = Math.round(((x - left) / (right - left)) * (count - 1));
  return Math.max(0, Math.min(count - 1, index));
}

// --- radar chart --------------------------------------------------------------

/** A corner of the radar for axis `index` of `count`. Axis 0 points straight up. */
export function radarPoint(index, count, value, centerX, centerY, radius) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  const length = (Math.max(0, Math.min(100, value ?? 0)) / 100) * radius;
  return { x: centerX + length * Math.cos(angle), y: centerY + length * Math.sin(angle) };
}

/** The `points` attribute of a polygon through all axes. A missing score counts as 0 here. */
export function radarPolygon(values, centerX, centerY, radius) {
  return values
    .map((value, index) => radarPoint(index, values.length, value, centerX, centerY, radius))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

// --- small things the page needs ------------------------------------------------

/** Widths (percent) of the rating bar. Empty when there is nothing to show. */
export function ratingShares(counts) {
  const entries = Object.keys(RATING_STYLES).map((key) => ({ key, count: counts?.[key] || 0 }));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  return total ? entries.map((entry) => ({ ...entry, percent: (entry.count / total) * 100 })) : [];
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd". */
export function ordinal(number) {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${number}th`;
  return `${number}${{ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th"}`;
}

/** A sentence for the ranking card. */
export function rankingText(ranking) {
  if (!ranking?.available) return ranking?.reason || "";
  const higher = ranking.percentile;
  return `Your average is higher than ${higher}% of the other ${ranking.candidates_compared - 1} candidates.`;
}

// --- recruiter pages ------------------------------------------------------------

/** Add or remove a candidate id from the comparison list. A fifth pick is ignored. */
export function toggleSelection(selected, id, max = COMPARE_MAX) {
  if (selected.includes(id)) return selected.filter((item) => item !== id);
  return selected.length >= max ? selected : [...selected, id];
}

/** "45 sec", "12 min" or "1 h 5 min". */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Up to two capital letters from a name. */
export function initials(name) {
  const letters = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase());
  return letters.join("") || "?";
}

/** "Week of 17 Nov". `locale` and `timeZone` are only given by tests. */
export function weekLabel(iso, locale, timeZone) {
  return `Week of ${new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone })}`;
}

/** "1–25 of 60" for a page of a list. */
export function pageRange(offset, shown, count) {
  return shown ? `${offset + 1}–${offset + shown} of ${count}` : "0 of 0";
}

/** The `?` part of the comparison request. */
export function compareParams(ids, type) {
  return { candidates: ids.join(","), ...(type ? { type } : {}) };
}
