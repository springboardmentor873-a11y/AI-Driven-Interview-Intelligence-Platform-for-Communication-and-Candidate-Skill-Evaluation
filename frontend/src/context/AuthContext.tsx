import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getCurrentUser } from "../services/authService";

interface User {
  id: number;
  full_name: string;
  email: string;
  role: "job_seeker" | "recruiter";
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<User | null> => {
    try {
      const data = await getCurrentUser();
      setUser(data);
      return data;
    } catch {
      sessionStorage.removeItem("access_token");
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (sessionStorage.getItem("access_token")) {
        await refreshUser();
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const logout = () => {
    sessionStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};