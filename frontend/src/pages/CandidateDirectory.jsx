import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Users,
  Filter,
  CheckCircle2,
  FileText,
  Clock,
  Award,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { PageHeading, Badge, SectionTitle, EmptyState, Modal } from "../components/UI";
import { recruiterApi } from "../lib/api";

export default function CandidateDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 15;

  // Selected candidate for detail modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCandidates = () => {
    setLoading(true);
    const params = {
      limit,
      offset: page * limit,
    };
    if (searchQuery.trim()) params.q = searchQuery.trim();
    if (statusFilter !== "all") params.status = statusFilter;

    recruiterApi
      .getCandidates(params)
      .then((res) => {
        setCandidates(res.data?.items || []);
        setTotal(res.data?.total || 0);
      })
      .catch(() => {
        setCandidates([]);
        setTotal(0);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCandidates();
  }, [page, statusFilter]);

  // Handle URL query parameter ?id=...
  useEffect(() => {
    const candidateId = searchParams.get("id");
    if (candidateId) {
      loadCandidateDetail(candidateId);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchCandidates();
  };

  const loadCandidateDetail = (candidateId) => {
    setDetailLoading(true);
    recruiterApi
      .getCandidate(candidateId)
      .then((res) => {
        setSelectedCandidate(res.data);
      })
      .catch(() => {
        setSelectedCandidate(null);
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  const closeDetail = () => {
    setSelectedCandidate(null);
    if (searchParams.get("id")) {
      searchParams.delete("id");
      setSearchParams(searchParams);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeading
        eyebrow="TALENT DISCOVERY"
        title="Candidate Directory"
        description="Search, inspect, and evaluate candidates registered across all mock interview tracks."
      />

      {/* Filter Toolbar */}
      <div className="panel mb-6 p-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row items-center gap-3 justify-between"
        >
          <div className="field-wrap flex-1 w-full sm:max-w-md">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name or email..."
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 outline-none focus:border-indigo-600"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended</option>
            </select>
            <button type="submit" className="btn-primary text-xs h-10 px-4">
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Candidate List Table */}
      <div className="panel mb-6">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle
            title="Candidate Pool"
            subtitle={`Showing ${candidates.length} of ${total} registered candidates`}
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Searching candidate database...
          </div>
        ) : candidates.length > 0 ? (
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
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-semibold text-slate-900">{c.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.email}</div>
                    </td>
                    <td>
                      <Badge variant={c.status === "active" ? "green" : "amber"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td>
                      {c.resume_count > 0 ? (
                        <span className="text-emerald-700 font-medium text-xs flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>{c.resume_count} uploaded</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800 text-xs">
                        {c.interview_count} sessions
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-slate-700 text-xs">
                        {c.average_score !== null ? `${c.average_score}%` : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => loadCandidateDetail(c.id)}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Inspect Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No candidates match your criteria"
            description="Try modifying your search query or removing the status filter."
            action={
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPage(0);
                  fetchCandidates();
                }}
                className="btn-secondary text-xs"
              >
                Clear Filters
              </button>
            }
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Detail Modal / Drawer */}
      {selectedCandidate && (
        <Modal
          isOpen={true}
          onClose={closeDetail}
          title={selectedCandidate.full_name}
          description={`Registered candidate · ${selectedCandidate.email}`}
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Candidate Metadata */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block mb-0.5">Status</span>
                <Badge
                  variant={selectedCandidate.status === "active" ? "green" : "amber"}
                >
                  {selectedCandidate.status}
                </Badge>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Registration</span>
                <span className="text-slate-700 font-medium">
                  {new Date(selectedCandidate.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Resumes */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <FileText size={15} />
                <span>Uploaded Resumes ({selectedCandidate.resumes?.length || 0})</span>
              </h4>
              {selectedCandidate.resumes?.length > 0 ? (
                <div className="space-y-2">
                  {selectedCandidate.resumes.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 border border-slate-200 rounded-lg flex items-center justify-between bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block text-slate-800 truncate">
                          {r.filename}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {(r.file_size / 1024).toFixed(1)} KB ·{" "}
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge variant="blue">PDF Document</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic">
                  Candidate has not uploaded a resume yet.
                </p>
              )}
            </div>

            {/* Interviews */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Clock size={15} />
                <span>
                  Interview Sessions ({selectedCandidate.interviews?.length || 0})
                </span>
              </h4>
              {selectedCandidate.interviews?.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedCandidate.interviews.map((iv) => (
                    <div
                      key={iv.id}
                      className="p-3 border border-slate-200 rounded-lg bg-white"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-800">
                          {iv.category} Track
                        </span>
                        {iv.score !== null && (
                          <Badge variant="green">{iv.score}% Score</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2">
                        Difficulty: {iv.difficulty} · Duration:{" "}
                        {Math.floor(iv.duration_seconds / 60)}m{" "}
                        {iv.duration_seconds % 60}s · {iv.question_count} questions
                      </div>
                      {iv.responses?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Captured Answers Sample
                          </span>
                          {iv.responses.slice(0, 2).map((ans, idx) => (
                            <div key={idx} className="bg-slate-50 p-2 rounded text-slate-700">
                              <p className="font-semibold text-slate-800 mb-0.5">
                                Q: {ans.question}
                              </p>
                              <p className="text-slate-600 truncate">
                                A: {ans.answer || "(No response recorded)"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic">
                  Candidate has not completed any mock interviews yet.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button onClick={closeDetail} className="btn-secondary text-xs">
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

