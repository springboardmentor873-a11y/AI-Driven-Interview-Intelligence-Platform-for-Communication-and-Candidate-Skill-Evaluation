
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  ArrowLeft,
  BrainCircuit,
  Code2,
  Users,
  Layers,
  Clock,
  FileText,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import {
  generateInterviewQuestions,
  type InterviewDifficulty,
  type InterviewQuestionType,
} from "../api/interview";


function InterviewSetup() {
  const navigate = useNavigate();

  const [difficulty, setDifficulty] =
    useState<InterviewDifficulty>("medium");

  const [questionType, setQuestionType] =
    useState<InterviewQuestionType>("mixed");

  const [questionCount, setQuestionCount] =
    useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleStartInterview = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await generateInterviewQuestions({
        difficulty,
        question_count: questionCount,
        question_type: questionType,
      });

      if (
        !response.questions ||
        response.questions.length === 0
      ) {
        throw new Error("No interview questions generated");
      }

      // Store generated questions temporarily for the interview room.
      navigate("/candidate/interview/room", {
        state: {
          interview: response,
        },
      });

    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to start interview. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <Link
            to="/candidate/dashboard"
            className="flex items-center gap-2 text-slate-600 hover:text-[#172554] transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium text-sm">
              Back to Dashboard
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="bg-[#172554] p-2 rounded-lg">
              <BrainCircuit className="text-white" size={21} />
            </div>

            <span className="text-xl font-bold text-[#172554]">
              SmartHire <span className="text-[#0F766E]">AI</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck size={17} className="text-[#0F766E]" />
            AI Mock Interview
          </div>

        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Page Heading */}
        <div className="text-center mb-10">

          <div className="inline-flex items-center gap-2 bg-teal-50 text-[#0F766E] px-4 py-2 rounded-full text-sm font-semibold mb-5">
            <Sparkles size={16} />
            AI-Powered Interview
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#172554] mb-3">
            Prepare for Your Mock Interview
          </h1>

          <p className="text-slate-500 max-w-2xl mx-auto">
            Customize your interview preferences. Our AI will
            generate personalized questions based on your
            uploaded resume and extracted skills.
          </p>

        </div>


        {/* Setup Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-9">

          {/* Difficulty */}
          <section className="mb-9">

            <div className="flex items-center gap-3 mb-5">
              <div className="bg-blue-50 p-2.5 rounded-xl">
                <BrainCircuit
                  className="text-[#172554]"
                  size={21}
                />
              </div>

              <div>
                <h2 className="font-bold text-[#172554] text-lg">
                  Select Difficulty
                </h2>

                <p className="text-sm text-slate-500">
                  Choose your interview difficulty level
                </p>
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {([
                {
                  value: "easy",
                  title: "Easy",
                  description: "Fundamental concepts",
                },
                {
                  value: "medium",
                  title: "Medium",
                  description: "Practical knowledge",
                },
                {
                  value: "hard",
                  title: "Hard",
                  description: "Advanced problem solving",
                },
              ] as const).map((item) => (

                <button
                  key={item.value}
                  type="button"
                  disabled={loading}
                  onClick={() => setDifficulty(item.value)}
                  className={`border-2 rounded-xl p-5 text-left transition ${
                    difficulty === item.value
                      ? "border-[#0F766E] bg-teal-50"
                      : "border-slate-200 hover:border-teal-300"
                  }`}
                >

                  <div className="flex items-center justify-between mb-3">

                    <h3 className="font-bold text-[#172554]">
                      {item.title}
                    </h3>

                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        difficulty === item.value
                          ? "border-[#0F766E] bg-[#0F766E]"
                          : "border-slate-300"
                      }`}
                    />

                  </div>

                  <p className="text-sm text-slate-500">
                    {item.description}
                  </p>

                </button>

              ))}

            </div>
          </section>


          <div className="border-t border-slate-100 my-8" />


          {/* Question Type */}
          <section className="mb-9">

            <div className="flex items-center gap-3 mb-5">

              <div className="bg-teal-50 p-2.5 rounded-xl">
                <Layers
                  className="text-[#0F766E]"
                  size={21}
                />
              </div>

              <div>
                <h2 className="font-bold text-[#172554] text-lg">
                  Interview Type
                </h2>

                <p className="text-sm text-slate-500">
                  Choose the type of questions
                </p>
              </div>

            </div>


            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {([
                {
                  value: "technical",
                  title: "Technical",
                  description: "Programming and technical concepts",
                  icon: Code2,
                },
                {
                  value: "behavioral",
                  title: "Behavioral",
                  description: "Teamwork and workplace scenarios",
                  icon: Users,
                },
                {
                  value: "mixed",
                  title: "Mixed",
                  description: "Combination of both",
                  icon: Layers,
                },
              ] as const).map((item) => {

                const Icon = item.icon;

                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={loading}
                    onClick={() => setQuestionType(item.value)}
                    className={`border-2 rounded-xl p-5 text-left transition ${
                      questionType === item.value
                        ? "border-[#0F766E] bg-teal-50"
                        : "border-slate-200 hover:border-teal-300"
                    }`}
                  >

                    <div className="flex items-center justify-between mb-3">

                      <Icon
                        size={22}
                        className="text-[#0F766E]"
                      />

                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          questionType === item.value
                            ? "border-[#0F766E] bg-[#0F766E]"
                            : "border-slate-300"
                        }`}
                      />

                    </div>

                    <h3 className="font-bold text-[#172554] mb-1">
                      {item.title}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {item.description}
                    </p>

                  </button>
                );
              })}

            </div>
          </section>


          <div className="border-t border-slate-100 my-8" />


          {/* Question Count */}
          <section className="mb-8">

            <div className="flex items-center gap-3 mb-5">

              <div className="bg-blue-50 p-2.5 rounded-xl">
                <FileText
                  className="text-[#172554]"
                  size={21}
                />
              </div>

              <div>
                <h2 className="font-bold text-[#172554] text-lg">
                  Number of Questions
                </h2>

                <p className="text-sm text-slate-500">
                  Select how many questions you want to attempt
                </p>
              </div>

            </div>


            <div className="grid grid-cols-4 gap-3">

              {[5, 10, 15, 20].map((count) => (

                <button
                  key={count}
                  type="button"
                  disabled={loading}
                  onClick={() => setQuestionCount(count)}
                  className={`py-4 rounded-xl border-2 font-bold transition ${
                    questionCount === count
                      ? "border-[#0F766E] bg-teal-50 text-[#0F766E]"
                      : "border-slate-200 text-slate-600 hover:border-teal-300"
                  }`}
                >
                  {count}
                </button>

              ))}

            </div>
          </section>


          {/* Interview Summary */}
          <div className="bg-[#F0FDFA] border border-teal-100 rounded-xl p-5 mb-7">

            <h3 className="font-bold text-[#172554] mb-4">
              Interview Summary
            </h3>

            <div className="grid grid-cols-3 gap-3">

              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Difficulty
                </p>

                <p className="font-bold text-[#0F766E] capitalize">
                  {difficulty}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Interview Type
                </p>

                <p className="font-bold text-[#0F766E] capitalize">
                  {questionType}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Questions
                </p>

                <p className="font-bold text-[#0F766E]">
                  {questionCount}
                </p>
              </div>

            </div>

          </div>


          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-5">
              {error}
            </div>
          )}


          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={loading}
            className="w-full bg-[#172554] hover:bg-[#1E3A8A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition shadow-md"
          >

            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating Your Questions...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Start AI Interview
              </>
            )}

          </button>


          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
            <Clock size={14} />
            Questions will be generated using your resume skills
          </div>

        </div>

      </main>

    </div>
  );
}

export default InterviewSetup;
