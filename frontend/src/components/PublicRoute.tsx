
import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, type User } from "../api/auth";

interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        localStorage.removeItem("access_token");

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#172554]">
        Checking authentication...
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to={`/${user.role}/dashboard`}
        replace
      />
    );
  }

  return <>{children}</>;
}

export default PublicRoute;
