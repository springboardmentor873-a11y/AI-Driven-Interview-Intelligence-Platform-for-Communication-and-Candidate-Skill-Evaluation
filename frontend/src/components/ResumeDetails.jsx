import Button from "./ui/Button";

const SOURCE_LABELS = {
  ai: { text: "Analysed by AI", style: "bg-brand-500/20 text-brand-400" },
  basic: { text: "Basic scan (AI not used)", style: "bg-amber-500/15 text-amber-300" },
  "": { text: "Not analysed yet", style: "bg-white/10 text-white/60" },
};

function Chips({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-white/70">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-sm">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Entries({ title, items, heading, sub }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-white/70">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="rounded-xl bg-white/5 px-4 py-3 text-sm">
            <p className="font-medium">{heading(item)}</p>
            {sub(item) && <p className="mt-0.5 text-white/60">{sub(item)}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const join = (parts, sep) => parts.filter(Boolean).join(sep);

export default function ResumeDetails({ resume, busy, onReanalyse }) {
  const source = SOURCE_LABELS[resume.parse_source] || SOURCE_LABELS[""];
  const hasResults =
    resume.summary ||
    resume.skills?.length ||
    resume.technologies?.length ||
    resume.experience?.length ||
    resume.education?.length;

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${source.style}`}>
          {source.text}
        </span>
        <Button variant="ghost" className="!px-4 !py-2 text-sm" onClick={onReanalyse} disabled={busy}>
          {busy ? "Analysing..." : "Re-analyse"}
        </Button>
      </div>

      {!resume.has_text && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          We could not read any text from this PDF. It may be a scanned image. Upload a
          text-based PDF to get skills and interview questions from it.
        </p>
      )}

      {resume.has_text && !hasResults && (
        <p className="mt-4 text-sm text-white/50">
          Nothing was found yet. Try Re-analyse.
        </p>
      )}

      {resume.summary && <p className="mt-4 text-sm leading-relaxed text-white/80">{resume.summary}</p>}
      <Chips title="Skills" items={resume.skills} />
      <Chips title="Technologies" items={resume.technologies} />
      <Entries
        title="Experience and projects"
        items={resume.experience}
        heading={(e) => join([e.role, e.company], " at ") || "Untitled"}
        sub={(e) => join([e.duration, e.description], " · ")}
      />
      <Entries
        title="Education"
        items={resume.education}
        heading={(e) => e.degree || "Untitled"}
        sub={(e) => join([e.institution, e.year], " · ")}
      />
    </div>
  );
}
