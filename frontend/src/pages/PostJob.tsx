
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Loader2,
  Send,
} from "lucide-react";

import { createJob } from "../api/jobs";
import type { JobCreateData } from "../api/jobs";

function PostJob() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<JobCreateData>({
    title: "",
    description: "",
    location: "",
    employment_type: "Full-time",
    experience_required: "",
    salary_min: null,
    salary_max: null,
    skills_required: "",
  });

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "salary_min" || name === "salary_max"
          ? value === ""
            ? null
            : Number(value)
          : value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      formData.salary_min != null &&
      formData.salary_max != null &&
      formData.salary_min > formData.salary_max
    ) {
      setError("Minimum salary cannot exceed maximum salary.");
      return;
    }

    try {
      setLoading(true);

      await createJob(formData);

      setSuccess("Job posted successfully!");

      setTimeout(() => {
        navigate("/recruiter/jobs");
      }, 1000);

    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to post job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">

          <Link
            to="/recruiter/dashboard"
            className="text-gray-500 hover:text-[#172554]"
          >
            <ArrowLeft size={22} />
          </Link>

          <div className="flex items-center gap-2">
            <BriefcaseBusiness
              size={25}
              className="text-teal-700"
            />

            <h1 className="text-xl font-bold text-[#172554]">
              Post a New Job
            </h1>
          </div>

        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">

          <h2 className="text-2xl font-bold text-[#172554]">
            Job Details
          </h2>

          <p className="text-gray-500 mt-2 mb-7">
            Fill in the details below to publish your job opening.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Job Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Title *
              </label>

              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Junior Software Developer"
                required
                maxLength={150}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Description *
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the job responsibilities and requirements..."
                required
                minLength={20}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600 resize-y"
              />
            </div>

            {/* Location and Employment Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location *
                </label>

                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Jaipur, Rajasthan"
                  required
                  maxLength={150}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Employment Type *
                </label>

                <select
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Experience Required
              </label>

              <input
                type="text"
                name="experience_required"
                value={formData.experience_required || ""}
                onChange={handleChange}
                placeholder="e.g. Fresher / 0-2 Years"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Salary Range (Annual, INR)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <input
                  type="number"
                  name="salary_min"
                  value={formData.salary_min ?? ""}
                  onChange={handleChange}
                  min="0"
                  placeholder="Minimum Salary"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600"
                />

                <input
                  type="number"
                  name="salary_max"
                  value={formData.salary_max ?? ""}
                  onChange={handleChange}
                  min="0"
                  placeholder="Maximum Salary"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600"
                />

              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Required Skills
              </label>

              <textarea
                name="skills_required"
                value={formData.skills_required || ""}
                onChange={handleChange}
                placeholder="e.g. Java, React, Python, SQL"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-600 resize-y"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-lg p-3 text-sm">
                {success}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">

              <Link
                to="/recruiter/dashboard"
                className="px-6 py-3 text-center rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Publish Job
                  </>
                )}
              </button>

            </div>

          </form>

        </div>

      </main>

    </div>
  );
}

export default PostJob;
