import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Video, Award, Clock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import type { Resume, InterviewSession } from '../../types';

export default function CandidateDashboard() {
  const { user } = useAuthStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resumesRes, sessionsRes] = await Promise.all([
          api.get('/resumes/'),
          api.get('/interviews/sessions')
        ]);
        setResumes(resumesRes.data);
        setSessions(sessionsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const latestResume = resumes.length > 0 ? resumes[0] : null;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Welcome back, {user?.full_name}! 👋</h1>
        <p className="mt-1 text-blue-100">
          Prepare for your dream role with AI-powered mock interview simulations, real-time feedback, and skill insights.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/candidate/resume"
            className="px-4 py-2 bg-white text-blue-700 font-semibold rounded-lg shadow hover:bg-blue-50 transition"
          >
            {latestResume ? 'Manage Resume & Skills' : 'Upload Resume to Start'}
          </Link>
          <Link
            to="/candidate/interviews"
            className="px-4 py-2 bg-blue-500 bg-opacity-30 text-white font-semibold rounded-lg hover:bg-opacity-40 transition border border-blue-300"
          >
            View Mock Interviews
          </Link>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Uploaded Resumes</p>
            <h3 className="text-2xl font-bold text-gray-900">{resumes.length}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Mock Interviews</p>
            <h3 className="text-2xl font-bold text-gray-900">{sessions.length}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Extracted Skills</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {latestResume ? latestResume.skills.length : 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Profile & Resume Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">Active Resume Profile</h2>
            <Link to="/candidate/resume" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {latestResume ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">File</p>
                <p className="text-sm font-semibold text-gray-800">{latestResume.filename}</p>
              </div>

              {latestResume.summary && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">AI Summary</p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {latestResume.summary}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Top Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {latestResume.skills.slice(0, 8).map((skill, idx) => (
                    <span key={idx} className="badge-blue text-xs">
                      {skill}
                    </span>
                  ))}
                  {latestResume.skills.length > 8 && (
                    <span className="badge-gray text-xs">+{latestResume.skills.length - 8} more</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No resume uploaded yet.</p>
              <Link to="/candidate/resume" className="btn-primary mt-3 inline-block text-xs">
                Upload Resume Now
              </Link>
            </div>
          )}
        </div>

        {/* Recent Mock Interviews */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Mock Interviews</h2>
            <Link to="/candidate/interviews" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No mock interviews scheduled yet.</p>
              <Link to="/candidate/interviews" className="btn-primary mt-3 inline-block text-xs">
                Schedule First Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 3).map(s => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {s.interview_type} • {s.difficulty} difficulty
                    </p>
                  </div>
                  <span className={`badge text-xs capitalize ${s.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

