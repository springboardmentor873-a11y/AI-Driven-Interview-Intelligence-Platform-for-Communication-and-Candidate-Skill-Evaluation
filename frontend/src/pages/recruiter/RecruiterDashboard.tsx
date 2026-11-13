import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, CheckCircle2, TrendingUp, ArrowRight, Video } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { User, InterviewTemplate, Resume } from '../../types';

export default function RecruiterDashboard() {
  const { user } = useAuthStore();
  const [candidates, setCandidates] = useState<User[]>([]);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candRes, tempRes, resRes] = await Promise.all([
          api.get('/users/?role=candidate'),
          api.get('/interviews/templates'),
          api.get('/resumes/')
        ]);
        setCandidates(candRes.data);
        setTemplates(tempRes.data);
        setResumes(resRes.data);
      } catch (err) {
        console.error('Failed to load recruiter data', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Recruiter Portal: {user?.organization || 'Talent Acquisition'}</h1>
        <p className="mt-1 text-purple-100">
          Monitor candidate mock performance, configure structured interview templates, and evaluate candidate readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Registered Candidates</p>
            <h3 className="text-2xl font-bold text-gray-900">{candidates.length}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Interview Templates</p>
            <h3 className="text-2xl font-bold text-gray-900">{templates.length}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Candidate Resumes</p>
            <h3 className="text-2xl font-bold text-gray-900">{resumes.length}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Candidates */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Candidates</h2>
            <Link to="/recruiter/candidates" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {candidates.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No candidates registered yet.</p>
          ) : (
            <div className="space-y-3">
              {candidates.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.full_name}</p>
                    <p className="text-xs text-gray-500">{c.email} • {c.organization || 'Independent'}</p>
                  </div>
                  <span className="badge-green text-xs">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates quick glance */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">Interview Templates</h2>
            <Link to="/recruiter/templates" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">No templates created yet.</p>
              <Link to="/recruiter/templates" className="btn-primary text-xs inline-block">
                Create First Template
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.slice(0, 4).map(t => (
                <div key={t.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.domain} • {t.duration_minutes} mins</p>
                  </div>
                  <span className="badge-purple text-xs uppercase">{t.difficulty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

