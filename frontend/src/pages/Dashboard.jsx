import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const { data: userData } = await api.get('/auth/me/');
        setUser(userData);
        if (userData.role === 'candidate') {
          try {
            const { data: sessionData } = await api.get('/interviews/sessions/');
            setSessions(sessionData || []);
          } catch (sessionErr) {
            console.warn('Failed to load interview sessions:', sessionErr);
          }
        }
      } catch (err) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        nav('/');
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndData();
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

          {user.role === 'candidate' && (
            <div className="flex flex-wrap gap-3">
              <Link
                to="/interview/setup"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                🎙️ Start Mock Interview
              </Link>
              <Link
                to="/resumes"
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
              >
                📄 Upload Resume
              </Link>
            </div>
          )}
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
                <Link
                  to="/interview/setup"
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  Start Practice Session &rarr;
                </Link>
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

            {/* Recent Mock Interviews Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Recent Mock Interviews
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your scheduled, in-progress, and completed interview simulations
                  </p>
                </div>
                <Link
                  to="/interview/setup"
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition"
                >
                  + New Interview
                </Link>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm">
                    No mock interview sessions yet.
                  </p>
                  <Link
                    to="/interview/setup"
                    className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Start your first interview session &rarr;
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">
                            {s.target_role || 'General Interview'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium bg-slate-100 text-slate-700">
                            {s.round_type}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              s.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : s.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {s.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {s.questions_count || (s.questions ? s.questions.length : 0)} questions • Difficulty: {s.difficulty} • Created{' '}
                          {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <Link
                          to={`/interview/room/${s.id}`}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                            s.status === 'completed'
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {s.status === 'completed' ? 'Review Room' : 'Enter Room →'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
