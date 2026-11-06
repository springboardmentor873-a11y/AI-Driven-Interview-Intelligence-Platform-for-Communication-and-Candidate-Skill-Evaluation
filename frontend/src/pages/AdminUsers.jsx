import { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import client from "../api/client";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/api/auth/users/")
      .then((res) => setUsers(res.data))
      .catch(() => setError("Could not load users."));
  }, []);

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-extrabold">Users</h1>
        {error && <p className="mt-4 text-red-400">{error}</p>}
        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">{`${u.first_name} ${u.last_name}`.trim() || "-"}</td>
                  <td className="px-5 py-4">{u.email}</td>
                  <td className="px-5 py-4 capitalize">{u.role}</td>
                  <td className="px-5 py-4">{u.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}