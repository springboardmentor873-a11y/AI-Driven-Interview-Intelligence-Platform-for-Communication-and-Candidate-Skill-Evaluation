import { createContext, useCallback, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveSession = (data) => {
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    setUser(data.user);
    return data.user;
  };

  const clearSession = useCallback(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }, []);

  // On first load, restore the session if a token exists
  useEffect(() => {
    if (!localStorage.getItem("access")) {
      setLoading(false);
      return;
    }
    client
      .get("/api/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [clearSession]);

  // The Axios client fires this when a refresh fails
  useEffect(() => {
    window.addEventListener("auth:logout", clearSession);
    return () => window.removeEventListener("auth:logout", clearSession);
  }, [clearSession]);

  const login = async (email, password) => {
    const { data } = await client.post("/api/auth/login/", { email, password });
    return saveSession(data);
  };

  const register = async (payload) => {
    const { data } = await client.post("/api/auth/register/", payload);
    return saveSession(data);
  };

  const googleLogin = async (credential) => {
    const { data } = await client.post("/api/auth/google/", { id_token: credential });
    return saveSession(data);
  };

  const logout = async () => {
    const refresh = localStorage.getItem("refresh");
    try {
      if (refresh) await client.post("/api/auth/logout/", { refresh });
    } catch {
      // even if the server call fails, clear the local session
    }
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}