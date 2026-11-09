import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';

export default function ResumeUpload() {
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    const fetchProfileAndResumes = async () => {
      try {
        const userRes = await api.get('/auth/me/');
        setUser(userRes.data);
        const resumeRes = await api.get('/resumes/');
        setResumes(resumeRes.data);
      } catch (err) {
        localStorage.removeItem('access');
        nav('/');
      }
    };
    fetchProfileAndResumes();
  }, [nav]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF resume file to upload.');
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
      setSuccess('Resume uploaded and text extracted successfully!');
      setResumes([data, ...resumes]);
      setFile(null);
      // Reset input element
      e.target.reset();
    } catch (err) {
      setError(
        err.response?.data?.file?.[0] ||
        err.response?.data?.detail ||
        'Failed to upload resume. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Resume Upload & Skill Extraction
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload your PDF resume to extract text and prepare for AI skill evaluation and interview generation.
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
                onChange={(e) => setFile(e.target.files?.[0] || null)}
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
                className="whitespace-nowrap px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {uploading ? 'Processing PDF...' : 'Upload & Parse'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Supported formats: PDF. PyPDF automatically parses text upon upload.
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
            <div className="space-y-4">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800">
                        Resume #{r.id}
                      </span>
                      <span className="ml-3 text-xs text-slate-500">
                        Uploaded on: {new Date(r.uploaded_at).toLocaleString()}
                      </span>
                    </div>
                    {r.file && (
                      <a
                        href={r.file}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                      >
                        View Original PDF
                      </a>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Extracted Text Content
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-200">
                      {r.text ? r.text : <span className="text-slate-400 italic">No text extracted or empty PDF</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Extracted Skills
                    </h4>
                    <div className="text-xs text-slate-500">
                      {r.skills && Object.keys(r.skills).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(r.skills).map(([key, val]) => (
                            <span key={key} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-slate-400">
                          Skill extraction pipeline scheduled for Milestone 2 (OpenAI integration).
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
