
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Code2,
  MessageCircle,
  Target,
  Clock3,
  History,
  Sparkles,
  LogOut,
  BriefcaseBusiness,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const interviewTypes = [
  {
    title: "Technical Interview",
    description: "Test programming, technical concepts and problem-solving skills.",
    icon: Code2,
    color: "from-cyan-500 to-blue-600",
    tag: "Technical",
  },
  {
    title: "HR Interview",
    description: "Practice common HR questions and improve communication.",
    icon: MessageCircle,
    color: "from-purple-500 to-pink-600",
    tag: "HR",
  },
  {
    title: "Behavioral Interview",
    description: "Prepare for questions about teamwork and workplace situations.",
    icon: BrainCircuit,
    color: "from-blue-500 to-indigo-600",
    tag: "Behavioral",
  },
  {
    title: "Aptitude Interview",
    description: "Practice logical reasoning and analytical questions.",
    icon: Target,
    color: "from-fuchsia-500 to-purple-600",
    tag: "Aptitude",
  },
];

const InterviewDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden bg-[#080b18] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-5 backdrop-blur-xl">
        <button
          onClick={() => navigate("/job-seeker")}
          className="text-2xl font-bold tracking-tight"
        >
          <span className="text-cyan-400">SmartHire</span>
          <span className="text-purple-400"> AI</span>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/job-seeker")}
            className="hidden text-sm text-gray-400 transition hover:text-white sm:block"
          >
            Dashboard
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <motion.section
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-600/20 via-[#11162b] to-cyan-500/10 p-8 shadow-2xl shadow-purple-950/20 sm:p-12"
        >
          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-purple-400/20" />
          <div className="absolute -right-2 -top-12 h-48 w-48 rounded-full border border-cyan-400/20" />

          <div className="relative max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
              <Sparkles size={16} />
              AI-Powered Interview Preparation
            </div>

            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
                {user?.full_name?.split(" ")[0] || "User"}
              </span>
            </h1>

            <p className="mt-5 max-w-xl leading-7 text-gray-300">
              Build your confidence, practice interview questions and prepare
              for your next career opportunity with SmartHire AI.
            </p>

            <button
              onClick={() => navigate("/interviews/setup")}
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3.5 font-semibold shadow-lg shadow-purple-900/30 transition hover:scale-[1.03] hover:shadow-purple-500/20"
            >
              Start New Interview
              <ArrowRight size={19} />
            </button>
          </div>
        </motion.section>

        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
                Practice Zone
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Choose Your Interview Type
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Select the type of interview you want to practice.
              </p>
            </div>

            <button
              onClick={() => navigate("/interviews/history")}
              className="inline-flex items-center gap-2 text-sm text-purple-300 transition hover:text-cyan-300"
            >
              <History size={17} />
              Interview History
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {interviewTypes.map((item, index) => (
              <motion.button
                key={item.title}
                type="button"
                onClick={() =>
                  navigate("/interviews/setup", {
                    state: { interviewType: item.tag },
                  })
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-left backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-2xl bg-gradient-to-br ${item.color} p-3 shadow-lg`}
                  >
                    <item.icon size={25} className="text-white" />
                  </div>

                  <ArrowRight
                    size={20}
                    className="text-gray-500 transition group-hover:translate-x-1 group-hover:text-cyan-300"
                  />
                </div>

                <h3 className="mt-6 text-xl font-semibold">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {item.description}
                </p>

                <p className="mt-5 text-sm font-medium text-cyan-300">
                  Practice now
                </p>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                <Clock3 size={23} />
              </div>
              <div>
                <h3 className="font-semibold">Practice at Your Pace</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Prepare whenever you are ready.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-400/10 p-3 text-purple-300">
                <BriefcaseBusiness size={23} />
              </div>
              <div>
                <h3 className="font-semibold">Career Preparation</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Improve your readiness for job interviews.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 py-6 text-center text-sm text-gray-500">
          SmartHire AI · Intelligent Interview Preparation
        </footer>
      </main>
    </div>
  );
};

export default InterviewDashboard;
