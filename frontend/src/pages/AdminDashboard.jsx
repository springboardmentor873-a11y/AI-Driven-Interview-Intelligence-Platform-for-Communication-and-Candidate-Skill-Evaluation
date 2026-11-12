import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Clock,
  Briefcase,
  UserPlus,
} from "lucide-react";
import {
  PageHeading,
  StatCard,
  SectionTitle,
  Badge,
  EmptyState,
  Modal,
} from "../components/UI";
import { adminApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user: currentAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 15;

  // Modals for actions
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleToGrant, setRoleToGrant] = useState("candidate");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const fetchStats = () => {
    setStatsLoading(true);
    adminApi
      .getStats()
      .then((res) => {
        setStats(res.data);
      })
      .catch(() => {
        setStats(null);
      })
      .finally(() => {
        setStatsLoading(false);
      });
  };

  const fetchUsers = () => {
    setLoading(true);
    const params = {
      limit,
      offset: page * limit,
    };
    if (searchQuery.trim()) params.q = searchQuery.trim();
    if (roleFilter !== "all") params.role = roleFilter;
    if (statusFilter !== "all") params.status = statusFilter;

    adminApi
      .getUsers(params)
      .then((res) => {
        setUsers(res.data?.items || []);
        setTotalUsers(res.data?.total || 0);
      })
      .catch((err) => {
        setUsers([]);
        setTotalUsers(0);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const openGrantRoleModal = (u) => {
    setSelectedUser(u);
    setRoleToGrant("candidate");
    setActionError("");
    setActionSuccess("");
    setRoleModalOpen(true);
  };

  const handleGrantRole = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    setActionError("");
    try {
      await adminApi.grantRole(selectedUser.id, roleToGrant);
      setActionSuccess(`Role '${roleToGrant}' granted to ${selectedUser.email}.`);
      setRoleModalOpen(false);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setActionError(err.message || "Failed to grant role.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleQuickApproveRecruiter = async (targetUser) => {
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await adminApi.grantRole(targetUser.id, "recruiter");
      setActionSuccess(`Recruiter privileges approved for ${targetUser.email}.`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setActionError(err.message || "Failed to approve recruiter role.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleQuickRevokeRecruiter = async (targetUser) => {
    if (!confirm(`Revoke recruiter privileges from ${targetUser.email}?`)) return;
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await adminApi.revokeRole(targetUser.id, "recruiter");
      setActionSuccess(`Recruiter privileges revoked from ${targetUser.email}.`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setActionError(err.message || "Failed to revoke recruiter role.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRevokeRole = async (targetUser, roleName) => {
    if (
      !confirm(
        `Are you sure you want to revoke the role '${roleName}' from ${targetUser.email}?`
      )
    ) {
      return;
    }
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await adminApi.revokeRole(targetUser.id, roleName);
      setActionSuccess(`Role '${roleName}' revoked from ${targetUser.email}.`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setActionError(err.message || "Failed to revoke role.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const newStatus = targetUser.status === "active" ? "suspended" : "active";
    if (
      !confirm(
        `Are you sure you want to change ${targetUser.email}'s status to '${newStatus}'?`
      )
    ) {
      return;
    }
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await adminApi.updateStatus(targetUser.id, newStatus);
      setActionSuccess(`Account status updated to '${newStatus}'.`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setActionError(err.message || "Failed to update account status.");
    } finally {
      setActionBusy(false);
    }
  };

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div>
      <PageHeading
        eyebrow="SYSTEM GOVERNANCE"
        title="Platform Administration"
        description="Oversee real platform accounts, enforce role-based access control policies, and monitor system metrics."
        action={
          <button
            onClick={() => {
              fetchStats();
              fetchUsers();
            }}
            className="btn-secondary text-xs"
            disabled={loading || statsLoading}
          >
            <RefreshCw
              size={14}
              className={loading || statsLoading ? "animate-spin" : ""}
            />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="mb-6 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center justify-between border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess("")}
            className="text-emerald-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {actionError && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center justify-between border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError("")}
            className="text-red-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real Platform Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-7">
        <StatCard
          label="Total Users"
          value={statsLoading ? "..." : stats?.total_users ?? 0}
          helper="PostgreSQL accounts"
          icon={Users}
          tone="slate"
        />
        <StatCard
          label="Candidates"
          value={statsLoading ? "..." : stats?.candidates_count ?? 0}
          helper="Active candidate pool"
          icon={UserCheck}
          tone="blue"
        />
        <StatCard
          label="Recruiters"
          value={statsLoading ? "..." : stats?.recruiters_count ?? 0}
          helper="Approved recruiters"
          icon={Briefcase}
          tone="purple"
        />
        <StatCard
          label="Interviews"
          value={statsLoading ? "..." : stats?.total_interviews ?? 0}
          helper="Completed sessions"
          icon={Clock}
          tone="green"
        />
        <StatCard
          label="Resumes"
          value={statsLoading ? "..." : stats?.total_resumes ?? 0}
          helper="Parsed documents"
          icon={FileText}
          tone="amber"
        />
        <StatCard
          label="Active Accounts"
          value={
            statsLoading
              ? "..."
              : `${stats?.active_users ?? 0}`
          }
          helper={`${stats?.recent_signups_count ?? 0} signups this week`}
          icon={ShieldCheck}
          tone="slate"
        />
      </div>

      {/* Filter and User Search Toolbar */}
      <div className="panel mb-6 p-4">
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row items-center gap-3 justify-between"
        >
          <div className="field-wrap flex-1 w-full sm:max-w-md">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user by email..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 outline-none focus:border-indigo-600"
            >
              <option value="all">All Roles</option>
              <option value="candidate">Candidate Only</option>
              <option value="recruiter">Recruiter Only</option>
              <option value="admin">Admin Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 outline-none focus:border-indigo-600"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>

            <button type="submit" className="btn-primary text-xs h-10 px-4">
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="panel mb-6">
        <SectionTitle
          title="User Accounts & Access Control"
          subtitle={`Showing ${users.length} of ${totalUsers} real user records`}
        />

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Querying user accounts...
          </div>
        ) : users.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Roles</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th className="text-right">Actions & Permissions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = u.id === currentAdmin?.id;
                  const isRecruiter = u.roles?.includes("recruiter");

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="font-semibold text-slate-900">
                          {u.full_name}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {u.email}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1">
                          {u.roles?.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-1 group"
                            >
                              <Badge
                                variant={
                                  r === "admin"
                                    ? "slate"
                                    : r === "recruiter"
                                    ? "purple"
                                    : "blue"
                                }
                              >
                                {r}
                              </Badge>
                              {/* Revoke button if not revoking own admin */}
                              {!(isCurrent && r === "admin") && (
                                <button
                                  type="button"
                                  title={`Revoke ${r}`}
                                  onClick={() => handleRevokeRole(u, r)}
                                  className="text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => openGrantRoleModal(u)}
                            className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded"
                            title="Assign other role"
                          >
                            <Plus size={10} />
                            <span>Role</span>
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 capitalize">
                          {u.auth_provider || "Local"}
                        </span>
                      </td>
                      <td>
                        <Badge variant={u.status === "active" ? "green" : "amber"}>
                          {u.status}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-xs text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Recruiter Quick Approval / Revocation Button */}
                          {!isCurrent && (
                            <>
                              {!isRecruiter ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuickApproveRecruiter(u)}
                                  disabled={actionBusy}
                                  title="Approve recruiter privileges"
                                  className="btn-secondary text-[11px] py-1 px-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 border-indigo-200"
                                >
                                  Approve Recruiter
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQuickRevokeRecruiter(u)}
                                  disabled={actionBusy}
                                  title="Revoke recruiter privileges"
                                  className="btn-secondary text-[11px] py-1 px-2 text-purple-700 hover:text-purple-900 hover:bg-purple-50 border-purple-200"
                                >
                                  Revoke Recruiter
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={actionBusy}
                                className={`btn-secondary text-[11px] py-1 px-2 ${
                                  u.status === "active"
                                    ? "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                                    : "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                                }`}
                              >
                                {u.status === "active" ? "Suspend" : "Activate"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No users found"
            description="No user accounts match your active search or filters."
            action={
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                  setPage(0);
                  fetchUsers();
                }}
                className="btn-secondary text-xs"
              >
                Reset Filters
              </button>
            }
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grant Role Modal */}
      {roleModalOpen && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setRoleModalOpen(false)}
          title="Grant Role"
          description={`Assign a platform role to ${selectedUser.email}`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="field-label">Select Role to Grant</label>
              <select
                value={roleToGrant}
                onChange={(e) => setRoleToGrant(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 outline-none focus:border-indigo-600"
              >
                <option value="candidate">Candidate (Practice & Assessments)</option>
                <option value="recruiter">Recruiter (Candidate Review & Talent Pool)</option>
                <option value="admin">Administrator (Platform & Role Governance)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 leading-relaxed">
              Users can hold multiple roles simultaneously. Administrative actions are
              strictly audited and guarded on the backend API.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrantRole}
                disabled={actionBusy}
                className="btn-primary text-xs"
              >
                {actionBusy ? "Granting..." : "Confirm Grant"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

