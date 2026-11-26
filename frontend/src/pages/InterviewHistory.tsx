
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  History,
  Trophy,
  Clock3,
  FileText,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getInterviewHistory,
  type InterviewHistoryItem,
} from "../services/interviewService";

const InterviewHistory = () => {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getInterviewHistory();
      setInterviews(result.interviews);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to load interview history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const totalInterviews = interviews.length;

  const completedInterviews = interviews.filter(
    (item) => item.status === "completed"
  );

  const totalQuestionsAnswered = interviews.reduce(
    (total, item) => total + item.submitted_count,
    0
  );

  const stats = [
    {
      title: "Total Interviews",
      value: String(totalInterviews),
      icon: FileText,
    },
    {
      title: "Completed Interviews",
      value: String(completedInterviews.length),
      icon: Trophy,
    },
    {
      title: "Questions Answered",
      value: String(totalQuestionsAnswered),
      icon: Clock3,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b18] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/interviews")}
          className="mb-8 flex items-center gap-2 text-sm text-gray-400 transition hover:text-cyan-300"
        >
          <ArrowLeft size={18} />
          Back to Interviews
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/10 px-4 py-2 text-sm text-purple-300">
            <History size={16} />
            Your Progress
          </div>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Interview History
          </h1>

          <p className="mt-3 text-gray-400">
            Review your previous practice sessions and track your progress.
          </p>
        </motion.div>

        <section className="mt-9 grid gap-5 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
            >
              <stat.icon className="mb-4 text-cyan-300" size={27} />
              <p className="text-sm text-gray-400">{stat.title}</p>
              <h2 className="mt-2 text-3xl font-bold">{stat.value}</h2>
            </motion.div>
          ))}
        </section>

        <section className="mt-9 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Previous Sessions</h2>
              <p className="mt-2 text-sm text-gray-400">
                Your interview sessions and submitted answers.
              </p>
            </div>

            <button
              onClick={loadHistory}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-14 text-center text-gray-400">
              Loading your interview history...
            </p>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadHistory}
                className="mt-4 rounded-xl bg-cyan-600 px-5 py-2 font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : interviews.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-14 text-center">
              <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">
                <History size={35} className="text-purple-300" />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                No Interviews Yet
              </h3>

              <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
                Start practicing to build your interview confidence.
              </p>

              <button
                onClick={() => navigate("/interviews/setup")}
                className="mt-7 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold transition hover:scale-[1.03]"
              >
                <Sparkles size={18} />
                Start Your First Interview
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {interviews.map((interview) => (
                <motion.div
                  key={interview.session_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {interview.domain} · {interview.interview_type}
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Session #{interview.session_id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        interview.status === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {interview.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-gray-400 sm:grid-cols-3">
                    <p>Difficulty: {interview.difficulty}</p>
                    <p>
                      Questions: {interview.submitted_count}/
                      {interview.question_count} answered
                    </p>
                    <p>
                      Date:{" "}
                      {interview.created_at
                        ? new Date(interview.created_at).toLocaleDateString()
                        : "Unavailable"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-white/10 py-6 text-center text-sm text-gray-500">
          SmartHire AI · Interview Performance History
        </footer>
      </main>
    </div>
  );
};

export default InterviewHistory;
