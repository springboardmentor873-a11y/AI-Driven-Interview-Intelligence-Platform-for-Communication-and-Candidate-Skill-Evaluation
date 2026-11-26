
import api from "./api";

export interface Resume {
  id: number;
  original_filename: string;
  file_type: string;
  uploaded_at: string;
}

export interface ExtractedSkill {
  name: string;
  category: string;
  evidence: string;
}

export interface ExtractedExperience {
  organization: string;
  job_title: string;
  experience_type: string;
  start_date: string;
  end_date: string;
  description: string;
  evidence: string;
}

export interface ExtractedEducation {
  degree: string;
  field_of_study: string;
  institution: string;
  start_year: string;
  graduation_year: string;
  cgpa_or_percentage: string;
}

export interface ExtractedTechnology {
  name: string;
  category: string;
}

export interface ParsedResume {
  resume_id: number;
  filename: string;
  extracted_text: string;
  character_count: number;
  skills: ExtractedSkill[];
  experiences: ExtractedExperience[];
  education: ExtractedEducation[];
  technologies: ExtractedTechnology[];
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

export const uploadResume = async (file: File): Promise<Resume> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/api/resumes/upload", formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": undefined,
    },
  });

  return response.data;
};

export const getMyResumes = async (): Promise<Resume[]> => {
  const response = await api.get("/api/resumes/", {
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const deleteResume = async (resumeId: number) => {
  const response = await api.delete(`/api/resumes/${resumeId}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

// Parse an uploaded resume using the backend Groq integration
export const parseResume = async (
  resumeId: number
): Promise<ParsedResume> => {
  const response = await api.post(
    `/api/resumes/${resumeId}/parse`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
