import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";

const CARDS = {
  candidate: [
    { title: "Upload resume", note: "Coming on Day 7" },
    { title: "Start a mock interview", note: "Milestone 2" },
    { title: "Performance analytics", note: "Milestone 4" },
  ],
  recruiter: [
    { title: "Candidate reports", note: "Milestone 4" },
    { title: "Interview templates", note: "Milestone 2" },
    { title: "Compare candidates", note: "Milestone 4" },
  ],
  admin: [
    { title: "Manage users", note: "Available now", to: "/admin/users" },
    { title: "Platform settings", note: "Later milestone" },
    { title: "Platform-wide analytics", note: "Milestone 4" },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const name = user.first_name || user.email;

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-4xl bg-hero-glow px-8 py-10">
          <p className="text-sm font-semibold capitalize text-brand-400">{user.role} dashboard</p>
          <h1 className="mt-2 text-4xl font-extrabold">
            Welcome, <span className="bg-text-accent bg-clip-text text-transparent">{name}</span>
          </h1>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS[user.role].map((c) => (
            <a
              key={c.title}
              href={c.to || undefined}
              className="rounded-3xl border border-white/10 bg-surface p-6 transition hover:border-brand-500/50"
            >
              <h3 className="text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-white/50">{c.note}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}