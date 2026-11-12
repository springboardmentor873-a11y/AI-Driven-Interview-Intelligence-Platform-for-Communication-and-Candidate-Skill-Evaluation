import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Search,
  Filter,
  Clock,
  PlayCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { PageHeading, Badge, SectionTitle, EmptyState } from "../components/UI";
import { candidateApi } from "../lib/api";

export default function History() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchInterviews = () => {
    setLoading(true);
    candidateApi
      .getInterviews(100, 0)
      .then((res) => {
        setInterviews(res.data || []);
      })
      .catch(() => {
        setInterviews([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const filteredInterviews = interviews.filter((iv) => {
    const matchesCategory =
      categoryFilter === "all" || iv.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesQuery =
      !searchQuery.trim() ||
      iv.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (iv.difficulty && iv.difficulty.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const formatDuration = (seconds) => {
    if (!seconds) return "0 min";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div>
      <PageHeading
        eyebrow="PREPARATION LOG"
        title="Interview History"
        description="Revisit your completed practice sessions, review recorded answers, and monitor your consistency over time."
        action={
          <Link to="/app/interview" className="btn-brand text-xs">
            <PlayCircle size={15} />
            <span>New Practice Session</span>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="panel mb-6 p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="field-wrap flex-1 w-full sm:max-w-md">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by track, difficulty, or session ID..."
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 outline-none focus:border-indigo-600"
            >
              <option value="all">All Tracks</option>
              <option value="technical">Technical</option>
              <option value="behavioural">Behavioural</option>
              <option value="hr">HR</option>
              <option value="aptitude">Aptitude</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="panel mb-6">
        <SectionTitle
          title="Completed Interview Sessions"
          subtitle={
            interviews.length > 0
              ? `Displaying ${filteredInterviews.length} of ${interviews.length} session(s)`
              : "No sessions recorded yet"
          }
        />

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Loading your interview records...
          </div>
        ) : filteredInterviews.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Track</th>
                  <th>Difficulty</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.map((iv) => (
                  <tr key={iv.id}>
                    <td>
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {iv.id.slice(0, 8)}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-900">
                        {iv.category}
                      </span>
                    </td>
                    <td>
                      <Badge variant="slate">{iv.difficulty}</Badge>
                    </td>
                    <td>{iv.question_count} prompts</td>
                    <td>{formatDuration(iv.duration_seconds)}</td>
                    <td>
                      <Badge variant="green">{iv.status || "Completed"}</Badge>
                    </td>
                    <td className="text-xs text-slate-500">
                      {new Date(iv.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/app/report?id=${iv.id}`}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        <span>View Report</span>
                        <ChevronRight size={13} />
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
            title={
              interviews.length === 0
                ? "You haven't completed an interview yet"
                : "No sessions match your search filter"
            }
            description={
              interviews.length === 0
                ? "Configure and complete your first mock interview. Your responses and performance metrics will be preserved here."
                : "Try adjusting your track filter or clearing your search term."
            }
            action={
              interviews.length === 0 ? (
                <Link to="/app/interview" className="btn-primary text-xs">
                  <PlayCircle size={14} />
                  <span>Start Your First Interview</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                  }}
                  className="btn-secondary text-xs"
                >
                  Clear Filters
                </button>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
