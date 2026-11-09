import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me/');
        setUser(data);
      } catch (err) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        nav('/');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [nav]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 font-medium">Loading your profile...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Welcome back, {user.username}!
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                {user.role}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {user.email} • SmartHire AI Assessment & Interview Intelligence
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              to="/resumes"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              Upload Resume
            </Link>
          </div>
        </div>

        {/* Candidate Dashboard View */}
        {user.role === 'candidate' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">
              Candidate Workspace
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
                  📄
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Resume Management
                </h3>
                <p className="text-sm text-slate-600 mt-1 mb-4">
                  Upload your resume in PDF format to automatically extract your skills, technical proficiencies, and experience.
                </p>
                <Link
                  to="/resumes"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Manage Resumes &rarr;
                </Link>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4">
                  🎙️
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  AI Mock Interview
                </h3>
                <p className="text-sm text-slate-600 mt-1 mb-4">
                  Practice Technical, HR, and Behavioral rounds powered by speech transcription, eye contact, and confidence tracking.
                </p>
                <span className="inline-block text-xs font-medium px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200">
                  Milestone 2 & 3
                </span>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-4">
                  📊
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Performance Rubric
                </h3>
                <p className="text-sm text-slate-600 mt-1 mb-4">
                  Get scored on Communication (30%), Technical Relevance (30%), Confidence (25%), and Professionalism (15%).
                </p>
                <span className="inline-block text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded">
                  Rubric: 90-100 Excellent
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recruiter Dashboard View */}
        {user.role === 'recruiter' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">
              Recruiter Dashboard
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4">
                  👥
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Candidate Pipeline
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Review applicant profiles, extracted skills, and AI-evaluated interview scores across candidate pools.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold mb-4">
                  📝
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Interview Templates
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Create role-specific interview templates and difficulty levels for automated candidate screenings.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4">
                  📈
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Comparative Analytics
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Compare candidates side-by-side using speech clarity, domain knowledge, and confidence metrics.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Dashboard View */}
        {user.role === 'admin' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">
              Platform Administration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">User Management</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Manage candidate accounts, recruiters, and platform permissions.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">System Activity</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Monitor interview sessions, API usage, and system load.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">AI Engine Config</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Configure model parameters, OpenAI integration, and prompt templates.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
