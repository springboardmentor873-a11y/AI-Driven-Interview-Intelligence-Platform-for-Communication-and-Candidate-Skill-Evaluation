import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const tokenStore = {
  get access() { return localStorage.getItem("access_token"); },
  get refresh() { return localStorage.getItem("refresh_token"); },
  set({ access_token, refresh_token }) {
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
  },
  clear() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (tokenStore.access) config.headers.Authorization = `Bearer ${tokenStore.access}`;
  return config;
});

// On 401, try the refresh token once, then replay the request.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith("/api/auth/");
    if (error.response?.status === 401 && !original._retry && !isAuthCall && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing ??= axios
          .post(`${API_URL}/api/auth/refresh`, { refresh_token: tokenStore.refresh })
          .finally(() => (refreshing = null));
        const { data } = await refreshing;
        tokenStore.set(data);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        tokenStore.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (err) => {
  const d = err.response?.data?.detail;
  if (Array.isArray(d)) return d.map((e) => e.msg).join(", ");
  return d || "Something went wrong. Try again.";
};

export default api;
