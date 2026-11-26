import api from "./api";

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  role: "job_seeker" | "recruiter";
}

export interface LoginData {
  email: string;
  password: string;
}

export const registerUser = async (data: RegisterData) => {
  const response = await api.post("/api/auth/register", data);
  return response.data;
};

export const loginUser = async (data: LoginData) => {
  const response = await api.post("/api/auth/login", data);
  return response.data;
};

export const verifyOTP = async (email: string, otp: string) => {
  const response = await api.post("/api/auth/verify-otp", {
    email,
    otp,
  });
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post("/api/auth/forgot-password", {
    email,
  });
  return response.data;
};

export const resetPassword = async (
  email: string,
  otp: string,
  new_password: string
) => {
  const response = await api.post("/api/auth/reset-password", {
    email,
    otp,
    new_password,
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const token = sessionStorage.getItem("access_token");

  const response = await api.get("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};