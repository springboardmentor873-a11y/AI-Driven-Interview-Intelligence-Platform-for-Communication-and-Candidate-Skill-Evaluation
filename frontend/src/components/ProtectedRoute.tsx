
import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, type User } from "../api/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: User["role"][];
}

function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);

        // Temporary debugging logs
        console.log("Logged-in user role:", currentUser.role);
        console.log("Allowed roles:", allowedRoles);

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Authentication error:", error);

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log("Access denied for role:", user.role);

    return (
      <Navigate
        to={`/${user.role}/dashboard`}
        replace
      />
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
