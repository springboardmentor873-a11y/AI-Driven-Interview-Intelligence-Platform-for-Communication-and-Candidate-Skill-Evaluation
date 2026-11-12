import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Clock,
  Award,
  PlayCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";
import { PageHeading, StatCard, SectionTitle, Badge, EmptyState, ProgressBar } from "../components/UI";
import { candidateApi } from "../lib/api";

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      candidateApi.getStats().catch(() => ({ data: null })),
      candidateApi.getInterviews(100, 0).catch(() => ({ data: [] })),
    ])
      .then(([statsRes, interviewsRes]) => {
        setStats(statsRes.data);
        setInterviews(interviewsRes.data || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalSessions = interviews.length;
  const totalSeconds = interviews.reduce((acc, i) => acc + (i.duration_seconds || 0), 0);
  const totalQuestions = interviews.reduce((acc, i) => acc + (i.question_count || 0), 0);

  // Group by category track
  const trackCounts = interviews.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  const formatDuration = (seconds) => {
    if (!seconds) return "0 min";
    const mins = Math.floor(seconds / 60);
    return mins > 60 ? `${(mins / 60).toFixed(1)} hrs` : `${mins} min`;
  };

  return (
    <div>
      <PageHeading
        eyebrow="GROWTH METRICS"
        title="Personal Performance Analytics"
        description="Review metrics derived from your actual completed mock sessions to understand your pacing and preparation breadth."
      />

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">
          Calculating performance analytics...
        </div>
      ) : totalSessions > 0 ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            <StatCard
              label="Completed Sessions"
              value={totalSessions}
              helper="Total mock interviews recorded"
              icon={PlayCircle}
              tone="purple"
            />
            <StatCard
              label="Cumulative Practice"
              value={formatDuration(totalSeconds)}
              helper="Active interview time"
              icon={Clock}
              tone="blue"
            />
            <StatCard
              label="Prompts Answered"
              value={totalQuestions}
              helper="Structured responses saved"
              icon={CheckCircle2}
              tone="green"
            />
            <StatCard
              label="Average Session Duration"
              value={
                totalSessions > 0
                  ? `${Math.round(totalSeconds / totalSessions / 60)} min`
                  : "0 min"
              }
              helper="Mean duration per interview"
              icon={BarChart3}
              tone="slate"
            />
          </div>

          {/* Track Breakdown and Consistency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
            <div className="panel">
              <SectionTitle
                title="Practice Track Coverage"
                subtitle="Distribution of completed interviews across preparation tracks"
              />

              <div className="space-y-4 mt-4">
                {["Technical", "Behavioural", "HR", "Aptitude"].map((trackName) => {
                  const count = trackCounts[trackName] || 0;
                  const pct = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
                  return (
                    <div key={trackName}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-800">
                          {trackName} Track
                        </span>
                        <span className="text-slate-500">
                          {count} session(s) · {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel">
              <SectionTitle
                title="Recent Practice Frequency"
                subtitle="Log of your recent interview practice milestones"
              />

              <div className="space-y-3 mt-4">
                {interviews.slice(0, 5).map((iv) => (
                  <div
                    key={iv.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-slate-800 block">
                        {iv.category} ({iv.difficulty})
                      </strong>
                      <span className="text-slate-500 text-[11px]">
                        {iv.question_count} questions · {formatDuration(iv.duration_seconds)}
                      </span>
                    </div>
                    <span className="text-slate-500">
                      {new Date(iv.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transparent Metric Guidance */}
          <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1 leading-relaxed">
            <strong className="text-slate-800 block">Performance Data Integrity</strong>
            All statistics shown are derived strictly from your verified session history in the database. SmartHire AI does not fabricate artificial scores, streaks, or simulated progress metrics.
          </div>
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Performance analytics will appear here"
          description="You haven't completed an interview session yet. As soon as you complete your first mock interview, your practice metrics, pacing, and track coverage will populate automatically."
          action={
            <Link to="/app/interview" className="btn-primary text-xs">
              <PlayCircle size={14} />
              <span>Start Your First Interview</span>
            </Link>
          }
        />
      )}
    </div>
  );
}
