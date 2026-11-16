
import API from "./auth";

export type InterviewDifficulty = "easy" | "medium" | "hard";

export type InterviewQuestionType =
  | "technical"
  | "behavioral"
  | "mixed";

export interface GenerateInterviewQuestionsRequest {
  difficulty: InterviewDifficulty;
  question_count: number;
  question_type: InterviewQuestionType;
}

export interface InterviewQuestion {
  question_number: number;
  question: string;
  category: string;
  difficulty: InterviewDifficulty;
  expected_answer_points: string[];
}

export interface GenerateInterviewQuestionsResponse {
  message: string;
  candidate_id: number;
  resume_id: number;
  difficulty: InterviewDifficulty;
  question_type: InterviewQuestionType;
  total_questions: number;
  questions: InterviewQuestion[];
}

export const generateInterviewQuestions = async (
  data: GenerateInterviewQuestionsRequest
): Promise<GenerateInterviewQuestionsResponse> => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please login first");
  }

  const response = await API.post(
    "/api/interview-ai/generate-questions",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};


// ==========================================
// AI INTERVIEW ANSWER EVALUATION
// ==========================================

export interface EvaluateInterviewAnswer {
  question_number: number;
  question: string;
  category: string;
  difficulty: InterviewDifficulty;
  expected_answer_points: string[];
  answer: string;
}

export interface EvaluateInterviewAnswersRequest {
  questions: EvaluateInterviewAnswer[];
}

export interface QuestionEvaluation {
  question_number: number;
  score: number;
  verdict: string;
  strengths: string[];
  missing_points: string[];
  feedback: string;
  improved_answer: string;
}

export interface InterviewEvaluationResponse {
  message: string;
  candidate_id: number;
  total_questions: number;
  overall_score: number;
  rating: string;
  category_scores: {
    communication: number;
    technical_relevance: number;
    professionalism: number;
    confidence: number | null;
  };
  question_evaluations: QuestionEvaluation[];
  overall_strengths: string[];
  areas_to_improve: string[];
  recommendations: string[];
}

export const evaluateInterviewAnswers = async (
  data: EvaluateInterviewAnswersRequest
): Promise<InterviewEvaluationResponse> => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please login first");
  }

  const response = await API.post(
    "/api/interview-ai/evaluate-answers",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
