
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  BrainCircuit,
  RotateCcw,
  Home,
  Loader2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Lightbulb,
} from "lucide-react";

import type {
  GenerateInterviewQuestionsResponse,
  InterviewEvaluationResponse,

} from "../api/interview";

import { evaluateInterviewAnswers, getInterviewSession } from "../api/interview";

interface InterviewResultState {
  interview: GenerateInterviewQuestionsResponse;
  answers: Record<number, string>;
  sessionId: number;
}

function InterviewResult() {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const fromHistory = searchParams.get("from") === "history";

  const result = location.state as InterviewResultState | null;

  const urlSessionId = Number(searchParams.get("sessionId"));

  const sessionId =
    Number.isInteger(urlSessionId) && urlSessionId > 0
      ? urlSessionId
      : result?.sessionId;

  const [evaluation, setEvaluation] =
    useState<InterviewEvaluationResponse | null>(null);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState("");

  const [savedSession, setSavedSession] =
    useState<Awaited<ReturnType<typeof getInterviewSession>> | null>(null);

  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const hasStartedEvaluation = useRef(false);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setEvaluationError("Interview session ID not found.");
        setIsLoadingSession(false);
        return;
      }

      try {
        const session = await getInterviewSession(sessionId);

        setSavedSession(session);

        // Restore saved evaluation if it already exists
        if (session.evaluation) {
          setEvaluation(session.evaluation);
        }
      } catch (error: any) {
        console.error("Failed to fetch interview session:", error);

        setEvaluationError(
          error.response?.data?.detail ||
          error.message ||
          "Failed to load interview result."
        );
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const interview =
    result?.interview ||
    (savedSession
      ? {
        message: "Interview session restored",
        candidate_id: savedSession.candidate_id,
        resume_id: 0,
        difficulty: savedSession.difficulty as "easy" | "medium" | "hard",
        question_type: savedSession.interview_type as
          | "technical"
          | "behavioral"
          | "mixed",
        total_questions: savedSession.questions?.length || 0,
        questions: savedSession.questions || [],
      }
      : undefined);

  const answers =
    result?.answers ||
    (savedSession?.answers
      ? Object.fromEntries(
        savedSession.answers.map((item) => [
          item.question_number - 1,
          item.answer,
        ])
      )
      : {});


  const totalQuestions = interview?.questions.length || 0;



  const answeredQuestions = interview
    ? interview.questions.filter(
      (_, index) => (answers[index] || "").trim().length > 0
    ).length
    : 0;

  const unansweredQuestions = totalQuestions - answeredQuestions;

  const runEvaluation = async () => {
    if (!interview || !sessionId) {
      setEvaluationError("Interview session not found. Please try again.");
      return;
    }

    setIsEvaluating(true);
    setEvaluationError("");

    try {
      const payload = {
        session_id: sessionId,
        questions: interview.questions.map((question, index) => ({
          question_number: question.question_number ?? index + 1,
          question: question.question,
          category: question.category,
          difficulty: (
            question.difficulty || interview.difficulty || "medium"
          ).toLowerCase() as "easy" | "medium" | "hard",
          expected_answer_points:
            question.expected_answer_points?.length
              ? question.expected_answer_points
              : ["Provide a correct and relevant explanation of the concept."],
          answer: (answers[index] || "").trim(),
        })),
      };

      const response = await evaluateInterviewAnswers(payload);

      setEvaluation(response);
    } catch (error: any) {
      console.error("Interview evaluation error:", error);
      console.log("Evaluation API error response:", error?.response?.data);

      const detail = error?.response?.data?.detail;
      let errorMessage = "Unable to evaluate your answers. Please try again.";

      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail
          .map((item: any) => item.msg || JSON.stringify(item))
          .join("; ");
      } else if (detail) {
        errorMessage = JSON.stringify(detail);
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setEvaluationError(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    // Wait until database session is fetched
    if (isLoadingSession) {
      return;
    }

    if (!savedSession || !interview || !sessionId) {
      return;
    }

    // Do not call Gemini if evaluation already exists
    if (savedSession.evaluation) {
      setEvaluation(savedSession.evaluation);
      return;
    }

    // Evaluation is only allowed for completed sessions
    if (savedSession.status !== "completed") {
      return;
    }

    // Prevent duplicate API calls
    if (hasStartedEvaluation.current) {
      return;
    }

    hasStartedEvaluation.current = true;

    runEvaluation();
  }, [
    isLoadingSession,
    savedSession,
    interview,
    sessionId,
  ]);

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Loader2
            size={35}
            className="animate-spin text-[#0F766E] mx-auto mb-3"
          />
          <p className="text-slate-600 font-medium">
            Loading your interview result...
          </p>
        </div>
      </div>
    );
  }
  if (!interview?.questions?.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <ClipboardCheck className="w-14 h-14 text-teal-600 mx-auto mb-4" />

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            No Interview Result Found
          </h1>

          <p className="text-slate-500 mb-6">
            Please start an interview first to view your result.
          </p>

          <button
            onClick={() => navigate("/candidate/interview")}
            className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  const currentInterview = interview;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-teal-700";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 75) return "bg-teal-600";
    if (score >= 60) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const renderScoreBar = (score: number) => (
    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${getScoreBarColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            to={
              fromHistory
                ? "/candidate/interview/history"
                : "/candidate/dashboard"
            }
            className="flex items-center gap-2 text-slate-600 hover:text-teal-700"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">
              {fromHistory ? "Interview History" : "Dashboard"}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <BrainCircuit className="text-teal-700" size={25} />
            <span className="text-xl font-bold text-[#172554]">
              SmartHire AI
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page Heading */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-11 h-11 text-teal-700" />
          </div>

          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-2">
            Interview Completed
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-[#172554] mb-3">
            Great Job!
          </h1>

          <p className="text-slate-500 max-w-xl mx-auto">
            Your AI mock interview has been completed. Review your answers
            and AI-powered performance evaluation below.
          </p>
        </div>

        {/* Interview Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-500 mb-2">Total Questions</p>
            <p className="text-3xl font-bold text-[#172554]">
              {totalQuestions}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-500 mb-2">Answered</p>
            <p className="text-3xl font-bold text-teal-700">
              {answeredQuestions}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-500 mb-2">Unanswered</p>
            <p className="text-3xl font-bold text-orange-600">
              {unansweredQuestions}
            </p>
          </div>
        </div>

        {/* Interview Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-[#172554] mb-5">
            Interview Summary
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <p className="text-sm text-slate-500 mb-1">Difficulty</p>
              <p className="font-semibold text-slate-800 capitalize">
                {currentInterview.difficulty}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">Question Type</p>
              <p className="font-semibold text-slate-800 capitalize">
                {currentInterview.question_type}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">Completion</p>
              <p className="font-semibold text-slate-800">
                {Math.round((answeredQuestions / totalQuestions) * 100)}%
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full"
                style={{
                  width: `${(answeredQuestions / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* AI Evaluation Loading */}
        {isEvaluating && (
          <div className="bg-white border border-teal-200 rounded-2xl p-8 mb-8 text-center">
            <Loader2 className="w-10 h-10 text-teal-700 animate-spin mx-auto mb-4" />

            <h2 className="text-xl font-bold text-[#172554] mb-2">
              AI is Evaluating Your Answers
            </h2>

            <p className="text-sm text-slate-500">
              Please wait while SmartHire AI analyzes your responses,
              checks technical accuracy and prepares your feedback.
            </p>
          </div>
        )}

        {/* Evaluation Error */}
        {evaluationError && !isEvaluating && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-1" />

              <div className="flex-1">
                <h2 className="font-bold text-red-800 mb-1">
                  Evaluation Failed
                </h2>

                <p className="text-sm text-red-700 mb-4">
                  {evaluationError}
                </p>

                <button
                  onClick={runEvaluation}
                  disabled={isEvaluating}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm"
                >
                  <RotateCcw size={16} />
                  Retry Evaluation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Evaluation Result */}
        {evaluation && (
          <div className="space-y-8 mb-10">
            {/* Overall Score */}
            <div className="bg-white border border-slate-200 rounded-2xl p-7">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="text-teal-700" size={23} />
                <h2 className="text-xl font-bold text-[#172554]">
                  AI Performance Evaluation
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-36 h-36 rounded-full border-8 border-teal-100 flex flex-col items-center justify-center shrink-0">
                  <span className="text-4xl font-bold text-teal-700">
                    {Math.round(evaluation.overall_score)}
                  </span>
                  <span className="text-xs text-slate-500">out of 100</span>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-slate-500 mb-2">
                    Overall Performance Rating
                  </p>

                  <h3 className="text-2xl font-bold text-[#172554] mb-3">
                    {evaluation.rating}
                  </h3>

                  <p className="text-sm text-slate-600">
                    Your answers have been evaluated based on technical
                    relevance, written communication and professionalism.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Scores */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#172554] mb-6">
                Category-wise Performance
              </h2>

              <div className="space-y-6">
                {[
                  {
                    label: "Communication",
                    score: evaluation.category_scores.communication,
                  },
                  {
                    label: "Technical Relevance",
                    score: evaluation.category_scores.technical_relevance,
                  },
                  {
                    label: "Professionalism",
                    score: evaluation.category_scores.professionalism,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-700">
                        {item.label}
                      </span>

                      <span
                        className={`font-bold ${getScoreColor(item.score)}`}
                      >
                        {item.score}/100
                      </span>
                    </div>

                    {renderScoreBar(item.score)}
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600">
                  <strong>Confidence:</strong>{" "}
                  {evaluation.category_scores.confidence === null
                    ? "Not evaluated (text-based interview)"
                    : `${evaluation.category_scores.confidence}/100`}
                </p>
              </div>
            </div>

            {/* Overall Strengths */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-teal-700" size={21} />
                <h2 className="text-lg font-bold text-[#172554]">
                  Overall Strengths
                </h2>
              </div>

              <ul className="space-y-3">
                {evaluation.overall_strengths.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-700">
                    <CheckCircle2
                      size={17}
                      className="text-teal-600 shrink-0 mt-0.5"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas to Improve */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-orange-600" size={21} />
                <h2 className="text-lg font-bold text-[#172554]">
                  Areas to Improve
                </h2>
              </div>

              <ul className="space-y-3">
                {evaluation.areas_to_improve.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-700">
                    <Circle
                      size={16}
                      className="text-orange-500 shrink-0 mt-0.5"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="text-teal-700" size={22} />
                <h2 className="text-lg font-bold text-[#172554]">
                  AI Recommendations
                </h2>
              </div>

              <ul className="space-y-3">
                {evaluation.recommendations.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-700">
                    <span className="font-bold text-teal-700">
                      {index + 1}.
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Question Responses */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#172554] mb-5">
            Your Responses & Question-wise Evaluation
          </h2>

          <div className="space-y-5">
            {currentInterview.questions.map((question, index) => {
              const answer = (answers[index] || "").trim();

              const questionEvaluation =
                evaluation?.question_evaluations.find(
                  (item) =>
                    item.question_number === question.question_number
                );

              return (
                <div
                  key={question.question_number}
                  className="bg-white border border-slate-200 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-teal-700 mb-2">
                        QUESTION {question.question_number}
                      </p>

                      <h3 className="text-base font-semibold text-slate-800">
                        {question.question}
                      </h3>

                      <p className="text-xs text-slate-500 mt-2">
                        {question.category}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {answer ? (
                        <CheckCircle2 className="text-teal-600" size={22} />
                      ) : (
                        <Circle className="text-orange-500" size={22} />
                      )}
                    </div>
                  </div>

                  {/* Candidate Answer */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      YOUR ANSWER
                    </p>

                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {answer || "No answer submitted."}
                    </p>
                  </div>

                  {/* AI Question Evaluation */}
                  {questionEvaluation && (
                    <div className="mt-5 border-t border-slate-100 pt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[#172554]">
                          AI Evaluation
                        </h3>

                        <span
                          className={`font-bold ${getScoreColor(
                            questionEvaluation.score
                          )}`}
                        >
                          {questionEvaluation.score}/100
                        </span>
                      </div>

                      {renderScoreBar(questionEvaluation.score)}

                      <p className="text-sm font-semibold text-slate-700">
                        Verdict: {questionEvaluation.verdict}
                      </p>

                      <div>
                        <p className="text-sm font-semibold text-teal-700 mb-2">
                          Strengths
                        </p>

                        <ul className="space-y-2">
                          {questionEvaluation.strengths.map(
                            (item, itemIndex) => (
                              <li
                                key={itemIndex}
                                className="text-sm text-slate-600 flex gap-2"
                              >
                                <CheckCircle2
                                  size={16}
                                  className="text-teal-600 shrink-0 mt-0.5"
                                />
                                {item}
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-orange-600 mb-2">
                          Missing Points
                        </p>

                        <ul className="space-y-2">
                          {questionEvaluation.missing_points.map(
                            (item, itemIndex) => (
                              <li
                                key={itemIndex}
                                className="text-sm text-slate-600 flex gap-2"
                              >
                                <Circle
                                  size={15}
                                  className="text-orange-500 shrink-0 mt-0.5"
                                />
                                {item}
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                          AI Feedback
                        </p>

                        <p className="text-sm text-blue-800">
                          {questionEvaluation.feedback}
                        </p>
                      </div>

                      {questionEvaluation.improved_answer && (
                        <div className="bg-teal-50 rounded-xl p-4">
                          <p className="text-sm font-semibold text-teal-900 mb-2">
                            Suggested Improved Answer
                          </p>

                          <p className="text-sm text-teal-900 whitespace-pre-wrap">
                            {questionEvaluation.improved_answer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isEvaluating && (
                    <p className="mt-4 text-xs text-slate-400">
                      AI evaluation is being generated...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-[#172554] mb-2">
            What's Next?
          </h3>

          <p className="text-sm text-slate-600">
            Review your AI feedback, focus on the missing concepts and
            practice the recommended topics to improve your next interview.
          </p>
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => navigate("/candidate/interview")}
            className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-xl font-semibold"
          >
            <RotateCcw size={18} />
            Start New Interview
          </button>

          <button
            onClick={() =>
              navigate(
                fromHistory
                  ? "/candidate/interview/history"
                  : "/candidate/dashboard"
              )
            }
            className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-semibold"
          >
            <Home size={18} />
            {fromHistory ? "Back to Interview History" : "Back to Dashboard"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default InterviewResult;
