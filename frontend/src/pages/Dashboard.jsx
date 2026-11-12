import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PlayCircle,
  FileText,
  Clock,
  Award,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { PageHeading, StatCard, SectionTitle, Badge, EmptyState } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { candidateApi } from "../lib/api";

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      candidateApi.getStats().catch(() => ({
        data: {
          interviews_completed: 0,
          resumes_uploaded: 0,
          total_practice_time_seconds: 0,
          average_score: null,
          latest_interview: null,
        },
      })),
      candidateApi.getInterviews(5, 0).catch(() => ({ data: [] })),
    ])
      .then(([statsRes, interviewsRes]) => {
        setStats(statsRes.data);
        setRecentInterviews(interviewsRes.data || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const interviewsCompleted = stats?.interviews_completed ?? 0;
  const resumesUploaded = stats?.resumes_uploaded ?? 0;
  const totalPracticeTimeSeconds = stats?.total_practice_time_seconds ?? 0;
  const averageScore = stats?.average_score;

  const formatDuration = (seconds) => {
    if (!seconds) return "0 min";
    const mins = Math.floor(seconds / 60);
    return mins > 60 ? `${(mins / 60).toFixed(1)} hrs` : `${mins} min`;
  };

  const isNewCandidate = interviewsCompleted === 0 && resumesUploaded === 0;

  return (
    <div>
      <PageHeading
        eyebrow="CANDIDATE WORKSPACE"
        title={`Welcome, ${(user?.full_name || "Candidate").split(" ")[0]}`}
        description="Your structured interview preparation environment. Practice questions, track progress, and build interview confidence."
        action={
          <Link to="/app/interview" className="btn-brand text-xs">
            <PlayCircle size={15} />
            <span>Start Practice Session</span>
          </Link>
        }
      />

      {/* First-Time Onboarding Experience for New Users */}
      {isNewCandidate && !loading && (
        <div className="panel mb-7 border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 p-6">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={14} />
            <span>Getting Started Checklist</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
            Complete your preparation foundation
          </h2>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed mb-6">
            Take these initial steps to set up your profile, submit your resume,
            and begin your first mock interview practice.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400">Step 1</span>
                <Badge variant="green" icon={CheckCircle2}>
                  Active
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                Account Registration
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                Your profile is active as {user?.email}.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">Step 2</span>
                  <Badge variant="amber">Recommended</Badge>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Upload Resume
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Upload your PDF resume to identify relevant interview skills.
                </p>
              </div>
              <Link to="/app/resume" className="btn-secondary text-xs w-full justify-between">
                <span>Upload Resume</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">Step 3</span>
                  <Badge variant="blue">Core</Badge>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  First Mock Interview
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Select a category (Technical, Behavioural, HR) and practice responses.
                </p>
              </div>
              <Link to="/app/interview" className="btn-primary text-xs w-full justify-between">
                <span>Begin Practice</span>
                <PlayCircle size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="Interviews Completed"
          value={loading ? "..." : interviewsCompleted}
          helper={
            interviewsCompleted > 0
              ? "Completed mock practice sessions"
              : "No sessions recorded yet"
          }
          icon={PlayCircle}
          tone="purple"
        />
        <StatCard
          label="Total Practice Time"
          value={loading ? "..." : formatDuration(totalPracticeTimeSeconds)}
          helper="Time spent answering questions"
          icon={Clock}
          tone="blue"
        />
        <StatCard
          label="Resumes Uploaded"
          value={loading ? "..." : resumesUploaded}
          helper={resumesUploaded > 0 ? "Saved in profile" : "PDF resume pending"}
          icon={FileText}
          tone="slate"
        />
        <StatCard
          label="Average Score"
          value={
            loading
              ? "..."
              : averageScore !== null
              ? `${averageScore}%`
              : "—"
          }
          helper={
            averageScore !== null
              ? "Across completed assessments"
              : "Calculated upon assessment"
          }
          icon={Award}
          tone="green"
        />
      </div>

      {/* Recent Interviews or Empty State */}
      <div className="panel mb-7">
        <SectionTitle
          title="Recent Interview Sessions"
          subtitle={
            interviewsCompleted > 0
              ? "Your latest mock interview recordings and summaries"
              : "Your assessment history will appear here once you complete a practice session"
          }
          action={
            interviewsCompleted > 0 && (
              <Link
                to="/app/history"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View all history</span>
                <ChevronRight size={14} />
              </Link>
            )
          }
        />

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading session records...
          </div>
        ) : recentInterviews.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session Track</th>
                  <th>Difficulty</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Score</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentInterviews.map((iv) => (
                  <tr key={iv.id}>
                    <td>
                      <div className="font-semibold text-slate-900">
                        {iv.category} Track
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {iv.id.slice(0, 8)}
                      </div>
                    </td>
                    <td>
                      <Badge variant="slate">{iv.difficulty}</Badge>
                    </td>
                    <td>{iv.question_count} questions</td>
                    <td>{formatDuration(iv.duration_seconds)}</td>
                    <td>
                      {iv.score !== null ? (
                        <span className="font-bold text-slate-900">{iv.score}%</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Unscored</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-500">
                      {new Date(iv.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/app/report?id=${iv.id}`}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        View Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="You haven't completed an interview yet"
            description="Start your first mock interview session to practice role-relevant questions, record structured responses, and view your summary report."
            action={
              <Link to="/app/interview" className="btn-primary text-xs">
                <PlayCircle size={15} />
                <span>Start Your First Interview</span>
              </Link>
            }
          />
        )}
      </div>

      {/* Practice Tracks Overview */}
      <div className="panel">
        <SectionTitle
          title="Available Practice Tracks"
          subtitle="Curated question tracks designed for structured candidate preparation"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
            <Badge variant="blue" className="mb-2">
              Engineering
            </Badge>
            <h4 className="font-bold text-sm text-slate-900 mb-1">
              Technical Engineering
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Core software engineering, architecture tradeoffs, query optimization, and resilient API design.
            </p>
            <Link to="/app/interview?track=Technical" className="text-xs font-semibold text-indigo-600 hover:underline">
              Practice Technical &rarr;
            </Link>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
            <Badge variant="purple" className="mb-2">
              Soft Skills
            </Badge>
            <h4 className="font-bold text-sm text-slate-900 mb-1">
              Behavioural & Leadership
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Team collaboration, conflict resolution, technical ownership, and project deliverables.
            </p>
            <Link to="/app/interview?track=Behavioural" className="text-xs font-semibold text-indigo-600 hover:underline">
              Practice Behavioural &rarr;
            </Link>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
            <Badge variant="slate" className="mb-2">
              Culture
            </Badge>
            <h4 className="font-bold text-sm text-slate-900 mb-1">
              HR & Culture Alignment
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Professional background, career motivations, strengths, and situational communication.
            </p>
            <Link to="/app/interview?track=HR" className="text-xs font-semibold text-indigo-600 hover:underline">
              Practice HR &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
