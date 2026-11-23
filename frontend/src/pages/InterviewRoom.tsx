import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link , useSearchParams} from "react-router-dom";
import {
  createInterviewSession,
  updateInterviewSession,
} from "../api/interview";

import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";

import type {
  GenerateInterviewQuestionsResponse,
} from "../api/interview";


function InterviewRoom() {
  const location = useLocation();
  const navigate = useNavigate();

  const interview =
    location.state?.interview as
    | GenerateInterviewQuestionsResponse
    | undefined;

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<
    Record<number, string>
  >({});

  const [showFinishConfirmation, setShowFinishConfirmation] =
    useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);

  const [sessionError, setSessionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sessionCreationStarted = useRef(false);

  useEffect(() => {
    if (!interview || !interview.questions?.length) {
      return;
    }

    if (sessionCreationStarted.current) {
      return;
    }

    sessionCreationStarted.current = true;

    const startSession = async () => {
      try {
        const session = await createInterviewSession({
          interview_type: interview.question_type,
          difficulty: interview.difficulty,
          questions: interview.questions,
        });

        setSessionId(session.id);

        console.log("Interview session created:", session.id);
      } catch (error: any) {
        console.error("Session creation failed:", error);

        setSessionError(
          error.response?.data?.detail ||
          error.message ||
          "Failed to create interview session"
        );
      }
    };

    startSession();
  }, [interview]);


  // Prevent direct access without generated questions
  if (!interview || !interview.questions?.length) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">

          <BrainCircuit
            size={45}
            className="text-[#0F766E] mx-auto mb-4"
          />

          <h2 className="text-xl font-bold text-[#172554] mb-2">
            No Active Interview
          </h2>

          <p className="text-slate-500 text-sm mb-6">
            Please generate your interview questions before
            entering the interview room.
          </p>

          <button
            onClick={() => navigate("/candidate/interview")}
            className="bg-[#172554] text-white px-6 py-3 rounded-xl font-semibold"
          >
            Go to Interview Setup
          </button>

        </div>
      </div>
    );
  }


  const questions = interview.questions;

  const currentQuestion = questions[currentIndex];

  const totalQuestions = questions.length;

  const progress =
    ((currentIndex + 1) / totalQuestions) * 100;


  const handleAnswerChange = (value: string) => {
    setAnswers((previous) => ({
      ...previous,
      [currentIndex]: value,
    }));
  };


  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((previous) => previous - 1);
    }
  };


  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((previous) => previous + 1);
    }
  };



const handleFinish = async () => {
  if (!sessionId) {
    setSessionError("Interview session is not ready. Please try again.");
    return;
  }

  setIsSaving(true);
  setSessionError("");

  try {
    const formattedAnswers = questions.map((question, index) => ({
      question_number: question.question_number,
      answer: (answers[index] || "").trim(),
    }));

    // Verify actual answers before saving
    console.log("Questions:", questions);
    console.log("Current answers state:", answers);
    console.log("Formatted answers to save:", formattedAnswers);

    await updateInterviewSession(sessionId, {
      answers: formattedAnswers,
      status: "completed",
    });

    console.log("Interview answers saved successfully.");

    setShowFinishConfirmation(false);

    navigate(`/candidate/interview/result?sessionId=${sessionId}`, {
      state: {
        interview,
        answers,
        sessionId,
      },
    });
  } catch (error: any) {
    console.error("Failed to save interview:", error);

    setSessionError(
      error.response?.data?.detail ||
      error.message ||
      "Failed to save interview answers. Please try again."
    );
  } finally {
    setIsSaving(false);
  }
};



  const answeredCount = Object.values(answers).filter(
    (answer) => answer.trim().length > 0
  ).length;


  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Header */}
      <header className="bg-white border-b border-slate-200">

        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <Link
            to="/candidate/dashboard"
            className="flex items-center gap-2 text-slate-500 hover:text-[#172554]"
          >
            <ArrowLeft size={19} />
            <span className="text-sm font-medium">
              Exit Interview
            </span>
          </Link>


          <div className="flex items-center gap-2">

            <div className="bg-[#172554] p-2 rounded-lg">
              <BrainCircuit
                size={21}
                className="text-white"
              />
            </div>

            <span className="font-bold text-[#172554] text-lg">
              SmartHire <span className="text-[#0F766E]">AI</span>
            </span>

          </div>


          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#0F766E] font-semibold">
            <ShieldCheck size={17} />
            Interview in Progress
          </div>

        </div>


      </header>


      {sessionError && (
        <p className="text-red-500 text-sm text-center mt-3">
          {sessionError}
        </p>
      )}




      {/* Main */}
      <main className="max-w-5xl mx-auto px-5 py-8">

        {/* Interview Info */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-7">

          <div>

            <h1 className="text-2xl font-bold text-[#172554]">
              Mock Interview
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Answer each question carefully and honestly.
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <span className="bg-blue-50 text-[#172554] px-3 py-2 rounded-lg text-sm font-semibold capitalize">
              {interview.difficulty} Level
            </span>

            <span className="bg-teal-50 text-[#0F766E] px-3 py-2 rounded-lg text-sm font-semibold capitalize">
              {interview.question_type}
            </span>

          </div>

        </div>


        {/* Progress Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">

          <div className="flex justify-between items-center mb-3">

            <span className="text-sm font-semibold text-[#172554]">
              Interview Progress
            </span>

            <span className="text-sm font-bold text-[#0F766E]">
              {currentIndex + 1} / {totalQuestions}
            </span>

          </div>


          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">

            <div
              className="h-full bg-[#0F766E] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />

          </div>


          <div className="flex justify-between mt-3 text-xs text-slate-500">

            <span>
              {answeredCount} Answered
            </span>

            <span>
              {totalQuestions - answeredCount} Remaining
            </span>

          </div>

        </div>


        {/* Question Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-9">

          {/* Question Header */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-7">

            <span className="bg-blue-50 text-[#172554] px-4 py-2 rounded-lg text-sm font-bold">
              Question {currentQuestion.question_number}
            </span>


            <div className="flex items-center gap-2">

              <span className="bg-teal-50 text-[#0F766E] px-3 py-2 rounded-lg text-xs font-semibold">
                {currentQuestion.category}
              </span>

              <span className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs font-semibold capitalize">
                {currentQuestion.difficulty}
              </span>

            </div>

          </div>


          {/* Question */}
          <div className="mb-9">

            <h2 className="text-xl md:text-2xl font-bold text-[#172554] leading-relaxed">
              {currentQuestion.question}
            </h2>

          </div>


          {/* Answer Input */}
          <div>

            <div className="flex justify-between items-center mb-3">

              <label
                htmlFor="interview-answer"
                className="font-semibold text-[#172554]"
              >
                Your Answer
              </label>

              <span className="text-xs text-slate-400">
                Question {currentIndex + 1}
              </span>

            </div>


            <textarea
              id="interview-answer"
              value={answers[currentIndex] || ""}
              onChange={(event) =>
                handleAnswerChange(event.target.value)
              }
              placeholder="Type your answer here. Explain your understanding with examples..."
              rows={8}
              className="w-full border border-slate-200 rounded-xl p-5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent resize-y"
            />


            <p className="text-xs text-slate-400 mt-2">
              Your answer is temporarily saved while you navigate
              between questions.
            </p>

          </div>


          {/* Navigation */}
          <div className="border-t border-slate-100 mt-8 pt-6 flex flex-wrap justify-between items-center gap-4">

            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={17} />
              Previous
            </button>


            {currentIndex < totalQuestions - 1 ? (

              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-[#172554] hover:bg-[#1E3A8A] text-white px-6 py-3 rounded-xl font-semibold text-sm transition"
              >
                Next Question
                <ArrowRight size={17} />
              </button>

            ) : (

              <button
                onClick={() => setShowFinishConfirmation(true)}
                className="flex items-center gap-2 bg-[#0F766E] hover:bg-teal-800 text-white px-6 py-3 rounded-xl font-semibold text-sm transition"
              >
                <Flag size={17} />
                Finish Interview
              </button>

            )}

          </div>

        </div>


        {/* Question Navigation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-6">

          <h3 className="font-bold text-[#172554] mb-4 text-sm">
            Question Navigator
          </h3>


          <div className="flex flex-wrap gap-3">

            {questions.map((question, index) => (

              <button
                key={question.question_number}
                onClick={() => setCurrentIndex(index)}
                className={`w-10 h-10 rounded-lg text-sm font-bold transition ${currentIndex === index
                  ? "bg-[#172554] text-white"
                  : answers[index]?.trim()
                    ? "bg-teal-100 text-[#0F766E]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {index + 1}
              </button>

            ))}

          </div>

        </div>

      </main>


      {/* Finish Confirmation */}
      {showFinishConfirmation && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50">

          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-xl">

            <div className="bg-teal-50 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
              <CheckCircle2
                size={26}
                className="text-[#0F766E]"
              />
            </div>


            <h2 className="text-xl font-bold text-[#172554] mb-2">
              Finish Your Interview?
            </h2>


            <p className="text-sm text-slate-500 mb-5">
              You have answered {answeredCount} out of{" "}
              {totalQuestions} questions. Unanswered questions
              will remain blank.
            </p>

            {sessionError && (
              <p className="text-red-500 text-sm mt-2 text-center">
                {sessionError}
              </p>
            )}
            <div className="flex gap-3">

              <button
                onClick={() => setShowFinishConfirmation(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold text-sm"
              >
                Continue
              </button>


              <button
                onClick={handleFinish}
                disabled={isSaving || !sessionId}
                className="flex-1 bg-[#0F766E] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Finish"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default InterviewRoom;
