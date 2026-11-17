import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const load = () => api.get("/api/users").then((r) => setUsers(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);

  const toggle = async (u) => {
    try { await api.patch(`/api/users/${u.id}/active`, null, { params: { is_active: !u.is_active } }); load(); }
    catch (e) { setError(errorMessage(e)); }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Users</h1>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <table className="w-full bg-white rounded-xl overflow-hidden border border-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="p-3">{u.full_name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">
                <button onClick={() => toggle(u)} className="text-accent font-medium">
                  {u.is_active ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
