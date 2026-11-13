import React, { useEffect, useState } from 'react';
import { Users, Mail, Phone, Building, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { User, Resume } from '../../types';

export default function CandidateList() {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<User | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [candRes, resRes] = await Promise.all([
          api.get('/users/?role=candidate'),
          api.get('/resumes/')
        ]);
        setCandidates(candRes.data);
        setResumes(resRes.data);
      } catch (err) {
        toast.error('Failed to load candidate directory');
      }
    };
    fetch();
  }, []);

  const getCandidateResumes = (userId: number) => {
    return resumes.filter(r => r.user_id === userId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Candidate Directory</h1>
        <p className="text-sm text-gray-500">
          Review candidates, explore their verified skills, and inspect AI-extracted technical qualifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {candidates.map(candidate => {
          const candResumes = getCandidateResumes(candidate.id);
          const topResume = candResumes[0];

          return (
            <div key={candidate.id} className="card space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{candidate.full_name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" /> {candidate.email}
                  </p>
                </div>
                <span className="badge-blue text-xs uppercase">Candidate</span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
                {candidate.organization && (
                  <p className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-gray-400" /> {candidate.organization}
                  </p>
                )}
                {candidate.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" /> {candidate.phone}
                  </p>
                )}
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Extracted Skills {topResume ? `(${topResume.skills.length})` : '(0)'}
                </p>
                {topResume && topResume.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {topResume.skills.slice(0, 6).map((s, idx) => (
                      <span key={idx} className="badge-gray text-[11px]">
                        {s}
                      </span>
                    ))}
                    {topResume.skills.length > 6 && (
                      <span className="text-[11px] text-gray-400">+{topResume.skills.length - 6}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No resume uploaded</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

