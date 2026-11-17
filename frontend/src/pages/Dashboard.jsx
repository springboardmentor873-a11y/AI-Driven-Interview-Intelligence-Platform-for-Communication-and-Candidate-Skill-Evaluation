import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const CARDS = {
  candidate: [
    { label: "Resumes", note: "Upload and manage your PDF resumes", to: "/resumes" },
    { label: "Start a mock interview", note: "Coming in Milestone 2" },
    { label: "Interview history", note: "Coming in Milestone 3" },
    { label: "Performance analytics", note: "Coming in Milestone 4" },
  ],
  recruiter: [
    { label: "Candidates", note: "Browse candidates and their resumes", to: "/recruiter/candidates" },
    { label: "Interview templates", note: "Coming in Milestone 2" },
    { label: "Candidate reports and comparison", note: "Coming in Milestone 4" },
    { label: "Monitor sessions", note: "Coming in Milestone 3" },
  ],
  admin: [
    { label: "User management", note: "Enable or disable accounts", to: "/admin/users" },
    { label: "Candidates", note: "Browse candidates and their resumes", to: "/recruiter/candidates" },
    { label: "Platform settings and AI configuration", note: "Coming in Milestone 4" },
    { label: "System activity and analytics", note: "Coming in Milestone 4" },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <>
      <h1 className="text-2xl font-semibold">Hi {user.full_name.split(" ")[0]}</h1>
      <p className="text-slate-500 mb-6">Modules unlock as the platform gets built.</p>
      <ul className="grid sm:grid-cols-2 gap-4">
        {CARDS[user.role].map((c) => (
          <li key={c.label}>
            {c.to ? (
              <Link to={c.to} className="block h-full rounded-xl border border-slate-200 bg-white p-5 hover:border-accent">
                <p className="font-medium">{c.label}</p>
                <p className="text-sm text-slate-500 mt-1">{c.note}</p>
              </Link>
            ) : (
              <div className="h-full rounded-xl border border-dashed border-slate-300 bg-white/60 p-5">
                <p className="font-medium text-slate-500">{c.label}</p>
                <p className="text-sm text-slate-400 mt-1">{c.note}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
