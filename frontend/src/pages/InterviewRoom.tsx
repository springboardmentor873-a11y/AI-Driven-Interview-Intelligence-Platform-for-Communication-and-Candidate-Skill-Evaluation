
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  BrainCircuit,
  Send,
  CheckCircle2,
  Sparkles,
  MessageSquareText,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  generateInterview,
  getInterviewSession,
  submitInterviewAnswer,
  type GeneratedQuestion,
  type InterviewType,
  type Difficulty,
} from "../services/interviewService";

interface InterviewConfig {
  interviewType: InterviewType;
  difficulty: Difficulty;
  domain: string;
  questionCount: number;
  resumeId: number | null;
}

const InterviewRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();

  const isPreview = sessionId === "preview";

  const config: InterviewConfig = location.state || {
    interviewType: "Technical",
    difficulty: "Intermediate",
    domain: "Java",
    questionCount: 10,
    resumeId: null,
  };

  const [interviewConfig, setInterviewConfig] =
    useState<InterviewConfig>(config);

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [error, setError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const requestStarted = useRef("");

  useEffect(() => {
    const requestKey = `${sessionId && !isPreview ? sessionId : "new"}-${retryKey}`;

    if (requestStarted.current === requestKey) return;

    requestStarted.current = requestKey;

    const loadQuestions = async () => {
      setLoading(true);
      setError("");
      setSubmissionError("");
      setIsCompleted(false);
      setActiveSessionId(null);
      setSubmittedCount(0);
      setAnswers({});
      setQuestions([]);
      setCurrentQuestionIndex(0);

      try {
        // Restore an existing interview session.
        if (sessionId && !isPreview) {
          const parsedSessionId = Number(sessionId);

          if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
            throw new Error("Invalid interview session ID.");
          }

          const result = await getInterviewSession(parsedSessionId);

          if (!result.questions || result.questions.length === 0) {
            throw new Error("No questions were found in this interview.");
          }

          setActiveSessionId(result.session_id);
          setQuestions(result.questions);

          setInterviewConfig({
            interviewType: result.interview_type,
            difficulty: result.difficulty,
            domain: result.domain,
            questionCount: result.question_count,
            resumeId: null,
          });

          const restoredAnswers: Record<number, string> = {};

          result.answers.forEach((answer) => {
            restoredAnswers[answer.question_number] = answer.answer_text;
          });

          setAnswers(restoredAnswers);
          setSubmittedCount(result.answers.length);

          if (result.status === "completed") {
            setIsCompleted(true);
          } else {
            const firstUnansweredIndex = result.questions.findIndex(
              (question) =>
                !restoredAnswers[question.question_number]?.trim()
            );

            setCurrentQuestionIndex(
              firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0
            );
          }
        } else {
          // Generate a new interview from the preview route.
          const result = await generateInterview({
            interview_type: config.interviewType,
            difficulty: config.difficulty,
            domain: config.domain,
            question_count: Number(config.questionCount) as 5 | 10 | 15,
            resume_id: config.resumeId ?? null,
          });

          if (!result.questions?.length || !result.session_id) {
            throw new Error(
              "The backend did not return a valid interview."
            );
          }

          setActiveSessionId(result.session_id);
          setQuestions(result.questions);
          setCurrentQuestionIndex(0);

          // Replace preview URL with the actual saved session URL.
          // This makes refreshing the page restore the same interview.
          navigate(`/interviews/room/${result.session_id}`, {
            replace: true,
            state: config,
          });
        }
      } catch (err: any) {
        console.error("Interview loading failed:", err);

        setError(
          err.response?.data?.detail ||
          err.message ||
          "Unable to load your interview. Please try again."
        );

        requestStarted.current = "";
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [sessionId, retryKey]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.question_number]: value,
    }));

    setSubmissionError("");
  };

  const saveCurrentAnswer = async () => {
    if (!currentQuestion || !activeSessionId) {
      setSubmissionError(
        "Interview session is not available. Please retry."
      );
      return null;
    }

    const answerText = (
      answers[currentQuestion.question_number] || ""
    ).trim();

    if (!answerText) {
      setSubmissionError(
        "Please write your answer before continuing."
      );
      return null;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const result = await submitInterviewAnswer(activeSessionId, {
        question_number: currentQuestion.question_number,
        answer_text: answerText,
      });

      setSubmittedCount(result.submitted_count);

      return result;
    } catch (err: any) {
      console.error("Answer submission failed:", err);

      setSubmissionError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to save your answer. Please try again."
      );

      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    setSubmissionError("");

    setCurrentQuestionIndex((previous) =>
      Math.max(0, previous - 1)
    );
  };

  const handleNext = async () => {
    if (isSubmitting) return;

    const result = await saveCurrentAnswer();

    if (result) {
      setCurrentQuestionIndex((previous) =>
        Math.min(questions.length - 1, previous + 1)
      );
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;

    const result = await saveCurrentAnswer();

    if (result) {
      if (result.status === "completed") {
        setIsCompleted(true);
      } else {
        setSubmissionError(
          "Your answer was saved, but some questions are still unanswered."
        );
      }
    }
  };

  const handleRetry = () => {
    requestStarted.current = "";
    setRetryKey((previous) => previous + 1);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b18] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-sm font-semibold text-cyan-400">
              SMARTHIRE AI
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Interview Room
            </h1>
          </div>

          <button
            onClick={() => navigate("/interviews/setup")}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:border-purple-400/40 hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to Setup
          </button>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-600/15 via-[#11162b] to-cyan-500/10 p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-purple-300">
                  <Sparkles size={17} />
                  AI-Generated Interview
                </div>

                <span className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-xs text-green-300">
                  Live AI Questions
                </span>
              </div>

              <div className="mt-7 flex items-center gap-3">
                <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                  <BrainCircuit size={27} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold">
                    {interviewConfig.interviewType} Interview
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {interviewConfig.domain} · {interviewConfig.difficulty}
                  </p>
                </div>
              </div>
            </motion.div>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
              {loading ? (
                <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
                  <LoaderCircle
                    size={42}
                    className="animate-spin text-cyan-400"
                  />
                  <h2 className="mt-5 text-xl font-semibold">
                    {sessionId && !isPreview
                      ? "Restoring Your Interview"
                      : "Generating Your Interview"}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">
                    Please wait while your interview session is loaded.
                  </p>
                </div>
              ) : error ? (
                <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
                  <div className="rounded-xl bg-red-500/10 p-4 text-red-400">
                    <BrainCircuit size={32} />
                  </div>

                  <h2 className="mt-5 text-xl font-semibold">
                    Interview Loading Failed
                  </h2>

                  <p className="mt-3 max-w-md text-sm leading-6 text-red-300">
                    {error}
                  </p>

                  <button
                    onClick={handleRetry}
                    className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 text-sm font-semibold"
                  >
                    <RefreshCw size={16} />
                    Try Again
                  </button>
                </div>
              ) : isCompleted ? (
                <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-green-400/10 p-5 text-green-300">
                    <CheckCircle2 size={42} />
                  </div>

                  <h2 className="mt-5 text-2xl font-bold">
                    Interview Completed!
                  </h2>

                  <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
                    All your answers have been successfully saved.
                  </p>

                  <p className="mt-3 text-sm text-cyan-300">
                    {submittedCount} of {questions.length} answers submitted
                  </p>

                  <button
                    onClick={() => navigate("/interviews")}
                    className="mt-7 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 text-sm font-semibold"
                  >
                    Back to Interviews
                  </button>
                </div>
              ) : currentQuestion ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-cyan-400">
                        AI-GENERATED QUESTION
                      </p>
                      <h2 className="mt-2 text-xl font-bold">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </h2>
                    </div>

                    <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-300">
                      {currentQuestion.category}
                    </span>
                  </div>

                  <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
                    <div className="mb-4 flex items-center gap-2 text-cyan-300">
                      <MessageSquareText size={20} />
                      <span className="text-sm font-medium">
                        Interview Question
                      </span>
                    </div>

                    <p className="text-lg font-medium leading-8 text-gray-100">
                      {currentQuestion.question}
                    </p>
                  </div>

                  <div className="mt-7">
                    <label className="mb-3 block font-semibold">
                      Your Answer
                    </label>

                    <textarea
                      value={
                        answers[currentQuestion.question_number] || ""
                      }
                      onChange={(event) =>
                        handleAnswerChange(event.target.value)
                      }
                      rows={7}
                      placeholder="Write your answer here..."
                      className="w-full resize-y rounded-2xl border border-white/10 bg-[#101629] p-5 text-sm leading-7 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/50"
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      {(answers[currentQuestion.question_number] || "").trim().length}{" "}
                      characters entered
                    </p>
                  </div>

                  {submissionError && (
                    <p className="mt-4 text-sm text-red-300">
                      {submissionError}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={handlePrevious}
                      disabled={
                        currentQuestionIndex === 0 || isSubmitting
                      }
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Previous
                    </button>

                    {currentQuestionIndex < questions.length - 1 ? (
                      <button
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                            Saving...
                          </>
                        ) : (
                          <>
                            Next Question
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Answer
                            <Send size={16} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </section>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="font-semibold">Session Overview</h3>

              <div className="mt-5 space-y-5 text-sm">
                <div>
                  <p className="text-gray-500">Interview Type</p>
                  <p className="mt-1 font-medium">
                    {interviewConfig.interviewType}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Difficulty</p>
                  <p className="mt-1 font-medium">
                    {interviewConfig.difficulty}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Domain</p>
                  <p className="mt-1 font-medium">
                    {interviewConfig.domain}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Total Questions</p>
                  <p className="mt-1 font-medium">
                    {questions.length || interviewConfig.questionCount}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Progress</p>
                  <p className="mt-1 font-medium text-cyan-300">
                    {questions.length
                      ? `${submittedCount} / ${questions.length} answers saved`
                      : "Waiting"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Session ID</p>
                  <p className="mt-1 break-all font-medium text-cyan-300">
                    {activeSessionId ?? sessionId ?? "Generating..."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-6">
              <div className="flex items-center gap-3 text-purple-300">
                <Clock3 size={21} />
                <h3 className="font-semibold">Interview Timer</h3>
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                The timer will be activated when interview timing is implemented.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
              <CheckCircle2 className="mb-3 text-cyan-300" size={24} />

              <h3 className="font-semibold">Stay Focused</h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Read each question carefully and structure your answers
                clearly.
              </p>
            </div>

            <button
              onClick={() => navigate("/interviews")}
              className="w-full rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
            >
              End Interview
            </button>
          </aside>
        </section>

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-sm text-gray-500">
          SmartHire AI · Interview Practice Environment
        </footer>
      </main>
    </div>
  );
};

export default InterviewRoom;
