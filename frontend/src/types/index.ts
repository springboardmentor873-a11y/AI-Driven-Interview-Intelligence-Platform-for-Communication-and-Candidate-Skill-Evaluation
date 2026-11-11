export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  organization?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Resume {
  id: number;
  user_id: number;
  filename: string;
  file_size: number;
  skills: string[];
  technologies: string[];
  experience_years: number;
  experience_details: { role: string }[];
  education: { degree: string; field: string; year?: string }[];
  summary?: string;
  uploaded_at: string;
  updated_at?: string;
}

export interface ResumeUploadResponse {
  message: string;
  resume: Resume;
}

export type InterviewType = 'technical' | 'hr' | 'behavioral' | 'aptitude' | 'comprehensive';
export type DifficultyLevel = 'entry' | 'mid' | 'senior' | 'lead';
export type SessionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface InterviewTemplate {
  id: number;
  title: string;
  description?: string;
  interview_type: InterviewType;
  difficulty: DifficultyLevel;
  domain: string;
  duration_minutes: number;
  questions: { question: string; expected_keywords?: string[] }[];
  created_by?: number;
  created_at: string;
}

export interface InterviewSession {
  id: number;
  candidate_id: number;
  template_id?: number;
  title: string;
  status: SessionStatus;
  interview_type: InterviewType;
  difficulty: DifficultyLevel;
  communication_score: number;
  confidence_score: number;
  technical_score: number;
  professionalism_score: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: string[];
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface PlatformMetrics {
  users: { total: number; candidates: number; recruiters: number; admins: number };
  resumes: { total: number };
  interviews: { total_sessions: number; total_templates: number };
  system: { audit_logs_count: number; version: string; status: string };
}

