import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { downloadResume, fmtSize } from "./Resumes";

export default function Candidates() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/users/candidates").then((r) => setList(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  const toggle = async (id) => {
    if (open === id) return setOpen(null);
    try { setResumes((await api.get(`/api/resumes/candidate/${id}`)).data); setOpen(id); }
    catch (e) { setError(errorMessage(e)); }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Candidates</h1>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {list.length === 0 && !error && <p className="text-slate-500">No candidates have registered yet.</p>}
      <ul className="space-y-3">
        {list.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{c.full_name}</p>
                <p className="text-sm text-slate-500">{c.email}</p>
              </div>
              <button className="text-accent text-sm font-medium" onClick={() => toggle(c.id)}>
                {open === c.id ? "Hide resumes" : "View resumes"}
              </button>
            </div>
            {open === c.id && (
              <ul className="mt-3 border-t border-slate-100 pt-3 space-y-2 text-sm">
                {resumes.length === 0 && <li className="text-slate-500">No resumes uploaded.</li>}
                {resumes.map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <span>{r.filename}{r.is_active && " (primary)"} · {fmtSize(r.size_bytes)}</span>
                    <button className="text-accent font-medium" onClick={() => downloadResume(r)}>Download</button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
