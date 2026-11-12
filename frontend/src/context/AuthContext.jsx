import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);
const demoUser = { id: "demo-candidate", full_name: "Alex Morgan", email: "alex@demo.com", role: "candidate" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("smarthire_user")) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const realAuth = import.meta.env.VITE_USE_REAL_AUTH === "true";

  useEffect(() => {
    if (!realAuth) return;
    const token = localStorage.getItem("smarthire_access_token");
    if (token) api.get("/users/me").then(r => setUser(r.data)).catch(() => {
      localStorage.removeItem("smarthire_access_token"); localStorage.removeItem("smarthire_user"); setUser(null);
    });
  }, [realAuth]);

  const persist = (next, token) => {
    setUser(next); localStorage.setItem("smarthire_user", JSON.stringify(next));
    if (token) localStorage.setItem("smarthire_access_token", token);
  };
  const login = async (email, password) => {
    setLoading(true);
    try {
      if (realAuth) {
        const { data } = await api.post("/auth/login", { email, password });
        const token = data.access_token || data.accessToken;
        const profile = data.user || await api.get("/users/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.data);
        persist(profile, token); return profile;
      }
      await new Promise(r => setTimeout(r, 450));
      persist({ ...demoUser, email, full_name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) });
      return demoUser;
    } finally { setLoading(false); }
  };
  const register = async (full_name, email, password) => {
    setLoading(true);
    try {
      if (realAuth) {
        await api.post("/auth/register", { full_name, email, password });
        return await login(email, password);
      }
      await new Promise(r => setTimeout(r, 450));
      const next = { ...demoUser, full_name, email }; persist(next); return next;
    } finally { setLoading(false); }
  };
  const logout = async () => {
    try { if (realAuth) await api.post("/auth/logout"); } catch { /* clear local state regardless */ }
    localStorage.removeItem("smarthire_access_token"); localStorage.removeItem("smarthire_user"); setUser(null);
  };
  const value = useMemo(() => ({ user, loading, login, register, logout, realAuth }), [user, loading, realAuth]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);