import { useEffect, useRef, useState } from "react";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  AlertCircle,
  FileCheck,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { PageHeading, SectionTitle, Badge, EmptyState } from "../components/UI";
import { candidateApi } from "../lib/api";

export default function Resume() {
  const fileInputRef = useRef(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchResumes = () => {
    setLoading(true);
    candidateApi
      .getResumes()
      .then((res) => {
        setResumes(res.data || []);
      })
      .catch(() => {
        setResumes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFile = async (file) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Please upload a valid PDF document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Resume file size cannot exceed 10 MB.");
      return;
    }

    setUploading(true);
    try {
      await candidateApi.uploadResume({
        filename: file.name,
        file_size: file.size,
        content_type: file.type || "application/pdf",
      });
      setSuccessMsg(`Resume "${file.name}" uploaded successfully.`);
      fetchResumes();
    } catch (err) {
      setErrorMsg(err.message || "Failed to upload resume. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this resume?")) return;
    try {
      await candidateApi.deleteResume(id);
      setSuccessMsg("Resume removed.");
      fetchResumes();
    } catch (err) {
      setErrorMsg(err.message || "Failed to remove resume.");
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeading
        eyebrow="CANDIDATE ASSETS"
        title="Resume Management"
        description="Upload and manage your professional resume. Resumes provide context for tailored interview evaluation and recruiter discovery."
      />

      {successMsg && (
        <div className="mb-6 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center justify-between border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg("")}
            className="text-emerald-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center justify-between border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg("")}
            className="text-red-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone */}
      <div className="panel mb-7">
        <SectionTitle
          title="Upload Resume Document"
          subtitle="Accepted format: PDF · Maximum recommended size: 10 MB"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
            dragActive
              ? "border-indigo-600 bg-indigo-50/50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="h-12 w-12 rounded-xl bg-white text-indigo-600 border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-3">
            <UploadCloud size={24} />
          </div>

          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {uploading ? "Uploading resume..." : "Choose a file or drag & drop here"}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Upload your resume in PDF format to make it available for your profile.
          </p>
          <button
            type="button"
            disabled={uploading}
            className="btn-secondary text-xs"
          >
            <span>Browse Files</span>
          </button>
        </div>
      </div>

      {/* Saved Resumes List */}
      <div className="panel mb-7">
        <SectionTitle
          title="Uploaded Resumes"
          subtitle={
            resumes.length > 0
              ? `${resumes.length} resume(s) registered in your profile`
              : "Your uploaded resumes will be listed here"
          }
        />

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Checking saved resumes...
          </div>
        ) : resumes.length > 0 ? (
          <div className="space-y-3">
            {resumes.map((r) => (
              <div
                key={r.id}
                className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-100">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                      {r.filename}
                    </h4>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span>{(r.file_size / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>Uploaded {new Date(r.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <Badge variant="blue">PDF</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="icon-btn text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete resume"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="Upload your resume to get started"
            description="When you upload your resume, it will be saved in your candidate profile and made available during recruiter discovery."
            action={
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary text-xs"
              >
                <UploadCloud size={14} />
                <span>Select PDF File</span>
              </button>
            }
          />
        )}
      </div>

      {/* Honest AI Capability Status Note */}
      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <ShieldCheck size={16} className="text-slate-600" />
          <span>Resume Processing & Privacy Notice</span>
        </div>
        <p className="leading-relaxed">
          Your uploaded resume metadata is securely stored with your candidate account.
          Automated AI skill extraction is awaiting backend model integration; candidate
          documents are directly accessible to authorized recruiters reviewing your profile.
        </p>
      </div>
    </div>
  );
}
