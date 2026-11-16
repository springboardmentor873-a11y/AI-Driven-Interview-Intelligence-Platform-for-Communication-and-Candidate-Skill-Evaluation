
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

import { changePassword } from "../api/auth";
import API, { type User as UserType } from "../api/auth";

function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [user, setUser] = useState<UserType | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch logged-in user's role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          throw new Error("Please login again.");
        }

        const response = await API.get("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(response.data);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          "Unable to load account information."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Role-based Dashboard Navigation
  const getDashboardPath = () => {
    switch (user?.role) {
      case "candidate":
        return "/candidate/dashboard";

      case "recruiter":
        return "/recruiter/dashboard";

      case "admin":
        return "/admin/dashboard";

      default:
        return "/login";
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      const response = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

      setMessage(response.message);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Unable to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-transparent p-3 outline-none text-sm";

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">

      <div className="mx-auto max-w-2xl">

        {/* Role-based Back Button */}
        <Link
          to={getDashboardPath()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0F766E] hover:underline"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-md md:p-8">

          {/* Header */}
          <div className="mb-7 flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#CCFBF1]">
              <ShieldCheck size={30} className="text-[#0F766E]" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#172554]">
                Account Settings
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage your account security.
              </p>
            </div>

          </div>

          <div className="mb-7 border-b border-gray-200 pb-5">

            <h2 className="text-lg font-semibold text-[#172554]">
              Change Password
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Update your password to keep your account secure.
            </p>

          </div>

          {profileLoading ? (
            <p className="text-sm text-gray-500">
              Loading account information...
            </p>
          ) : (

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Current Password */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Current Password
                </label>

                <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-teal-600">

                  <Lock size={18} className="text-gray-400" />

                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={inputClass}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label="Toggle current password visibility"
                    className="text-gray-400 hover:text-teal-700"
                  >
                    {showCurrent ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>
              </div>

              {/* New Password */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  New Password
                </label>

                <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-teal-600">

                  <Lock size={18} className="text-gray-400" />

                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={inputClass}
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    aria-label="Toggle new password visibility"
                    className="text-gray-400 hover:text-teal-700"
                  >
                    {showNew ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>
              </div>

              {/* Confirm Password */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm New Password
                </label>

                <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-teal-600">

                  <Lock size={18} className="text-gray-400" />

                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={inputClass}
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Toggle confirm password visibility"
                    className="text-gray-400 hover:text-teal-700"
                  >
                    {showConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>
              </div>

              {/* Success Message */}
              {message && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Update Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#0F766E] py-3 font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>

            </form>
          )}

          {/* Forgot Password */}
          <p className="mt-5 text-xs text-gray-400">
            Forgot your current password?{" "}

            <Link
              to="/forgot-password"
              className="font-semibold text-[#0F766E] hover:underline"
            >
              Reset it here
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Settings;
