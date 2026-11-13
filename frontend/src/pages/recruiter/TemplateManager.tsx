import React, { useState, useEffect } from 'react';
import { Plus, FileText, Clock, Layers, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { InterviewTemplate, DifficultyLevel, InterviewType } from '../../types';

export default function TemplateManager() {
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    interview_type: 'technical' as InterviewType,
    difficulty: 'mid' as DifficultyLevel,
    domain: 'Full Stack Development',
    duration_minutes: 30,
    questions: [
      { question: 'Explain how RESTful APIs differ from GraphQL.', expected_keywords: ['endpoints', 'overfetching', 'schema'] },
      { question: 'What is database connection pooling and why is it essential?', expected_keywords: ['overhead', 'reuse', 'concurrency'] }
    ]
  });

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/interviews/templates');
      setTemplates(data);
    } catch (err) {
      toast.error('Failed to load templates');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/interviews/templates', form);
      toast.success('Interview template created!');
      setTemplates([data, ...templates]);
      setShowModal(false);
      setForm({
        title: '',
        description: '',
        interview_type: 'technical',
        difficulty: 'mid',
        domain: 'Full Stack Development',
        duration_minutes: 30,
        questions: []
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Templates</h1>
          <p className="text-sm text-gray-500">
            Define structured interview tracks with domains, difficulty levels, and assessment rubrics.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {templates.map(t => (
          <div key={t.id} className="card space-y-4 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge-purple text-xs uppercase">{t.interview_type}</span>
                <span className="badge-gray text-xs ml-2 uppercase">{t.difficulty}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{t.title}</h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5" /> {t.duration_minutes}m
              </div>
            </div>

            {t.description && (
              <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {t.description}
              </p>
            )}

            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Domain:</span> {t.domain}
            </div>

            {t.questions && t.questions.length > 0 && (
              <div className="border-t pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Configured Questions ({t.questions.length})
                </p>
                <ul className="space-y-1">
                  {t.questions.map((q, i) => (
                    <li key={i} className="text-xs text-gray-600 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                      {q.question}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Create Interview Template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Backend & Distributed Systems"
                  className="input-field"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Focuses on REST APIs, databases, microservices, and system design."
                  className="input-field"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type</label>
                  <select
                    className="input-field"
                    value={form.interview_type}
                    onChange={e => setForm({ ...form, interview_type: e.target.value as InterviewType })}
                  >
                    <option value="technical">Technical</option>
                    <option value="hr">HR</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="aptitude">Aptitude</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    className="input-field"
                    value={form.difficulty}
                    onChange={e => setForm({ ...form, difficulty: e.target.value as DifficultyLevel })}
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="lead">Lead / Architect</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.domain}
                    onChange={e => setForm({ ...form, domain: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    className="input-field"
                    value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

