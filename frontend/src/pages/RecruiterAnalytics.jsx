import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import CandidatesTab from "../components/recruiter/CandidatesTab";
import CompareTab from "../components/recruiter/CompareTab";
import OverviewTab from "../components/recruiter/OverviewTab";
import SessionsTab from "../components/recruiter/SessionsTab";
import { COMPARE_MAX, toggleSelection } from "../utils/analytics";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "candidates", label: "Candidates" },
  { key: "compare", label: "Compare" },
  { key: "sessions", label: "Sessions" },
];

export default function RecruiterAnalytics() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some((t) => t.key === requested) ? requested : "overview";
  const [selected, setSelected] = useState([]); // candidate ids ticked for comparison
  const [sessionStatus, setSessionStatus] = useState("");
  const [attempt, setAttempt] = useState(0);

  const openTab = (key, status = "") => {
    setSessionStatus(status);
    setParams({ tab: key });
  };
  const retry = () => setAttempt((a) => a + 1);
  const toggle = (id) => setSelected((current) => toggleSelection(current, id));

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      <Navbar />
      <main className="relative mx-auto max-w-6xl space-y-6 px-6 py-10">
        <header className="animate-fade-up">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Candidate analytics</h1>
          <p className="mt-2 max-w-2xl text-white/60">
            Results of the interviews candidates took on your templates: who is doing well, how they compare, and what is happening right now.
          </p>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Analytics sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls="analytics-panel"
                onClick={() => openTab(t.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
              >
                {t.label}
                {t.key === "compare" && selected.length > 0 && <span className="ml-2 rounded-full bg-white/15 px-1.5 text-xs">{selected.length}/{COMPARE_MAX}</span>}
              </button>
            ))}
          </div>
        </header>

        <div id="analytics-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "overview" && <OverviewTab onOpenTab={openTab} attempt={attempt} onRetry={retry} />}
          {tab === "candidates" && (
            <CandidatesTab selected={selected} onToggle={toggle} onClear={() => setSelected([])} onCompare={() => openTab("compare")} attempt={attempt} onRetry={retry} />
          )}
          {tab === "compare" && (
            <CompareTab selected={selected} onToggle={toggle} onClear={() => setSelected([])} onPick={() => openTab("candidates")} attempt={attempt} onRetry={retry} />
          )}
          {tab === "sessions" && <SessionsTab initialStatus={sessionStatus} attempt={attempt} onRetry={retry} />}
        </div>
      </main>
    </div>
  );
}
