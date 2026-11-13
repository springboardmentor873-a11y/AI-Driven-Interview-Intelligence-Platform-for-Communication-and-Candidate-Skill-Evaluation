import React, { useState, useEffect } from 'react';
import { Video, Plus, Clock, Award, CheckCircle, Calendar, Play } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { InterviewSession, InterviewTemplate } from '../../types';

export default function InterviewList() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();

  const fetchData = async () => {
    try {
      const [sessRes, tempRes] = await Promise.all([
        api.get('/interviews/sessions'),
        api.get('/interviews/templates')
      ]);
      setSessions(sessRes.data);
      setTemplates(tempRes.data);
    } catch (err) {
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const { data } = await api.post('/interviews/sessions', {
        title: newTitle,
        template_id: selectedTemplateId || null,
        interview_type: 'technical',
        difficulty: 'mid'
      });
      toast.success('Mock interview created successfully!');
      setSessions([data, ...sessions]);
      setShowModal(false);
      setNewTitle('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mock Interview Sessions</h1>
          <p className="text-sm text-gray-500">
            Practice technical, behavioral, and HR questions with automated AI evaluation.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Schedule Mock Interview
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-16">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No Mock Interviews Scheduled</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            Get started by scheduling your first AI mock interview session based on your target domain and difficulty.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Schedule Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sessions.map(s => (
            <div key={s.id} className="card space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge-blue text-xs uppercase tracking-wider">{s.interview_type}</span>
                  <span className="badge-gray text-xs ml-2 uppercase">{s.difficulty}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">{s.title}</h3>
                </div>
                <span className={`badge ${s.status === 'completed' ? 'badge-green' : 'badge-yellow'} text-xs capitalize`}>
                  {s.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {new Date(s.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-gray-400" />
                  Overall Score: {s.overall_score}%
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  onClick={() => toast('Interview simulator workspace unlocks in Milestone 2!')}
                >
                  <Play className="h-3.5 w-3.5" />
                  Enter Interview Room
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Schedule Mock Interview</h2>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer Mock Round"
                  className="input-field"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Template (Optional)</label>
                <select
                  className="input-field"
                  value={selectedTemplateId || ''}
                  onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Default General Technical Template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.domain} - {t.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

