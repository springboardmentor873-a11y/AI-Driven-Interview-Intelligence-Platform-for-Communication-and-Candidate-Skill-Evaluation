
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Save,
  Loader2,
} from "lucide-react";

import API, { type User as UserType } from "../api/auth";

function MyProfile() {
  const [user, setUser] = useState<UserType | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
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
        setFullName(response.data.full_name);
        setEmail(response.data.email);

      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          "Unable to load profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      setSaving(true);

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please login again.");
      }

      const response = await API.patch(
        "/api/auth/profile",
        {
          full_name: fullName,
          email: email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser(response.data);
      setFullName(response.data.full_name);
      setEmail(response.data.email);

      setMessage("Profile updated successfully!");

    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Profile update failed."
      );
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#172554]">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">

      <div className="max-w-3xl mx-auto">

        {/* Role-based Back Button */}
        <Link
          to={getDashboardPath()}
          className="inline-flex items-center gap-2 text-[#0F766E] font-semibold mb-6 hover:text-teal-800 transition"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Profile Header */}
          <div className="bg-[#172554] p-6 sm:p-8 text-white">

            <div className="flex items-center gap-4">

              <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center">
                <User size={30} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  My Profile
                </h1>

                <p className="text-gray-300 text-sm">
                  View and update your account information
                </p>
              </div>

            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleUpdate} className="p-6 sm:p-8">

            {/* Success Message */}
            {message && (
              <p className="mb-5 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                {message}
              </p>
            )}

            {/* Error Message */}
            {error && (
              <p className="mb-5 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                {error}
              </p>
            )}

            {/* Full Name */}
            <div className="mb-5">

              <label className="block text-sm font-semibold text-[#172554] mb-2">
                Full Name
              </label>

              <div className="relative">

                <User
                  className="absolute left-3 top-3.5 text-gray-400"
                  size={19}
                />

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  className="w-full border border-gray-200 rounded-lg py-3 pl-11 pr-4 outline-none focus:border-teal-600"
                />

              </div>
            </div>

            {/* Email */}
            <div className="mb-5">

              <label className="block text-sm font-semibold text-[#172554] mb-2">
                Email Address
              </label>

              <div className="relative">

                <Mail
                  className="absolute left-3 top-3.5 text-gray-400"
                  size={19}
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg py-3 pl-11 pr-4 outline-none focus:border-teal-600"
                />

              </div>
            </div>

            {/* Account Role */}
            <div className="mb-6">

              <label className="block text-sm font-semibold text-[#172554] mb-2">
                Account Role
              </label>

              <input
                type="text"
                value={user?.role || ""}
                disabled
                className="w-full border border-gray-200 rounded-lg py-3 px-4 bg-gray-50 text-gray-500 capitalize"
              />

            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-[#0F766E] hover:bg-teal-800 disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition"
            >

              {saving ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <Save size={19} />
              )}

              {saving ? "Saving..." : "Save Changes"}

            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default MyProfile;
