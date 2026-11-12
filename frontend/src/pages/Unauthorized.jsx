import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const { user, defaultDashboardPath } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="panel max-w-md w-full text-center p-8 shadow-elevated">
        <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
          <ShieldAlert size={24} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          You do not have the required role permissions to view this section of
          the platform. Your account is currently authorized as{" "}
          <strong className="text-slate-700">
            {user?.roles?.join(", ") || "guest"}
          </strong>
          .
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to={defaultDashboardPath} className="btn-primary w-full sm:w-auto">
            <Home size={15} />
            <span>Return to Workspace</span>
          </Link>
          <Link to="/profile" className="btn-secondary w-full sm:w-auto">
            <span>View Account Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

