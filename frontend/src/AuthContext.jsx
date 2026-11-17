import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { tokenStore } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.access) return setLoading(false);
    api.get("/api/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (data) => {
    tokenStore.set(data);
    setUser(data.user);
    return data.user;
  };

  const login = useCallback(async (email, password) =>
    handleAuth((await api.post("/api/auth/login", { email, password })).data), []);

  const register = useCallback(async (payload) =>
    handleAuth((await api.post("/api/auth/register", payload)).data), []);

  const loginWithTokens = useCallback(async (access_token, refresh_token) => {
    tokenStore.set({ access_token, refresh_token });
    const { data } = await api.get("/api/auth/me");
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithTokens, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
