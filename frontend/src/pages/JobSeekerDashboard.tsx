
import { useEffect, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Bookmark,
  UserRound,
  Search,
  Bell,
  LogOut,
  Upload,
  Trash2,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  ScanSearch,
  BriefcaseBusiness,
  LoaderCircle,
  GraduationCap,
  Code2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import {
  uploadResume,
  getMyResumes,
  deleteResume,
  parseResume,
  type ParsedResume,
} from "../services/resumeService";

type Resume = Awaited<ReturnType<typeof getMyResumes>>[number];

const JobSeekerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsingResumeId, setParsingResumeId] = useState<number | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = [
    { title: "Applications", value: "0", icon: FileText },
    { title: "Saved Jobs", value: "0", icon: Bookmark },
    { title: "Profile Views", value: "0", icon: UserRound },
  ];

  const loadResumes = async () => {
    try {
      setError("");
      const data = await getMyResumes();
      setResumes(data);
    } catch {
      setError("Unable to load resumes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["pdf", "docx"].includes(extension || "")) {
      setError("Only PDF and DOCX files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must not exceed 5 MB.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");
      setParsedResume(null);

      await uploadResume(file);

      setMessage("Resume uploaded successfully!");
      await loadResumes();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Resume upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleParse = async (resumeId: number) => {
    try {
      setParsingResumeId(resumeId);
      setError("");
      setMessage("");
      setParsedResume(null);

      const result = await parseResume(resumeId);

      setParsedResume(result);
      setMessage("Resume analyzed successfully!");
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message;

      setError(
        typeof detail === "string"
          ? detail
          : "Resume parsing failed. Please try again."
      );
    } finally {
      setParsingResumeId(null);
    }
  };

  const handleDelete = async (resumeId: number) => {
    try {
      setError("");
      setMessage("");

      await deleteResume(resumeId);

      if (parsedResume?.resume_id === resumeId) {
        setParsedResume(null);
      }

      setMessage("Resume deleted successfully!");
      await loadResumes();
    } catch {
      setError("Unable to delete resume.");
    }
  };

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
          <p className="text-cyan-400">Job Seeker Dashboard</p>

          <h2 className="mt-2 text-3xl font-bold">
            Welcome, {user?.full_name || "User"}!
          </h2>

          <p className="mt-2 text-gray-400">
            Find opportunities and manage your career with SmartHire AI.
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
              <h3 className="mt-2 text-3xl font-bold">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* AI Interview Section */}
        <motion.section
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative mt-8 overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-900/30 via-[#111a32] to-cyan-900/20 p-7 md:p-9"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-lg bg-purple-400/15 p-2 text-purple-300">
                  <BrainCircuit size={27} />
                </span>

                <span className="text-sm font-semibold uppercase tracking-wider text-purple-300">
                  SmartHire AI Feature
                </span>
              </div>

              <h3 className="text-2xl font-bold md:text-3xl">
                Prepare for Your Next Interview
              </h3>

              <p className="mt-3 leading-relaxed text-gray-300">
                Practice technical, HR, behavioral, and aptitude interviews.
                Choose your difficulty level and get ready for your next
                opportunity.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-cyan-300" />
                  Multiple Interview Types
                </span>

                <span className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-cyan-300" />
                  Flexible Difficulty
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/interviews")}
              className="group flex shrink-0 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 px-6 py-4 font-semibold shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.03] hover:shadow-purple-500/20"
            >
              Start AI Interview
              <ArrowRight
                size={19}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </div>
        </motion.section>

        {/* Resume Management */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-7">
          <div className="flex items-center gap-3">
            <FileText className="text-cyan-400" size={28} />
            <h3 className="text-xl font-semibold">My Resumes</h3>
          </div>

          <p className="mt-2 text-gray-400">
            Upload, manage and analyze your resumes using AI.
          </p>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-cyan-400/30 bg-cyan-400/5 p-8 text-center hover:bg-cyan-400/10">
            <Upload className="mb-3 text-cyan-400" size={32} />

            <span className="font-medium">
              {uploading ? "Uploading..." : "Click to upload your resume"}
            </span>

            <span className="mt-2 text-sm text-gray-400">
              PDF or DOCX - Maximum 5 MB
            </span>

            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>

          {message && (
            <p className="mt-4 text-sm text-green-400">{message}</p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}

          <div className="mt-6">
            <h4 className="mb-4 font-semibold">Uploaded Resumes</h4>

            {loading ? (
              <p className="text-gray-400">Loading resumes...</p>
            ) : resumes.length === 0 ? (
              <p className="text-gray-400">No resumes uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="shrink-0 text-cyan-400" size={24} />

                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {resume.original_filename}
                        </p>

                        <p className="text-sm text-gray-400">
                          {resume.file_type} -{" "}
                          {new Date(resume.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleParse(resume.id)}
                        disabled={parsingResumeId !== null || uploading}
                        className="flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {parsingResumeId === resume.id ? (
                          <>
                            <LoaderCircle size={16} className="animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <ScanSearch size={16} />
                            Analyze Resume
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(resume.id)}
                        disabled={parsingResumeId !== null}
                        className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        title="Delete resume"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Resume Analysis Results */}
          {parsedResume && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <BrainCircuit className="text-cyan-400" size={27} />

                <div>
                  <h3 className="text-xl font-semibold">
                    AI Resume Analysis
                  </h3>

                  <p className="text-sm text-gray-400">
                    {parsedResume.filename}
                  </p>
                </div>
              </div>

              {/* Analysis Statistics */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">
                    Extracted Characters
                  </p>

                  <h4 className="mt-2 text-2xl font-bold text-cyan-400">
                    {parsedResume.character_count.toLocaleString()}
                  </h4>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">
                    Technical Skills Found
                  </p>

                  <h4 className="mt-2 text-2xl font-bold text-cyan-400">
                    {parsedResume.skills.length}
                  </h4>
                </div>
              </div>

              {/* Extracted Skills */}
              <div>
                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="text-cyan-400" size={20} />
                  Technical Skills
                </h4>

                {parsedResume.skills.length === 0 ? (
                  <p className="text-gray-400">
                    No technical skills were identified in this resume.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {parsedResume.skills.map((skill, index) => (
                      <div
                        key={`${skill.name}-${index}`}
                        className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-cyan-300">
                            {skill.name}
                          </span>

                          <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-gray-300">
                            {skill.category.replace(/_/g, " ")}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-400">
                          Evidence: {skill.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Education */}
              <div>
                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <GraduationCap className="text-emerald-400" size={21} />
                  Education
                </h4>

                {parsedResume.education.length === 0 ? (
                  <p className="text-gray-400">
                    No education details were identified in this resume.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {parsedResume.education.map((education, index) => (
                      <div
                        key={`${education.institution}-${index}`}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5"
                      >
                        <h5 className="font-semibold text-emerald-300">
                          {education.degree}
                        </h5>

                        <p className="mt-1 text-gray-300">
                          {education.field_of_study}
                        </p>

                        <p className="mt-2 text-sm text-gray-400">
                          {education.institution}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                          <span>
                            Duration: {education.start_year} -{" "}
                            {education.graduation_year}
                          </span>

                          {education.cgpa_or_percentage && (
                            <span>
                              CGPA / Percentage: {education.cgpa_or_percentage}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Technologies */}
              <div>
                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Code2 className="text-cyan-400" size={21} />
                  Technologies
                </h4>

                {parsedResume.technologies.length === 0 ? (
                  <p className="text-gray-400">
                    No technologies were identified in this resume.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {parsedResume.technologies.map((technology, index) => (
                      <div
                        key={`${technology.name}-${index}`}
                        className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4"
                      >
                        <p className="font-semibold text-cyan-300">
                          {technology.name}
                        </p>

                        <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                          {technology.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Experience */}
              <div>
                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <BriefcaseBusiness className="text-purple-400" size={20} />
                  Work Experience & Internships
                </h4>

                {parsedResume.experiences.length === 0 ? (
                  <p className="text-gray-400">
                    No work experience or internships were identified in this
                    resume.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {parsedResume.experiences.map((experience, index) => (
                      <div
                        key={`${experience.organization}-${index}`}
                        className="rounded-xl border border-purple-400/20 bg-purple-400/5 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h5 className="font-semibold text-purple-300">
                              {experience.job_title}
                            </h5>

                            <p className="mt-1 text-gray-300">
                              {experience.organization}
                            </p>
                          </div>

                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                            {experience.experience_type.replace(/_/g, " ")}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-gray-400">
                          {experience.start_date} - {experience.end_date}
                        </p>

                        <p className="mt-3 text-sm leading-relaxed text-gray-300">
                          {experience.description}
                        </p>

                        <p className="mt-3 text-sm text-gray-400">
                          Evidence: {experience.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Original Extracted Resume Text */}
              <details className="rounded-xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer font-medium text-gray-300 hover:text-cyan-400">
                  View Extracted Resume Text
                </summary>

                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-400">
                  {parsedResume.extracted_text}
                </pre>
              </details>
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <Search className="mb-4 text-cyan-400" size={28} />
            <h3 className="text-xl font-semibold">Find Jobs</h3>

            <p className="mt-2 text-gray-400">
              Explore job opportunities that match your skills.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <Bell className="mb-4 text-cyan-400" size={28} />
            <h3 className="text-xl font-semibold">Notifications</h3>

            <p className="mt-2 text-gray-400">
              Stay updated about your applications and opportunities.
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

export default JobSeekerDashboard;
