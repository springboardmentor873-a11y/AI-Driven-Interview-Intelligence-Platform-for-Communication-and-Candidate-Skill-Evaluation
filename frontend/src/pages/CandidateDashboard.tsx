
import { useEffect, useRef, useState } from "react";

import {
  LayoutDashboard,
  FileText,
  Video,
  BrainCircuit,
  User,
  Settings,
  LogOut,
  Bell,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  ClipboardList,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, type User as UserType } from "../api/auth";

function CandidateDashboard() {
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Profile dropdown reference
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch logged-in user details
  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        if (isMounted) setLoadingUser(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Unable to fetch candidate details:", error);
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileRef.current &&
        event.target instanceof Node &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Logout Function
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login", { replace: true });
  };

  // Close sidebar
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const firstLetter =
    user?.full_name?.trim().charAt(0).toUpperCase() || "C";

  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Candidate";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#172554] text-white hidden md:flex flex-col shrink-0">

        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <BrainCircuit size={30} className="text-teal-400" />
          <h1 className="text-xl font-bold">
            SmartHire <span className="text-teal-400">AI</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">

          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-3 p-3 rounded-lg bg-teal-700 text-white"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </a>

          <Link
            to="/candidate/resume"
            className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
          >
            <FileText size={20} />
            My Resume
          </Link>

          <Link
            to="/candidate/interview"
            className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10 transition"
          >
            <Video size={20} />
            Mock Interviews
          </Link>
          <Link
            to="/candidate/interview/history"
            className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10 transition"
          >
            <ClipboardList size={20} />
            Interview History
          </Link>

          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
          >
            <BrainCircuit size={20} />
            Skill Assessment
          </a>

          <Link
            to="/profile"
            className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
          >
            <User size={20} />
            My Profile
          </Link>

          <Link
            to="/settings"
            className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
          >
            <Settings size={20} />
            Settings
          </Link>

        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg w-full transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

      </aside>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#172554] text-white flex flex-col shadow-xl md:hidden">

          <div className="p-6 flex items-center justify-between border-b border-white/10">

            <div className="flex items-center gap-3">
              <BrainCircuit size={30} className="text-teal-400" />

              <h1 className="text-xl font-bold">
                SmartHire <span className="text-teal-400">AI</span>
              </h1>
            </div>

            <button
              onClick={closeSidebar}
              aria-label="Close sidebar"
              className="text-gray-300 hover:text-white"
            >
              <X size={24} />
            </button>

          </div>

          <nav className="flex-1 p-4 space-y-2">

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                closeSidebar();
              }}
              className="flex items-center gap-3 p-3 rounded-lg bg-teal-700 text-white"
            >
              <LayoutDashboard size={20} />
              Dashboard
            </a>

            <Link
              to="/candidate/resume"
              onClick={closeSidebar}
              className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
            >
              <FileText size={20} />
              My Resume
            </Link>

            <Link
              to="/candidate/interview"
              onClick={closeSidebar}
              className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10 transition"
            >
              <Video size={20} />
              Mock Interviews
            </Link>

            <Link
              to="/candidate/interview/history"
              onClick={closeSidebar}
              className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10 transition"
            >
              <ClipboardList size={20} />
              Interview History
            </Link>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                closeSidebar();
              }}
              className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
            >
              <BrainCircuit size={20} />
              Skill Assessment
            </a>

            <Link
              to="/profile"
              onClick={closeSidebar}
              className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
            >
              <User size={20} />
              My Profile
            </Link>

            <Link
              to="/settings"
              onClick={closeSidebar}
              className="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-white/10"
            >
              <Settings size={20} />
              Settings
            </Link>

          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg w-full transition"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>

        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">

        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center">

          <div className="flex items-center gap-3">

            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
              className="md:hidden text-[#172554] hover:bg-gray-100 p-2 rounded-lg transition"
            >
              <Menu size={24} />
            </button>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#172554]">
                Candidate Dashboard
              </h2>

              <p className="text-xs sm:text-sm text-gray-500">
                Welcome to SmartHire AI
              </p>
            </div>

          </div>

          {/* Navbar Right Section */}
          <div className="flex items-center gap-3 sm:gap-5">

            <button
              aria-label="Notifications"
              className="text-gray-500 hover:text-[#172554]"
            >
              <Bell size={21} />
            </button>

            {/* User Account */}
            <div className="relative" ref={profileRef}>

              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
                className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 p-2 rounded-xl transition"
              >

                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg shrink-0">
                  {loadingUser ? "..." : firstLetter}
                </div>

                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-[#172554]">
                    {user?.full_name || "Candidate"}
                  </p>

                  <p className="text-xs text-gray-500">
                    User Account
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform ${isProfileOpen ? "rotate-180" : ""
                    }`}
                />

              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">

                  <div className="bg-[#172554] p-5 text-white">

                    <div className="flex items-center gap-3">

                      <div className="w-12 h-12 rounded-full bg-teal-400 text-[#172554] flex items-center justify-center text-xl font-bold">
                        {firstLetter}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {loadingUser ? "Loading..." : user?.full_name || "Candidate"}
                        </p>

                        <p className="text-xs text-gray-300">
                          {displayRole}
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="p-4 space-y-4">

                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Full Name
                      </p>
                      <p className="text-sm font-medium text-[#172554] break-words">
                        {user?.full_name || "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Email Address
                      </p>
                      <p className="text-sm font-medium text-[#172554] break-all">
                        {user?.email || "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Role
                      </p>
                      <span className="inline-block bg-teal-50 text-teal-800 text-xs font-semibold px-3 py-1 rounded-full">
                        {displayRole}
                      </span>
                    </div>

                    <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">

                      <Link
                        to="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="text-sm text-[#172554] hover:text-teal-700 font-medium"
                      >
                        View My Profile
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="text-left text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Logout
                      </button>

                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* Dashboard Body */}
        <div className="p-4 sm:p-6 md:p-8">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#172554]">
              Hello, {user?.full_name || "Candidate"}! 👋
            </h1>

            <p className="text-gray-500 mt-2">
              Manage your profile and prepare for your next opportunity.
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">

            {/* Resume Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
                <FileText className="text-teal-700" size={24} />
              </div>

              <h3 className="text-lg font-semibold text-[#172554] mt-4">
                Resume Management
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Manage your resume and profile information.
              </p>

              <Link
                to="/candidate/resume"
                className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-teal-700 hover:text-teal-900"
              >
                View Resume
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Mock Interview Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Video className="text-blue-700" size={24} />
              </div>

              <h3 className="text-lg font-semibold text-[#172554] mt-4">
                Mock Interviews
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Practice interviews and improve your confidence.
              </p>

              <Link
                to="/candidate/interview"
                className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-teal-700 hover:text-teal-900"
              >
                Start Mock Interview
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Skill Assessment Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <BrainCircuit className="text-purple-700" size={24} />
              </div>

              <h3 className="text-lg font-semibold text-[#172554] mt-4">
                Skill Assessment
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Evaluate your skills through AI-powered assessments.
              </p>

              <span className="inline-block mt-4 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>

          </div>

          {/* Welcome Section */}
          <div className="mt-8 bg-gradient-to-r from-[#172554] to-[#0F766E] rounded-2xl p-6 sm:p-8 text-white">

            <h2 className="text-2xl font-bold">
              Your Career Journey Starts Here!
            </h2>

            <p className="text-gray-200 mt-3 max-w-xl">
              SmartHire AI will help you prepare for interviews,
              evaluate your skills and move closer to your career goals.
            </p>

            <button
              onClick={() => navigate("/candidate/resume")}
              className="mt-6 bg-white text-[#0F766E] px-5 py-3 rounded-lg font-semibold flex items-center gap-2"
            >
              Explore Platform
              <ArrowRight size={18} />
            </button>

          </div>

        </div>
      </main>

    </div>
  );
}

export default CandidateDashboard;
