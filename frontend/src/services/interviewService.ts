
import api from "./api";

export type InterviewType =
  | "Technical"
  | "HR"
  | "Behavioral"
  | "Aptitude";

export type Difficulty =
  | "Beginner"
  | "Intermediate"
  | "Advanced";

export interface InterviewGenerationRequest {
  interview_type: InterviewType;
  difficulty: Difficulty;
  domain: string;
  question_count: 5 | 10 | 15;
  resume_id?: number | null;
}

export interface GeneratedQuestion {
  question_number: number;
  category: string;
  question: string;
  expected_answer_points: string[];
}

export interface InterviewGenerationResponse {
  message: string;
  session_id: number;
  interview_type: InterviewType;
  difficulty: Difficulty;
  domain: string;
  question_count: number;
  resume_id: number | null;
  questions: GeneratedQuestion[];
}

export interface SavedInterviewAnswer {
  question_number: number;
  question: string;
  answer_text: string;
  submitted_at: string | null;
}

export interface InterviewSessionResponse {
  session_id: number;
  interview_type: InterviewType;
  difficulty: Difficulty;
  domain: string;
  question_count: number;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  questions: GeneratedQuestion[];
  answers: SavedInterviewAnswer[];
}

export interface AnswerSubmissionRequest {
  question_number: number;
  answer_text: string;
}

export interface AnswerSubmissionResponse {
  message: string;
  session_id: number;
  question_number: number;
  submitted_count: number;
  total_questions: number;
  status: string;
}

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("access_token");

  if (!token) {
    throw new Error("Authentication required. Please log in again.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const generateInterview = async (
  request: InterviewGenerationRequest
): Promise<InterviewGenerationResponse> => {
  const response = await api.post<InterviewGenerationResponse>(
    "/api/interviews/generate",
    request,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const getInterviewSession = async (
  sessionId: number
): Promise<InterviewSessionResponse> => {
  const response = await api.get<InterviewSessionResponse>(
    `/api/interviews/sessions/${sessionId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const submitInterviewAnswer = async (
  sessionId: number,
  request: AnswerSubmissionRequest
): Promise<AnswerSubmissionResponse> => {
  const response = await api.post<AnswerSubmissionResponse>(
    `/api/interviews/sessions/${sessionId}/answers`,
    request,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export interface InterviewHistoryItem {
  session_id: number;
  interview_type: InterviewType;
  difficulty: Difficulty;
  domain: string;
  question_count: number;
  submitted_count: number;
  status: string;
  created_at: string | null;
  completed_at: string | null;
}

export interface InterviewHistoryResponse {
  total_interviews: number;
  interviews: InterviewHistoryItem[];
}

export const getInterviewHistory = async (): Promise<InterviewHistoryResponse> => {
  const response = await api.get<InterviewHistoryResponse>(
    "/api/interviews/history",
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
