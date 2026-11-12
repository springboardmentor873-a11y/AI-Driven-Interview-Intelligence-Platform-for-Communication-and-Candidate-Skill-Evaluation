import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smarthire_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401 responses
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh if unauthorized and not already retrying
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.access_token;
        localStorage.setItem("smarthire_access_token", newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("smarthire_access_token");
        localStorage.removeItem("smarthire_user");
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      (error?.response?.status === 404
        ? "The requested API endpoint was not found on the server."
        : error?.response?.status === 401
        ? "Invalid email or password."
        : error?.response?.status === 403
        ? "You do not have permission to access this resource."
        : !error?.response
        ? "Unable to connect to the backend server. Please verify the API is running on port 8000."
        : error.message || "Request failed. Please try again.");

    return Promise.reject(
      new Error(typeof message === "string" ? message : "Request failed.")
    );
  }
);

// Auth endpoints
export const authApi = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  googleAuth: (credential) => api.post("/auth/google", { credential }),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
  logoutAll: () => api.post("/auth/logout-all"),
  changePassword: (data) => api.post("/auth/password/change", data),
  forgotPassword: (email) => api.post("/auth/password/forgot", { email }),
  resetPassword: (data) => api.post("/auth/password/reset", data),
  getMe: () => api.get("/users/me"),
};

// Candidate endpoints
export const candidateApi = {
  getStats: () => api.get("/candidate/stats"),
  getInterviews: (limit = 50, offset = 0) =>
    api.get(`/candidate/interviews?limit=${limit}&offset=${offset}`),
  getInterview: (id) => api.get(`/candidate/interviews/${id}`),
  createInterview: (data) => api.post("/candidate/interviews", data),
  getResumes: () => api.get("/candidate/resumes"),
  uploadResume: (data) => api.post("/candidate/resumes", data),
  deleteResume: (id) => api.delete(`/candidate/resumes/${id}`),
};

// Recruiter endpoints
export const recruiterApi = {
  getStats: () => api.get("/recruiter/stats"),
  getCandidates: (params = {}) => api.get("/recruiter/candidates", { params }),
  getCandidate: (id) => api.get(`/recruiter/candidates/${id}`),
};

// Admin endpoints
export const adminApi = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params = {}) => api.get("/admin/users", { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  grantRole: (userId, role) =>
    api.post(`/admin/users/${userId}/roles`, { role }),
  revokeRole: (userId, role) =>
    api.delete(`/admin/users/${userId}/roles/${role}`),
  updateStatus: (userId, status) =>
    api.patch(`/admin/users/${userId}/status`, { status }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
};
