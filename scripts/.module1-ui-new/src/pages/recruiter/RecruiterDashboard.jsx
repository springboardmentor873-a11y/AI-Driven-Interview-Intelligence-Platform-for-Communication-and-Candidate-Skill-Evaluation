import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, CheckCircle, BarChart2, Users, Calendar, ClipboardCheck } from 'lucide-react';

const RecruiterDashboard = () => {
  const { profile, user } = useAuth();
  const displayName = profile?.name || user?.displayName || 'Recruiter';
  const displayEmail = profile?.email || user?.email || 'N/A';
  const roleName = profile?.role || 'recruiter';
  const statusName = profile?.status || 'active';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {displayName}!
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              This is your recruiter dashboard. Monitor candidate performance and manage interview workflows.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
            Recruiter Portal
          </span>
        </div>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Briefcase size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Recruiter Profile Information</h2>
          </div>
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle size={12} className="text-green-600" />
            <span className="capitalize">{statusName}</span>
          </span>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recruiter Name</dt>
              <dd className="mt-1 font-semibold text-gray-900">{displayName}</dd>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</dt>
              <dd className="mt-1 font-semibold text-gray-900 truncate" title={displayEmail}>{displayEmail}</dd>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Role</dt>
              <dd className="mt-1 font-semibold text-blue-600 capitalize">{roleName}</dd>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recruiter ID</dt>
              <dd className="mt-1 font-mono text-xs text-gray-700 truncate" title={user?.uid}>
                {user?.uid ? `${user.uid.slice(0, 12)}...` : 'N/A'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Recruiter Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recruitment Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs flex items-start space-x-4">
            <div className="p-2.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
              <Users size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Candidate Analytics</h3>
              <p className="text-sm text-gray-500 mt-1">
                View candidate rankings, assessment scores, and AI-evaluated skill rubrics.
              </p>
              <span className="inline-block mt-3 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Coming Soon
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs flex items-start space-x-4">
            <div className="p-2.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Interview Management</h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure interview rubrics, schedule assessments, and review audio transcripts.
              </p>
              <span className="inline-block mt-3 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Coming Soon
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs flex items-start space-x-4">
            <div className="p-2.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
              <ClipboardCheck size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Job Assessment Templates</h3>
              <p className="text-sm text-gray-500 mt-1">
                Create and customize role-specific interview templates and question banks.
              </p>
              <span className="inline-block mt-3 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Coming Soon
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs flex items-start space-x-4">
            <div className="p-2.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
              <BarChart2 size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Hiring Pipeline Insights</h3>
              <p className="text-sm text-gray-500 mt-1">
                Track candidate conversion rates, average scores, and assessment completion metrics.
              </p>
              <span className="inline-block mt-3 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
