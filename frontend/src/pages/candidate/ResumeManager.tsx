import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Trash2, Loader2, Sparkles, Briefcase, GraduationCap, Code } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { Resume } from '../../types';

export default function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  const fetchResumes = async () => {
    try {
      const { data } = await api.get('/resumes/');
      setResumes(data);
      if (data.length > 0 && !selectedResume) {
        setSelectedResume(data[0]);
      }
    } catch (err: any) {
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const { data } = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(data.message || 'Resume uploaded successfully!');
      await fetchResumes();
      setSelectedResume(data.resume);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload resume');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await api.delete(`/resumes/${id}`);
      toast.success('Resume deleted');
      const updated = resumes.filter(r => r.id !== id);
      setResumes(updated);
      setSelectedResume(updated.length > 0 ? updated[0] : null);
    } catch (err: any) {
      toast.error('Failed to delete resume');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume & Skill Intelligence</h1>
          <p className="text-sm text-gray-500">
            Upload your resume (PDF or TXT) to automatically extract skills, experience, and generate interview readiness insights.
          </p>
        </div>

        <div>
          <label className="btn-primary cursor-pointer flex items-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Resume
              </>
            )}
            <input
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No Resumes Uploaded Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            Upload your PDF or Text resume to trigger automated AI skill parsing, tech stack detection, and interview profile generation.
          </p>
          <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Your First Resume
            <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resume List sidebar */}
          <div className="space-y-3 lg:col-span-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Uploaded Documents</h3>
            {resumes.map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedResume(r)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  selectedResume?.id === r.id
                    ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.filename}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.uploaded_at).toLocaleDateString()} • {(r.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Delete resume"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Extracted Details View */}
          {selectedResume && (
            <div className="lg:col-span-2 space-y-6">
              {/* Summary card */}
              <div className="card space-y-4">
                <div className="flex items-center gap-2 text-primary-700 font-semibold text-lg border-b pb-3">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                  AI-Generated Profile Summary
                </div>
                <p className="text-sm text-gray-700 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  {selectedResume.summary || 'Summary could not be determined.'}
                </p>
              </div>

              {/* Skills and Tech Stack */}
              <div className="card space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b pb-3">
                  <Code className="h-5 w-5 text-purple-600" />
                  Extracted Skills & Technologies ({selectedResume.skills.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedResume.skills.map((skill, i) => (
                    <span key={i} className="badge-blue text-xs px-3 py-1 font-medium">
                      {skill}
                    </span>
                  ))}
                </div>

                {selectedResume.technologies.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Core Frameworks & Stacks
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResume.technologies.map((tech, i) => (
                        <span key={i} className="badge-purple text-xs px-2.5 py-1">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Experience and Education breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card space-y-3">
                  <div className="flex items-center gap-2 text-gray-900 font-bold border-b pb-2">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    Experience Analysis
                  </div>
                  <div>
                    <span className="text-2xl font-extrabold text-emerald-600">
                      {selectedResume.experience_years}
                    </span>
                    <span className="text-sm text-gray-500 ml-1.5 font-medium">Estimated Years Experience</span>
                  </div>

                  {selectedResume.experience_details.length > 0 ? (
                    <ul className="space-y-1.5 pt-2">
                      {selectedResume.experience_details.map((d, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {d.role}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400">Entry level / general experience detected.</p>
                  )}
                </div>

                <div className="card space-y-3">
                  <div className="flex items-center gap-2 text-gray-900 font-bold border-b pb-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    Education Analysis
                  </div>
                  {selectedResume.education.length > 0 ? (
                    <div className="space-y-2">
                      {selectedResume.education.map((edu, i) => (
                        <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-xs font-bold text-gray-800">{edu.degree}</p>
                          <p className="text-xs text-gray-600">{edu.field}</p>
                          {edu.year && <p className="text-[11px] text-gray-400 mt-0.5">Year: {edu.year}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No specific higher education degrees identified.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

