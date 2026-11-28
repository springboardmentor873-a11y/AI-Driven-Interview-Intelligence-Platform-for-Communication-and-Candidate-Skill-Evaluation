import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import ActivityTab from "../components/admin/ActivityTab";
import AITab from "../components/admin/AITab";
import PlatformTab from "../components/admin/PlatformTab";

const TABS = [
  { key: "overview", label: "Platform overview" },
  { key: "activity", label: "Activity" },
  { key: "ai", label: "AI settings and usage" },
];

export default function AdminAnalytics() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some((t) => t.key === requested) ? requested : "overview";
  const [attempt, setAttempt] = useState(0);
  const openTab = (key) => setParams({ tab: key });
  const retry = () => setAttempt((a) => a + 1);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      <Navbar />
      <main className="relative mx-auto max-w-6xl space-y-6 px-6 py-10">
        <header className="animate-fade-up">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Platform analytics</h1>
          <p className="mt-2 max-w-2xl text-white/60">How the whole platform is used, what is happening on it, and how the AI service is set up and doing.</p>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Platform sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls="platform-panel"
                onClick={() => openTab(t.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div id="platform-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "overview" && <PlatformTab onOpenTab={openTab} attempt={attempt} onRetry={retry} />}
          {tab === "activity" && <ActivityTab attempt={attempt} onRetry={retry} />}
          {tab === "ai" && <AITab attempt={attempt} onRetry={retry} />}
        </div>
      </main>
    </div>
  );
}
