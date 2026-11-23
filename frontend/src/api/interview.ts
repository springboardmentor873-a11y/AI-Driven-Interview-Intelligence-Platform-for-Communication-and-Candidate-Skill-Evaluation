
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
  session_id: number;
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


// ==========================================
// INTERVIEW SESSION MANAGEMENT
// ==========================================

export type InterviewSessionStatus = "in_progress" | "completed";

export interface InterviewSessionCreateRequest {
  interview_type: string;
  difficulty: string;
  questions: InterviewQuestion[];
}

export interface InterviewSessionAnswer {
  question_number: number;
  answer: string;
}

export interface InterviewSessionUpdateRequest {
  answers?: InterviewSessionAnswer[];
  status?: InterviewSessionStatus;
}

export interface InterviewSessionResponse {
  id: number;
  candidate_id: number;
  interview_type: string;
  difficulty: string;
  status: InterviewSessionStatus;
  questions: InterviewQuestion[] | null;
  answers: InterviewSessionAnswer[] | null;
  evaluation: InterviewEvaluationResponse | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// Get authentication token
const getSessionAuthHeaders = () => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please login first");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

// 1. Create Interview Session
export const createInterviewSession = async (
  data: InterviewSessionCreateRequest
): Promise<InterviewSessionResponse> => {
  const response = await API.post(
    "/api/interview-sessions/",
    data,
    {
      headers: getSessionAuthHeaders(),
    }
  );

  return response.data;
};

// 2. Get All Candidate Sessions
export const getMyInterviewSessions = async (): Promise<
  InterviewSessionResponse[]
> => {
  const response = await API.get(
    "/api/interview-sessions/my-sessions",
    {
      headers: getSessionAuthHeaders(),
    }
  );

  return response.data;
};

// 3. Get Single Interview Session
export const getInterviewSession = async (
  sessionId: number
): Promise<InterviewSessionResponse> => {
  const response = await API.get(
    `/api/interview-sessions/${sessionId}`,
    {
      headers: getSessionAuthHeaders(),
    }
  );

  return response.data;
};

// 4. Update Interview Session
export const updateInterviewSession = async (
  sessionId: number,
  data: InterviewSessionUpdateRequest
): Promise<InterviewSessionResponse> => {
  const response = await API.patch(
    `/api/interview-sessions/${sessionId}`,
    data,
    {
      headers: getSessionAuthHeaders(),
    }
  );

  return response.data;
};
