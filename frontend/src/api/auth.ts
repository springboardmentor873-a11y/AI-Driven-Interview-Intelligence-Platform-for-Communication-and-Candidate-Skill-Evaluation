
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: "candidate" | "recruiter" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface UploadedResume {
  id: number;
  file_name: string;
  uploaded_at: string;
}

// Extracted Resume Skills Type
export interface ResumeSkills {
  programming_languages: string[];
  frameworks_and_libraries: string[];
  databases: string[];
  tools_and_platforms: string[];
  core_concepts: string[];
  soft_skills: string[];
  other_skills: string[];
}

// Resume Skills API Response Type
export interface ResumeSkillsResponse {
  message: string;
  resume_id: number;
  file_name: string;
  skills: ResumeSkills;
  created_at: string;
  updated_at: string;
}

// Register API
export const registerUser = async (
  full_name: string,
  email: string,
  password: string,
  role: "candidate" | "recruiter"
) => {
  const response = await API.post("/api/auth/register", {
    full_name,
    email,
    password,
    role,
  });

  return response.data;
};

// Login API
export const loginUser = async (
  email: string,
  password: string
) => {
  const response = await API.post("/api/auth/login", {
    email,
    password,
  });

  return response.data;
};

// Get Current User API
export const getCurrentUser = async (token: string) => {
  const response = await API.get("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data as User;
};

// Forgot Password API
export const forgotPassword = async (email: string) => {
  const response = await API.post("/api/auth/forgot-password", {
    email,
  });

  return response.data;
};

// Reset Password API
export const resetPassword = async (
  token: string,
  new_password: string,
  confirm_password: string
) => {
  const response = await API.post("/api/auth/reset-password", {
    token,
    new_password,
    confirm_password,
  });

  return response.data;
};

// Change Password API
export const changePassword = async (
  current_password: string,
  new_password: string,
  confirm_password: string
) => {
  const token = localStorage.getItem("access_token");

  const response = await API.patch(
    "/api/auth/change-password",
    {
      current_password,
      new_password,
      confirm_password,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Upload Resume API
export const uploadResume = async (file: File) => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please login first");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await API.post(
    "/api/resumes/upload",
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

// Get Logged-in Candidate's Resume API
export const getMyResume = async (): Promise<{
  resume: UploadedResume | null;
}> => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please login first");
  }

  const response = await API.get("/api/resumes/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get Logged-in Candidate's Extracted Resume Skills API
export const getMyResumeSkills =
  async (): Promise<ResumeSkillsResponse> => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("Please login first");
    }

    const response = await API.get(
      "/api/resume-ai/my-skills",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  };

export const extractResumeSkills = async () => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please login first");
  }

  const response = await API.post(
    "/api/resume-ai/extract-skills",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export default API;
