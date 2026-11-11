import React, { useEffect, useState } from 'react';
import { Users, FileText, Video, Activity, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { PlatformMetrics } from '../../types';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [metRes, logsRes] = await Promise.all([
          api.get('/admin/metrics'),
          api.get('/admin/audit-logs')
        ]);
        setMetrics(metRes.data);
        setAuditLogs(logsRes.data);
      } catch (err) {
        toast.error('Failed to load admin telemetry');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <span className="text-xs uppercase tracking-widest text-red-300 font-semibold">Root Governance</span>
        </div>
        <h1 className="text-2xl font-bold">Platform Administration & System Health</h1>
        <p className="mt-1 text-slate-300">
          Monitor system activities, manage user roles, and inspect AI mock interview telemetry.
        </p>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-900">{metrics.users.total}</h3>
              <p className="text-[11px] text-gray-500">
                {metrics.users.candidates} candidates, {metrics.users.recruiters} recruiters
              </p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Processed Resumes</p>
              <h3 className="text-2xl font-bold text-gray-900">{metrics.resumes.total}</h3>
              <p className="text-[11px] text-gray-500">Skills extracted & indexed</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Mock Sessions</p>
              <h3 className="text-2xl font-bold text-gray-900">{metrics.interviews.total_sessions}</h3>
              <p className="text-[11px] text-gray-500">{metrics.interviews.total_templates} active templates</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Audit Trail</p>
              <h3 className="text-2xl font-bold text-gray-900">{metrics.system.audit_logs_count}</h3>
              <p className="text-[11px] text-gray-500">Tracked security events</p>
            </div>
          </div>
        </div>
      )}

      {/* System Activity Audit Table */}
      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          Recent System Activities & Security Audit Logs
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b">
              <tr>
                <th className="py-2.5 px-3">Event Action</th>
                <th className="py-2.5 px-3">User ID</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      <span className="badge-purple text-xs">{log.action}</span>
                    </td>
                    <td className="py-2.5 px-3">{log.user_id ? `User #${log.user_id}` : 'System'}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-gray-500 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
