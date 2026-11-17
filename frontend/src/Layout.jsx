import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", roles: ["candidate", "recruiter", "admin"] },
  { to: "/resumes", label: "My resumes", roles: ["candidate"] },
  { to: "/recruiter/candidates", label: "Candidates", roles: ["recruiter", "admin"] },
  { to: "/admin/users", label: "Users", roles: ["admin"] },
  { to: "/profile", label: "Profile", roles: ["candidate", "recruiter", "admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const link = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm ${isActive ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"}`;
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">SmartHire AI</span>
          <nav className="flex gap-1">
            {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
              <NavLink key={n.to} to={n.to} className={link}>{n.label}</NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">{user.full_name} ({user.role})</span>
          <button onClick={logout} className="text-accent font-medium">Log out</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-8"><Outlet /></main>
    </div>
  );
}
