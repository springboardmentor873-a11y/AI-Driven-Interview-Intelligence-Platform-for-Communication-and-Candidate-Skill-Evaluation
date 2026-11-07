import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import client from "../api/client";
import { parseError } from "../utils/errors";

const formatSize = (bytes) => {
  if (!bytes) return "-";
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function Resumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get("/api/resumes/");
      setResumes(data);
    } catch {
      setError("Could not load your resumes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await client.post("/api/resumes/", form);
      await load();
    } catch (err) {
      const { fields, general } = parseError(err);
      setError(fields.file || general || "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const view = async (id) => {
    setError("");
    try {
      const res = await client.get(`/api/resumes/${id}/download/`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("Could not open this resume.");
    }
  };

  const makePrimary = async (id) => {
    setError("");
    try {
      await client.post(`/api/resumes/${id}/set-primary/`);
      await load();
    } catch {
      setError("Could not change the primary resume.");
    }
  };

  const remove = async (resume) => {
    if (!window.confirm(`Delete "${resume.original_name}"?`)) return;
    setError("");
    try {
      await client.delete(`/api/resumes/${resume.id}/`);
      await load();
    } catch {
      setError("Could not delete this resume.");
    }
  };

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-extrabold">My resumes</h1>
        <p className="mt-2 text-white/60">
          Upload your PDF resume. Your primary resume is the one used to build interview
          questions.
        </p>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files[0]);
          }}
          className={`mt-6 cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
            dragging
              ? "border-brand-400 bg-brand-500/10"
              : "border-white/20 bg-surface hover:border-brand-500/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => upload(e.target.files[0])}
          />
          <p className="text-lg font-semibold">
            {uploading ? "Uploading..." : "Drop your PDF here or click to browse"}
          </p>
          <p className="mt-1 text-sm text-white/50">PDF only, up to 5 MB, maximum 5 resumes</p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        )}

        <div className="mt-8 space-y-3">
          {loading && <p className="text-white/50">Loading...</p>}
          {!loading && resumes.length === 0 && (
            <p className="text-white/50">No resumes yet. Upload your first one above.</p>
          )}
          {resumes.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-surface p-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <p className="truncate font-semibold">{r.original_name}</p>
                  {r.is_primary && (
                    <span className="rounded-full bg-brand-500/20 px-3 py-0.5 text-xs font-semibold text-brand-400">
                      Primary
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/50">
                  {formatSize(r.size)} · Uploaded {formatDate(r.uploaded_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="solid" className="!px-4 !py-2 text-sm" onClick={() => view(r.id)}>
                  View
                </Button>
                {!r.is_primary && (
                  <Button variant="ghost" className="!px-4 !py-2 text-sm" onClick={() => makePrimary(r.id)}>
                    Set primary
                  </Button>
                )}
                <Button variant="ghost" className="!px-4 !py-2 text-sm !text-red-400" onClick={() => remove(r)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}