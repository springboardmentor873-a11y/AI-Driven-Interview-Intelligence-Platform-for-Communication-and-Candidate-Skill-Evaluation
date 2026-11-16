
import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck2,
  Info,
  FileType,
  Sparkles,
  Loader2,
  X,
  BrainCircuit,
} from "lucide-react";

import {
  uploadResume,
  getMyResume,
  getMyResumeSkills,
  extractResumeSkills,
  type UploadedResume,
  type ResumeSkillsResponse,
} from "../api/auth";

function MyResume() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadedResume, setUploadedResume] =
    useState<UploadedResume | null>(null);

  const [resumeSkills, setResumeSkills] =
    useState<ResumeSkillsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [skillsError, setSkillsError] = useState("");
  const [skillsSuccess, setSkillsSuccess] = useState("");

  // Fetch existing resume
  const fetchResume = async () => {
    try {
      const response = await getMyResume();
      setUploadedResume(response.resume);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to fetch resume details."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch already extracted skills
  const fetchSkills = async () => {
    setSkillsLoading(true);

    try {
      const response = await getMyResumeSkills();

      setResumeSkills(response);
      setSkillsError("");
    } catch (err: any) {
      setResumeSkills(null);

      setSkillsError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to fetch extracted skills."
      );
    } finally {
      setSkillsLoading(false);
    }
  };

  useEffect(() => {
    fetchResume();
    fetchSkills();
  }, []);

  // Select PDF file
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");
    setSkillsError("");
    setSkillsSuccess("");

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are allowed.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must not exceed 5 MB.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    // Allows selecting the same file again
    event.target.value = "";
  };

  // Remove selected file
  const handleRemoveSelection = () => {
    setSelectedFile(null);
    setError("");
    setSuccess("");
    setSkillsError("");
    setSkillsSuccess("");
  };

  // Upload / Replace resume and automatically extract skills
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a PDF resume first.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setSkillsError("");
    setSkillsSuccess("");

    try {
      // STEP 1: Upload or replace resume
      const uploadResponse = await uploadResume(selectedFile);

      setUploadedResume(uploadResponse.resume);
      setSelectedFile(null);

      setSuccess(
        uploadResponse.message || "Resume uploaded successfully!"
      );

      // STEP 2: Clear previous skills from the UI
      setResumeSkills(null);

      // STEP 3: Start AI skill extraction
      setSkillsLoading(true);

      try {
        await extractResumeSkills();

        // STEP 4: Fetch newly extracted skills
        const updatedSkills = await getMyResumeSkills();

        setResumeSkills(updatedSkills);
        setSkillsError("");

        setSkillsSuccess(
          "Your new resume has been analyzed successfully!"
        );
      } catch (skillErr: any) {
        setResumeSkills(null);

        setSkillsError(
          skillErr.response?.data?.detail ||
            skillErr.message ||
            "Resume uploaded, but AI skill extraction failed. Please try again."
        );
      } finally {
        setSkillsLoading(false);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Resume upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // Skill categories
  const skillCategories = resumeSkills
    ? [
        {
          title: "Programming Languages",
          skills: resumeSkills.skills.programming_languages,
        },
        {
          title: "Frameworks & Libraries",
          skills: resumeSkills.skills.frameworks_and_libraries,
        },
        {
          title: "Databases",
          skills: resumeSkills.skills.databases,
        },
        {
          title: "Tools & Platforms",
          skills: resumeSkills.skills.tools_and_platforms,
        },
        {
          title: "Core Concepts",
          skills: resumeSkills.skills.core_concepts,
        },
        {
          title: "Soft Skills",
          skills: resumeSkills.skills.soft_skills,
        },
        {
          title: "Other Skills",
          skills: resumeSkills.skills.other_skills,
        },
      ]
    : [];

  const totalSkills = skillCategories.reduce(
    (total, category) => total + category.skills.length,
    0
  );

  const formattedDate = uploadedResume
    ? new Date(uploadedResume.uploaded_at).toLocaleString()
    : "Not Available";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link
            to="/candidate/dashboard"
            className="p-2 rounded-lg hover:bg-slate-100 text-[#172554] transition"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-[#172554]">
              My Resume
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Manage your resume and track your resume status
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-7">
        {/* Introduction */}
        <section>
          <h2 className="text-xl font-bold text-[#172554]">
            Resume Management
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            Keep your professional resume updated for interview preparation
            and future job opportunities.
          </p>
        </section>

        {/* Resume Overview */}
        <section>
          <h2 className="text-lg font-semibold text-[#172554] mb-4">
            Resume Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Resume Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Resume Status
                </p>

                <FileText className="text-teal-700" size={22} />
              </div>

              <h3 className="text-xl font-bold text-[#172554] mt-3">
                {loading
                  ? "Checking..."
                  : uploadedResume
                    ? "Uploaded"
                    : "Not Uploaded"}
              </h3>

              <p className="text-xs text-slate-400 mt-2">
                {uploadedResume
                  ? "Your resume is available"
                  : "No resume has been added yet"}
              </p>
            </div>

            {/* Last Updated */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Last Updated
                </p>

                <Clock className="text-teal-700" size={22} />
              </div>

              <h3 className="text-base font-bold text-[#172554] mt-3">
                {loading ? "Checking..." : formattedDate}
              </h3>

              <p className="text-xs text-slate-400 mt-2">
                Latest resume upload date
              </p>
            </div>

            {/* Resume Security */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Resume Security
                </p>

                <ShieldCheck className="text-teal-700" size={22} />
              </div>

              <h3 className="text-xl font-bold text-[#172554] mt-3">
                Protected
              </h3>

              <p className="text-xs text-slate-400 mt-2">
                Secure access for candidate resume data
              </p>
            </div>
          </div>
        </section>

        {/* Upload / Replace Resume */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-[#172554]">
            {uploadedResume ? "Manage Your Resume" : "Upload Your Resume"}
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {uploadedResume
              ? "You can replace your existing resume whenever you want."
              : "Add your latest resume to your SmartHire AI profile."}
          </p>

          <div className="mt-6 border-2 border-dashed border-teal-300 rounded-xl bg-[#F0FDFA] p-8 md:p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <UploadCloud size={32} className="text-teal-700" />
            </div>

            {loading ? (
              <div className="mt-5">
                <Loader2
                  size={25}
                  className="animate-spin text-teal-700 mx-auto"
                />

                <p className="text-sm text-slate-500 mt-3">
                  Checking your resume...
                </p>
              </div>
            ) : (
              <>
                {uploadedResume ? (
                  <>
                    <h3 className="text-lg font-semibold text-teal-700 mt-4">
                      Current Resume
                    </h3>

                    <div className="max-w-md mx-auto mt-5 bg-white border border-teal-200 rounded-lg p-4 flex items-center gap-3 text-left">
                      <FileText className="text-teal-700" size={28} />

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#172554] truncate">
                          {uploadedResume.file_name}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          Resume ID: {uploadedResume.id}
                        </p>
                      </div>

                      <CheckCircle2 className="text-teal-600" size={22} />
                    </div>

                    <p className="text-sm text-slate-500 mt-4">
                      Your resume is saved securely in your profile.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-[#172554] mt-4">
                      Select Your Resume
                    </h3>

                    <p className="text-sm text-slate-500 mt-2">
                      Choose your professional resume in PDF format.
                    </p>
                  </>
                )}

                {/* Choose PDF */}
                <label className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-lg bg-[#172554] hover:bg-[#1E3A8A] text-white text-sm font-medium cursor-pointer transition">
                  <UploadCloud size={18} />

                  {uploadedResume
                    ? "Choose Replacement Resume"
                    : "Choose PDF File"}

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </>
            )}

            {/* Selected File */}
            {selectedFile && !loading && (
              <div className="max-w-md mx-auto mt-5 bg-white border border-teal-200 rounded-lg p-3 flex items-center gap-3 text-left">
                <FileText className="text-teal-700" size={25} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#172554] truncate">
                    {selectedFile.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveSelection}
                  disabled={uploading}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={19} />
                </button>
              </div>
            )}

            {/* Upload Error */}
            {error && (
              <p className="text-sm text-red-600 mt-4">
                {error}
              </p>
            )}

            {/* Upload Success */}
            {success && (
              <p className="text-sm text-teal-700 font-medium mt-4">
                {success}
              </p>
            )}

            {/* Upload / Replace Button */}
            {selectedFile && !loading && (
              <div>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-2 mt-5 px-7 py-3 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-medium transition"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {uploadedResume ? "Replacing..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      {uploadedResume ? "Replace Resume" : "Upload Resume"}
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <FileType size={15} />
                PDF format
              </span>

              <span>Maximum size: 5 MB</span>

              <span>One resume per profile</span>
            </div>
          </div>
        </section>

        {/* AI Extracted Skills */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                <BrainCircuit size={25} className="text-teal-700" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#172554]">
                  AI Extracted Skills
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Skills identified from your resume using Gemini AI
                </p>
              </div>
            </div>

            {resumeSkills && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
                <CheckCircle2 size={15} />
                Analysis Completed
              </span>
            )}
          </div>

          {skillsLoading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2
                size={23}
                className="animate-spin text-teal-700"
              />

              <p className="text-sm text-slate-500">
                {uploading
                  ? "Analyzing your new resume with Gemini AI..."
                  : "Fetching your extracted skills..."}
              </p>
            </div>
          ) : skillsError ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-7 text-center">
              <Info size={28} className="text-slate-400 mx-auto" />

              <h3 className="font-semibold text-[#172554] mt-3">
                Skills Not Available
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                {skillsError === "Resume skills not extracted yet"
                  ? "Your current resume has not been analyzed yet."
                  : skillsError}
              </p>

              <p className="text-xs text-slate-400 mt-2">
                You can replace your resume to start a fresh analysis.
              </p>
            </div>
          ) : resumeSkills ? (
            <>
              {/* Skills extraction success */}
              {skillsSuccess && (
                <p className="text-sm text-teal-700 font-medium mb-5">
                  <CheckCircle2 size={16} className="inline mr-1" />
                  {skillsSuccess}
                </p>
              )}

              {/* Skills Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl bg-[#F0FDFA] border border-teal-100 p-4">
                  <p className="text-xs text-slate-500">
                    Total Skills
                  </p>

                  <h3 className="text-2xl font-bold text-[#172554] mt-1">
                    {totalSkills}
                  </h3>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">
                    Categories
                  </p>

                  <h3 className="text-2xl font-bold text-[#172554] mt-1">
                    {skillCategories.length}
                  </h3>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 col-span-2">
                  <p className="text-xs text-slate-500">
                    Analyzed Resume
                  </p>

                  <p className="text-sm font-semibold text-[#172554] mt-2 truncate">
                    {resumeSkills.file_name}
                  </p>
                </div>
              </div>

              {/* Skill Categories */}
              <div className="space-y-5">
                {skillCategories.map((category, index) => (
                  <div
                    key={category.title}
                    className="border border-slate-100 rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>

                        <h3 className="font-semibold text-[#172554]">
                          {category.title}
                        </h3>
                      </div>

                      <span className="text-xs text-slate-400">
                        {category.skills.length} skills
                      </span>
                    </div>

                    {category.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {category.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-2 rounded-lg bg-[#F0FDFA] border border-teal-100 text-teal-800 text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No skills identified in this category.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Analysis Date */}
              <div className="border-t border-slate-100 pt-4 mt-6 flex flex-wrap justify-between gap-2">
                <p className="text-xs text-slate-400">
                  Resume ID: {resumeSkills.resume_id}
                </p>

                <p className="text-xs text-slate-400">
                  Last analyzed:{" "}
                  {new Date(resumeSkills.updated_at).toLocaleString()}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <Sparkles
                size={35}
                className="text-teal-600 mx-auto"
              />

              <h3 className="font-semibold text-[#172554] mt-3">
                No Extracted Skills Available
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Upload and analyze your resume to see your skills here.
              </p>
            </div>
          )}
        </section>

        {/* Resume Guidelines */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Info size={21} className="text-teal-700" />

            <h2 className="text-lg font-semibold text-[#172554]">
              Resume Guidelines
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex gap-3 items-start">
              <FileCheck2 className="text-teal-700 mt-1" size={20} />

              <div>
                <h3 className="font-medium text-[#172554]">
                  Keep Your Resume Updated
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Include your latest education, skills and project experience.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <ShieldCheck className="text-teal-700 mt-1" size={20} />

              <div>
                <h3 className="font-medium text-[#172554]">
                  Use Correct Information
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Make sure your contact and academic details are accurate.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <FileText className="text-teal-700 mt-1" size={20} />

              <div>
                <h3 className="font-medium text-[#172554]">
                  Use a Clear Format
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Prefer a clean, readable and professional resume layout.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Sparkles className="text-teal-700 mt-1" size={20} />

              <div>
                <h3 className="font-medium text-[#172554]">
                  AI Resume Assistance
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  SmartHire AI uses Gemini AI to identify skills from your
                  uploaded resume automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-[#172554] mb-6">
            Resume Management Workflow
          </h2>

          <div className="space-y-6">
            {[
              "Resume Section Created",
              "Resume Upload and Replacement",
              "AI Resume Processing",
            ].map((item) => (
              <div key={item} className="flex gap-4 items-start">
                <CheckCircle2
                  className="text-teal-600 mt-1"
                  size={22}
                />

                <div>
                  <h3 className="font-medium text-[#172554]">
                    {item}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {item === "Resume Section Created"
                      ? "Candidate can access the resume management section."
                      : item === "Resume Upload and Replacement"
                        ? "Candidate can upload or replace a PDF resume."
                        : "Gemini AI extracts resume skills and stores them in the database."}
                  </p>

                  <span className="text-xs text-teal-700 font-medium mt-2 inline-block">
                    Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default MyResume;
