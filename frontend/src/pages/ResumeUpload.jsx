import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';

export default function ResumeUpload() {
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsingId, setParsingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    const fetchProfileAndResumes = async () => {
      try {
        const userRes = await api.get('/auth/me/');
        if (userRes.data.role !== 'candidate') {
          nav('/dashboard');
          return;
        }
        setUser(userRes.data);
        const resumeRes = await api.get('/resumes/');
        setResumes(resumeRes.data);
      } catch (err) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        nav('/login');
      }
    };
    fetchProfileAndResumes();
  }, [nav]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setError('');
    setSuccess('');

    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Invalid file type. Only PDF (.pdf) files are allowed.');
        setFile(null);
        e.target.value = '';
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size exceeds the 5 MB limit. Please select a smaller PDF.');
        setFile(null);
        e.target.value = '';
        return;
      }
    }
    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a valid PDF resume file to upload.');
      return;
    }
    setError('');
    setSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/resumes/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess('Resume uploaded and processed with Groq AI successfully!');
      setResumes([data, ...resumes]);
      setFile(null);
      e.target.reset();
    } catch (err) {
      const backendErr =
        err.response?.data?.file?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to upload resume. Please check the file and try again.';
      setError(backendErr);
    } finally {
      setUploading(false);
    }
  };

  const handleParseAI = async (id) => {
    setError('');
    setSuccess('');
    setParsingId(id);

    try {
      const { data } = await api.post(`/resumes/${id}/parse/`);
      setResumes(resumes.map((r) => (r.id === id ? data : r)));
      setSuccess('Groq AI successfully parsed skills, experience, and profile intelligence!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to extract skills via Groq AI.');
    } finally {
      setParsingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) {
      return;
    }
    setError('');
    setSuccess('');
    setDeletingId(id);

    try {
      await api.delete(`/resumes/${id}/`);
      setResumes(resumes.filter((r) => r.id !== id));
      setSuccess('Resume deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete resume. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
            AI Skill Extraction & Resume Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Resume Intelligence & Skill Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload your PDF resume to extract key technologies, experience, education, and launch targeted AI mock interviews.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Upload New Resume (PDF)
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-lg p-2"
                required
              />
              <button
                type="submit"
                disabled={uploading}
                className="whitespace-nowrap px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
              >
                {uploading ? 'Processing PDF...' : 'Upload & Parse'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Supported format: PDF only. Maximum file size: 5 MB. Automatically analyzed with Groq Llama AI.
            </p>
          </form>
        </div>

        {/* Uploaded Resumes List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Uploaded Resumes ({resumes.length})
          </h2>

          {resumes.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
              No resumes uploaded yet. Upload your first PDF resume above!
            </div>
          ) : (
            <div className="space-y-6">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">
                          {r.file_name || `Resume #${r.id}`}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            r.parsing_status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.parsing_status === 'failed'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {r.parsing_status === 'completed' ? '✓ AI Parsed' : r.parsing_status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Size: {formatFileSize(r.file_size)} • Uploaded: {new Date(r.uploaded_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/interview/setup?resume_id=${r.id}`}
                        className="text-xs font-bold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Start Mock Interview →
                      </Link>

                      <button
                        onClick={() => handleParseAI(r.id)}
                        disabled={parsingId === r.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition disabled:opacity-50"
                      >
                        {parsingId === r.id ? 'Analyzing...' : 'Re-Extract with Groq'}
                      </button>

                      {r.file && (
                        <a
                          href={r.file}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                        >
                          View PDF
                        </a>
                      )}

                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition"
                      >
                        {deletingId === r.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {r.summary && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                        Executive Profile Summary (AI Generated)
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">{r.summary}</p>
                    </div>
                  )}

                  {/* Categorized Skills */}
                  {r.skills && typeof r.skills === 'object' && Object.keys(r.skills).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Extracted Technical Skills & Proficiencies
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(r.skills).map(([category, items]) => (
                          Array.isArray(items) && items.length > 0 ? (
                            <div key={category} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                              <span className="text-xs font-semibold text-slate-600 capitalize block mb-2">
                                {category.replace(/_/g, ' ')} ({items.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {items.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded-md text-xs font-medium shadow-2xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Roles */}
                  {r.recommended_roles && r.recommended_roles.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-600 uppercase">Best Suited Roles:</span>
                      {r.recommended_roles.map((role, i) => (
                        <span key={i} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Raw Text Collapsible Drawer */}
                  <details className="text-xs text-slate-500">
                    <summary className="cursor-pointer font-medium hover:text-slate-800">
                      View Raw PDF Text ({r.text ? r.text.length : 0} characters)
                    </summary>
                    <div className="mt-2 bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-600 max-h-40 overflow-y-auto whitespace-pre-wrap border border-slate-200">
                      {r.text || 'No text extracted.'}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
