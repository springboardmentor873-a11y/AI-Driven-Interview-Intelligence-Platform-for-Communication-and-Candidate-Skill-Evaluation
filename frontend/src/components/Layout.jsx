import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic2,
  TrendingUp,
  UserCheck,
  Users,
  Shield,
  X,
  UserRound,
  ShieldCheck,
  Briefcase,
  PlayCircle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./UI";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout, isCandidate, isRecruiter, isAdmin, primaryRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Role-specific navigation definitions
  const candidateLinks = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/interview", label: "Mock Interview", icon: PlayCircle },
    { to: "/app/resume", label: "Resume & Skills", icon: FileText },
    { to: "/app/history", label: "Interview History", icon: BookOpen },
    { to: "/app/analytics", label: "Performance", icon: TrendingUp },
  ];

  const recruiterLinks = [
    { to: "/recruiter", label: "Recruiter Overview", icon: LayoutDashboard, end: true },
    { to: "/recruiter/candidates", label: "Candidate Directory", icon: Users },
  ];

  const adminLinks = [
    { to: "/admin", label: "Admin Dashboard", icon: Shield, end: true },
    { to: "/admin/users", label: "User Management", icon: UserCheck },
  ];

  const isCurrentRecruiterSection = location.pathname.startsWith("/recruiter");
  const isCurrentAdminSection = location.pathname.startsWith("/admin");

  let activeLinks = candidateLinks;
  let workspaceSection = "Candidate Workspace";

  if (isCurrentAdminSection && isAdmin) {
    activeLinks = adminLinks;
    workspaceSection = "Administrative Console";
  } else if (isCurrentRecruiterSection && (isRecruiter || isAdmin)) {
    activeLinks = recruiterLinks;
    workspaceSection = "Recruiter Workspace";
  }

  const activeTitle =
    activeLinks.find((x) =>
      x.end ? location.pathname === x.to : location.pathname.startsWith(x.to)
    )?.label || "Workspace";

  const handleLogout = async () => {
    await logout();
    navigate("/workspace");
  };

  const getRoleTone = (role) => {
    switch (role) {
      case "admin":
        return "slate";
      case "recruiter":
        return "purple";
      default:
        return "blue";
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        {/* Brand */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              SH
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 tracking-tight block">
                SmartHire AI
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase block">
                Enterprise
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden icon-btn -mr-2"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role Workspace indicator */}
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">{workspaceSection}</span>
            <Badge variant={getRoleTone(primaryRole)}>
              {primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
          {activeLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* Quick role-switch for multi-role accounts (e.g. Admin or Recruiter) */}
          {(isAdmin || isRecruiter) && (
            <div className="pt-5 mt-4 border-t border-slate-200">
              <span className="eyebrow px-3 mb-2 block">Switch View</span>
              {isAdmin && !isCurrentAdminSection && (
                <NavLink
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="nav-item text-slate-600 hover:text-slate-900"
                >
                  <Shield size={16} />
                  <span>Go to Admin View</span>
                </NavLink>
              )}
              {(isRecruiter || isAdmin) && !isCurrentRecruiterSection && (
                <NavLink
                  to="/recruiter"
                  onClick={() => setOpen(false)}
                  className="nav-item text-slate-600 hover:text-slate-900"
                >
                  <Briefcase size={16} />
                  <span>Go to Recruiter View</span>
                </NavLink>
              )}
              {(isCurrentAdminSection || isCurrentRecruiterSection) && (
                <NavLink
                  to="/app"
                  onClick={() => setOpen(false)}
                  className="nav-item text-slate-600 hover:text-slate-900"
                >
                  <PlayCircle size={16} />
                  <span>Candidate Practice</span>
                </NavLink>
              )}
            </div>
          )}
        </nav>

        {/* User Card at bottom */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white border border-slate-200/80 shadow-subtle">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-8 w-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {(user?.full_name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link
                to="/profile"
                className="text-xs font-semibold text-slate-900 hover:underline truncate block"
                title="Account Settings"
              >
                {user?.full_name || "User"}
              </Link>
              <div className="text-[11px] text-slate-500 truncate">
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="icon-btn text-slate-400 hover:text-red-600 hover:bg-red-50"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-25 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="app-main">
        {/* Top Header */}
        <header className="app-topbar">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden icon-btn"
              onClick={() => setOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{workspaceSection}</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <UserRound size={14} />
              <span>Profile & Settings</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
