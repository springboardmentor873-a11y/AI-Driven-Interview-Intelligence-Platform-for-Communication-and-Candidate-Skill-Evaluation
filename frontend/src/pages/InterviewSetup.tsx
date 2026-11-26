
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Code2,
  MessageCircle,
  Target,
  Sparkles,
  FileText,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyResumes,type Resume } from "../services/resumeService";

const InterviewSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [interviewType, setInterviewType] = useState(
    location.state?.interviewType || "Technical"
  );
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [domain, setDomain] = useState("Java");
  const [questionCount, setQuestionCount] = useState("10");

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const data = await getMyResumes();
        setResumes(data);
      } catch (error) {
        console.error("Failed to load resumes:", error);
        setResumeError("Unable to load your resumes.");
      } finally {
        setResumeLoading(false);
      }
    };

    loadResumes();
  }, []);

  const types = [
    { name: "Technical", icon: Code2 },
    { name: "HR", icon: MessageCircle },
    { name: "Behavioral", icon: BrainCircuit },
    { name: "Aptitude", icon: Target },
  ];

  const handleStart = () => {
    navigate("/interviews/room/preview", {
      state: {
        interviewType,
        difficulty,
        domain,
        questionCount: Number(questionCount),
        resumeId: resumeId ? Number(resumeId) : null,
      },
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b18] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
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
            <Sparkles size={16} />
            Personalize Your Practice
          </div>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Interview Setup
          </h1>

          <p className="mt-3 text-gray-400">
            Configure your interview preferences before starting.
          </p>
        </motion.div>

        <div className="mt-9 space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-9">
          <section>
            <h2 className="mb-4 text-lg font-semibold">
              1. Select Interview Type
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {types.map((type) => (
                <button
                  key={type.name}
                  onClick={() => setInterviewType(type.name)}
                  className={`rounded-xl border p-4 transition ${
                    interviewType === type.name
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-lg shadow-cyan-950/20"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-purple-400/40"
                  }`}
                >
                  <type.icon size={25} className="mx-auto mb-3" />
                  <span className="text-sm font-medium">{type.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">
              2. Choose Difficulty
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {["Beginner", "Intermediate", "Advanced"].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`rounded-xl border px-3 py-4 text-sm font-medium transition ${
                    difficulty === level
                      ? "border-purple-400 bg-purple-500/15 text-purple-300"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-purple-400/40"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">
              3. Select Your Domain
            </h2>

            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#151a2e] px-4 py-4 text-white outline-none transition focus:border-cyan-400"
            >
              <option value="Java">Java Development</option>
              <option value="Python">Python Development</option>
              <option value="C++">C++ Programming</option>
              <option value="Web Development">Web Development</option>
              <option value="Database">Database Management</option>
              <option value="Data Structures and Algorithms">
                Data Structures & Algorithms
              </option>
              <option value="AI/ML">Artificial Intelligence / ML</option>
              <option value="General">General</option>
            </select>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">
              4. Number of Questions
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {["5", "10", "15"].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`rounded-xl border px-4 py-4 font-semibold transition ${
                    questionCount === count
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-cyan-400/40"
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <FileText size={20} className="text-cyan-300" />
              5. Select Resume (Optional)
            </h2>

            <select
              value={resumeId}
              onChange={(event) => setResumeId(event.target.value)}
              disabled={resumeLoading}
              className="w-full rounded-xl border border-white/10 bg-[#151a2e] px-4 py-4 text-white outline-none transition focus:border-cyan-400 disabled:opacity-60"
            >
              <option value="">
                {resumeLoading
                  ? "Loading your resumes..."
                  : "Continue without a resume"}
              </option>

              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.original_filename}
                </option>
              ))}
            </select>

            {resumeError && (
              <p className="mt-2 text-sm text-yellow-400">
                {resumeError} You can continue without a resume.
              </p>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Selecting a resume allows AI to personalize questions
              using your extracted skills and work experience.
            </p>
          </section>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-cyan-300">
              <BrainCircuit size={20} />
              Interview Summary
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Interview Type</p>
                <p className="mt-1 font-medium">{interviewType}</p>
              </div>

              <div>
                <p className="text-gray-500">Difficulty</p>
                <p className="mt-1 font-medium">{difficulty}</p>
              </div>

              <div>
                <p className="text-gray-500">Domain</p>
                <p className="mt-1 font-medium">{domain}</p>
              </div>

              <div>
                <p className="text-gray-500">Questions</p>
                <p className="mt-1 font-medium">{questionCount}</p>
              </div>

              <div className="col-span-2">
                <p className="text-gray-500">Selected Resume</p>
                <p className="mt-1 font-medium">
                  {resumes.find(
                    (resume) => String(resume.id) === resumeId
                  )?.original_filename || "No resume selected"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 py-4 font-semibold shadow-lg shadow-purple-950/30 transition hover:scale-[1.01]"
          >
            Continue to Interview
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
