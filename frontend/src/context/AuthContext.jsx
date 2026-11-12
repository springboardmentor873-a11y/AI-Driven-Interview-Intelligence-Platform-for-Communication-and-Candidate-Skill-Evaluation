import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("smarthire_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Synchronize authenticated user with backend on startup
  useEffect(() => {
    const token = localStorage.getItem("smarthire_access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("smarthire_user", JSON.stringify(res.data));
      })
      .catch(() => {
        // Token expired or invalid; attempt refresh
        authApi
          .refresh()
          .then((refreshRes) => {
            const newToken = refreshRes.data.access_token;
            localStorage.setItem("smarthire_access_token", newToken);
            return authApi.getMe();
          })
          .then((profileRes) => {
            setUser(profileRes.data);
            localStorage.setItem(
              "smarthire_user",
              JSON.stringify(profileRes.data)
            );
          })
          .catch(() => {
            localStorage.removeItem("smarthire_access_token");
            localStorage.removeItem("smarthire_user");
            setUser(null);
          });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const persistAuth = (userData, token) => {
    setUser(userData);
    localStorage.setItem("smarthire_user", JSON.stringify(userData));
    if (token) {
      localStorage.setItem("smarthire_access_token", token);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      const token = data.access_token;
      const profile = data.user;
      persistAuth(profile, token);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const register = async (full_name, email, password) => {
    setLoading(true);
    try {
      await authApi.register({ full_name, email, password });
      return await login(email, password);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const { data } = await authApi.googleAuth(credential);
      const token = data.access_token;
      const profile = data.user;
      persistAuth(profile, token);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Local state is cleared regardless of network outcome
    } finally {
      localStorage.removeItem("smarthire_access_token");
      localStorage.removeItem("smarthire_user");
      setUser(null);
    }
  };

  const changePassword = async (current_password, new_password) => {
    await authApi.changePassword({ current_password, new_password });
  };

  const requestPasswordReset = async (email) => {
    const { data } = await authApi.forgotPassword(email);
    return data;
  };

  const resetPassword = async (token, new_password) => {
    await authApi.resetPassword({ token, new_password });
  };

  const refreshUser = async () => {
    try {
      const { data } = await authApi.getMe();
      setUser(data);
      localStorage.setItem("smarthire_user", JSON.stringify(data));
      return data;
    } catch (err) {
      return null;
    }
  };

  const roles = user?.roles || [];
  const isCandidate = roles.includes("candidate");
  const isRecruiter = roles.includes("recruiter");
  const isAdmin = roles.includes("admin");

  const primaryRole = useMemo(() => {
    if (isAdmin) return "admin";
    if (isRecruiter) return "recruiter";
    if (isCandidate) return "candidate";
    return "candidate";
  }, [isAdmin, isRecruiter, isCandidate]);

  const defaultDashboardPath = useMemo(() => {
    if (isAdmin) return "/admin";
    if (isRecruiter) return "/recruiter";
    return "/app";
  }, [isAdmin, isRecruiter]);

  const value = useMemo(
    () => ({
      user,
      loading,
      roles,
      isCandidate,
      isRecruiter,
      isAdmin,
      primaryRole,
      defaultDashboardPath,
      login,
      register,
      loginWithGoogle,
      logout,
      changePassword,
      requestPasswordReset,
      resetPassword,
      refreshUser,
    }),
    [
      user,
      loading,
      roles,
      isCandidate,
      isRecruiter,
      isAdmin,
      primaryRole,
      defaultDashboardPath,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
