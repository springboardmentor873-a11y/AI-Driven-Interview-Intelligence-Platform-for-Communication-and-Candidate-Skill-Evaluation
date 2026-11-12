import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Shield,
  KeyRound,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PageHeading, Badge, SectionTitle } from "../components/UI";

export default function Profile() {
  const { user, logout, changePassword, defaultDashboardPath } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLocalAccount =
    user?.auth_provider === "local" || user?.auth_provider === "google+local";

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setErrorMsg("");

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    if (newPassword.length < 10) {
      setErrorMsg("New password must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setStatusMsg("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="max-w-4xl">
      <PageHeading
        eyebrow="ACCOUNT SETTINGS"
        title="Profile & Authentication"
        description="Manage your identity credentials, assigned platform roles, and security preferences."
        action={
          <button onClick={handleLogout} className="btn-secondary text-xs">
            <LogOut size={14} className="text-red-600" />
            <span>Sign Out</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* User Card */}
        <div className="panel md:col-span-1 text-center flex flex-col items-center justify-center p-6">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="h-20 w-20 rounded-full object-cover border-2 border-slate-200 mb-3"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold mb-3">
              {(user?.full_name || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="text-base font-bold text-slate-900">{user?.full_name}</h2>
          <p className="text-xs text-slate-500 mb-4">{user?.email}</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {user?.roles?.map((r) => (
              <Badge key={r} variant={r === "admin" ? "slate" : r === "recruiter" ? "purple" : "blue"}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Identity Details */}
        <div className="panel md:col-span-2">
          <SectionTitle
            title="Account Information"
            subtitle="Verified identity parameters stored on the platform"
          />

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">User Identifier (UUID)</span>
              <span className="font-mono text-slate-700">{user?.id}</span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Email Address</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{user?.email}</span>
                {user?.email_verified && (
                  <Badge variant="green" icon={CheckCircle2}>
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Authentication Provider</span>
              <span className="font-semibold text-slate-800 capitalize">
                {user?.auth_provider === "google"
                  ? "Google OAuth 2.0"
                  : user?.auth_provider === "google+local"
                  ? "Google & Local Password"
                  : "Email & Password"}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Account Status</span>
              <Badge variant={user?.status === "active" ? "green" : "amber"}>
                {user?.status === "active" ? "Active" : "Suspended"}
              </Badge>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Member Since</span>
              <span className="text-slate-700">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Recent"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Password Management */}
      <div className="panel max-w-2xl">
        <SectionTitle
          title="Security & Password"
          subtitle={
            isLocalAccount
              ? "Update your master password credentials"
              : "Your account is managed via Google Single Sign-On"
          }
        />

        {isLocalAccount ? (
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md mt-4">
            {statusMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 size={16} />
                <span>{statusMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="field-label">Current Password</label>
              <div className="field-wrap">
                <KeyRound size={15} />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
            </div>

            <div>
              <label className="field-label">New Password (10+ characters)</label>
              <div className="field-wrap">
                <KeyRound size={15} />
                <input
                  type="password"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 10 characters"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Confirm New Password</label>
              <div className="field-wrap">
                <KeyRound size={15} />
                <input
                  type="password"
                  required
                  minLength={10}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary mt-2">
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2 mt-4">
            <p>
              You signed in using Google Single Sign-On. Your password and two-factor
              authentication are securely handled by your Google account.
            </p>
            <p className="text-slate-500">
              To change your login credentials, manage them directly within your
              Google Account security settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

