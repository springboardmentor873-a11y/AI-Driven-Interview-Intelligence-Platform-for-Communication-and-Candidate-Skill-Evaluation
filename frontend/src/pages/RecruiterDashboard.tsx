import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  Users,
  FileText,
  PlusCircle,
  Bell,
  LogOut,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const RecruiterDashboard = () => {
  const { user, logout } = useAuth();

  const stats = [
    { title: "Active Jobs", value: "0", icon: BriefcaseBusiness },
    { title: "Total Applicants", value: "0", icon: Users },
    { title: "Shortlisted", value: "0", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#080d1a] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <h1 className="text-2xl font-bold text-cyan-400">
          SmartHire AI
        </h1>

        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20"
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-cyan-400">Recruiter Dashboard</p>

          <h2 className="mt-2 text-3xl font-bold">
            Welcome, {user?.full_name || "Recruiter"}!
          </h2>

          <p className="mt-2 text-gray-400">
            Manage job postings and discover talented candidates.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <stat.icon className="mb-4 text-cyan-400" size={28} />

              <p className="text-gray-400">{stat.title}</p>

              <h3 className="mt-2 text-3xl font-bold">
                {stat.value}
              </h3>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <PlusCircle className="mb-4 text-cyan-400" size={28} />

            <h3 className="text-xl font-semibold">Post a Job</h3>

            <p className="mt-2 text-gray-400">
              Create job openings and attract qualified candidates.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <Bell className="mb-4 text-cyan-400" size={28} />

            <h3 className="text-xl font-semibold">Notifications</h3>

            <p className="mt-2 text-gray-400">
              Stay updated about applications and candidate activity.
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Account: {user?.email}
        </p>
      </main>
    </div>
  );
};

export default RecruiterDashboard;