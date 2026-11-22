import Button from "./ui/Button";

// Learning resources are topics to search for, not saved links: the AI can invent web addresses
// that do not exist, so each topic is turned into a search link here instead.
const searchUrl = (resource) =>
  resource.type === "video"
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(resource.search)}`
    : `https://www.google.com/search?q=${encodeURIComponent(resource.search)}`;

const TYPE_NAMES = { article: "Article", video: "Video", course: "Course", practice: "Practice" };

function List({ title, items, tone, numbered = false }) {
  if (!items?.length) return null;
  const Tag = numbered ? "ol" : "ul";
  return (
    <div className="rounded-2xl border border-white/10 bg-surface px-5 py-4">
      <h3 className={`text-sm font-bold uppercase tracking-wide ${tone}`}>{title}</h3>
      <Tag className={`mt-2 space-y-2 text-sm leading-relaxed text-white/80 ${numbered ? "list-decimal pl-5" : "list-disc pl-5"}`}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </Tag>
    </div>
  );
}

/**
 * The written feedback: summary, strengths, weaknesses, suggestions, practice and resources.
 * state: idle | running | failed | done. onWrite writes (or rewrites) it.
 */
export default function FeedbackPanel({ feedback, state, canWrite, onWrite }) {
  if (state === "running") return <p className="mt-6 text-sm text-white/60">Writing your feedback...</p>;
  if (!feedback) {
    if (state === "failed") {
      return (
        <p className="mt-6 text-sm text-red-300">
          Could not write your feedback. <button type="button" onClick={onWrite} className="font-semibold underline">Try again</button>
        </p>
      );
    }
    return canWrite ? (
      <div className="mt-6">
        <Button variant="solid" onClick={onWrite}>Write my feedback</Button>
      </div>
    ) : null;
  }

  return (
    <section className="mt-6 space-y-4" aria-label="Feedback">
      <div>
        <h2 className="text-lg font-bold">Your feedback</h2>
        {feedback.summary && <p className="mt-2 leading-relaxed text-white/80">{feedback.summary}</p>}
        {feedback.source === "basic" && (
          <p className="mt-2 text-xs text-white/40">
            Written from your numbers by simple rules because the AI was not available.{" "}
            <button type="button" onClick={onWrite} className="font-semibold underline">Try the AI feedback again</button>
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <List title="Strengths" items={feedback.strengths} tone="text-green-300" />
        <List title="To improve" items={feedback.weaknesses} tone="text-amber-300" />
      </div>
      <List title="What to do next time" items={feedback.suggestions} tone="text-white/70" numbered />
      <List title="Practice plan" items={feedback.practice_recommendations} tone="text-white/70" />
      {feedback.learning_resources?.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-surface px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-white/70">Learn more</h3>
          <ul className="mt-2 space-y-3 text-sm">
            {feedback.learning_resources.map((r, i) => (
              <li key={i}>
                <a href={searchUrl(r)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-400 underline">
                  {r.title}
                </a>
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">{TYPE_NAMES[r.type] || "Article"}</span>
                {r.why && <p className="mt-0.5 text-white/60">{r.why}</p>}
                <p className="text-xs text-white/30">Searches for: {r.search}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-white/30">These are topics to look up. The links open a search, so you choose which result to trust.</p>
        </div>
      )}
    </section>
  );
}
