import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";

export const downloadResume = async (r) => {
  const res = await api.get(`/api/resumes/${r.id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url; a.download = r.filename; a.click();
  URL.revokeObjectURL(url);
};

export const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function Resumes() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef();

  const load = () => api.get("/api/resumes").then((r) => setItems(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);

  const run = async (fn) => {
    setError("");
    try { await fn(); await load(); } catch (e) { setError(errorMessage(e)); }
  };

  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    run(() => api.post("/api/resumes", form)).finally(() => { setBusy(false); input.current.value = ""; });
  };

  return (
    <>
      <h1 className="text-2xl font-semibold">My resumes</h1>
      <p className="text-slate-500 mb-6">PDF only, up to 5 MB. Your primary resume is used to build interview questions.</p>

      <label className="block rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center cursor-pointer hover:border-accent">
        <span className="font-medium">{busy ? "Uploading…" : "Choose a PDF to upload"}</span>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={upload} disabled={busy} />
      </label>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {items.length === 0 ? (
        <p className="text-slate-500 mt-6">No resumes yet. Upload one to get started.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-medium">
                  {r.filename}
                  {r.is_active && <span className="ml-2 rounded-full bg-green-100 text-green-700 text-xs px-2 py-0.5">Primary</span>}
                </p>
                <p className="text-sm text-slate-500">
                  {r.page_count} page{r.page_count === 1 ? "" : "s"} · {fmtSize(r.size_bytes)} · {new Date(r.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-4 text-sm font-medium">
                {!r.is_active && <button className="text-accent" onClick={() => run(() => api.patch(`/api/resumes/${r.id}/active`))}>Make primary</button>}
                <button className="text-accent" onClick={() => run(() => downloadResume(r))}>Download</button>
                <button className="text-red-600" onClick={() => window.confirm("Delete this resume?") && run(() => api.delete(`/api/resumes/${r.id}`))}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
