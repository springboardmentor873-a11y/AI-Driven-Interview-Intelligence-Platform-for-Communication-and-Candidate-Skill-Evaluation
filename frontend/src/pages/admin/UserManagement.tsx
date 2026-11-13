import React, { useEffect, useState } from 'react';
import { Users, Trash2, CheckCircle, XCircle, Shield, Mail } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { User } from '../../types';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users/');
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    try {
      const { data } = await api.put(`/users/${user.id}`, {
        is_active: !user.is_active
      });
      toast.success(`User ${data.is_active ? 'activated' : 'deactivated'}`);
      setUsers(users.map(u => (u.id === user.id ? data : u)));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User & Role Management</h1>
          <p className="text-sm text-gray-500">
            Control platform access, manage user roles, and activate or revoke permissions.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`badge text-xs uppercase ${
                        u.role === 'admin'
                          ? 'badge-red'
                          : u.role === 'recruiter'
                          ? 'badge-purple'
                          : 'badge-blue'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500">{u.organization || '—'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {u.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Disabled
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

