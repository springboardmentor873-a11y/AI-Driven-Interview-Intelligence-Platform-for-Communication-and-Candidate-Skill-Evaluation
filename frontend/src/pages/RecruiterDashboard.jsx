import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  Award,
  Clock,
  ArrowRight,
  Search,
  FileText,
  UserCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { PageHeading, StatCard, SectionTitle, Badge, EmptyState } from "../components/UI";
import { recruiterApi } from "../lib/api";

export default function RecruiterDashboard() {
  const [stats, setStats] = useState(null);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      recruiterApi.getStats().catch(() => ({ data: { total_candidates: 0, active_candidates: 0, total_interviews: 0, average_candidate_score: null } })),
      recruiterApi.getCandidates({ limit: 5 }).catch(() => ({ data: { items: [], total: 0 } })),
    ])
      .then(([statsRes, candidatesRes]) => {
        setStats(statsRes.data);
        setRecentCandidates(candidatesRes.data?.items || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeading
        eyebrow="RECRUITMENT CONSOLE"
        title="Candidate Pipeline & Talent Review"
        description="Monitor candidate pool activity, inspect completed technical assessments, and review submitted candidate resumes."
        action={
          <Link to="/recruiter/candidates" className="btn-primary text-xs">
            <Search size={14} />
            <span>Search Candidates</span>
          </Link>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="Total Candidate Pool"
          value={loading ? "..." : stats?.total_candidates ?? 0}
          helper="Registered platform candidates"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Active Candidates"
          value={loading ? "..." : stats?.active_candidates ?? 0}
          helper="Verified & active status"
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          label="Interviews Conducted"
          value={loading ? "..." : stats?.total_interviews ?? 0}
          helper="Total completed mock sessions"
          icon={Clock}
          tone="purple"
        />
        <StatCard
          label="Pool Average Score"
          value={
            loading
              ? "..."
              : stats?.average_candidate_score
              ? `${stats.average_candidate_score}%`
              : "N/A"
          }
          helper="Across scored assessments"
          icon={Award}
          tone="slate"
        />
      </div>

      {/* Candidate Pipeline */}
      <div className="panel mb-7">
        <SectionTitle
          title="Recent Candidate Activity"
          subtitle="Real-time candidates registered in your talent pipeline"
          action={
            <Link
              to="/recruiter/candidates"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View all candidates</span>
              <ArrowRight size={13} />
            </Link>
          }
        />

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading candidate records...
          </div>
        ) : recentCandidates.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Resume</th>
                  <th>Interviews</th>
                  <th>Avg. Score</th>
                  <th>Registered</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-semibold text-slate-900">{c.full_name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td>
                      <Badge variant={c.status === "active" ? "green" : "amber"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td>
                      <span className="text-xs text-slate-700">
                        {c.resume_count > 0 ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            <span>Uploaded</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800">
                        {c.interview_count}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-slate-700">
                        {c.average_score !== null ? `${c.average_score}%` : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/recruiter/candidates?id=${c.id}`}
                        className="btn-secondary text-xs py-1 px-2.5"
                      >
                        <span>Inspect</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No candidates registered yet"
            description="When candidates sign up and use SmartHire AI, their profiles, resumes, and interview evaluations will appear here."
          />
        )}
      </div>

      {/* Recruitment Guidance Note */}
      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
        <Briefcase className="text-slate-500 flex-shrink-0 mt-0.5" size={16} />
        <div>
          <strong className="text-slate-800 block mb-0.5">Recruiter Evaluation Workflow</strong>
          Candidates practice technical, behavioural, and domain interviews. You can inspect
          their submitted question responses, time taken per question, and attached resumes directly
          from the Candidate Directory.
        </div>
      </div>
    </div>
  );
}

