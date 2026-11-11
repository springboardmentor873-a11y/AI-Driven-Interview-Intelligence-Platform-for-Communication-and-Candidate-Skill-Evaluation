import { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Brain, LayoutDashboard, FileText, Video, Users, Settings,
  LogOut, Menu, X, ChevronDown, User
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const candidateNav = [
  { href: '/candidate/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/candidate/resume', label: 'My Resume', icon: FileText },
  { href: '/candidate/interviews', label: 'Interviews', icon: Video },
];

const recruiterNav = [
  { href: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recruiter/candidates', label: 'Candidates', icon: Users },
  { href: '/recruiter/templates', label: 'Templates', icon: FileText },
];

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role === 'candidate' ? candidateNav : user?.role === 'recruiter' ? recruiterNav : adminNav;

  const handleLogout = useCallback(() => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/login');
  }, [clearAuth, navigate]);

  const roleColors: Record<string, string> = {
    candidate: 'badge-blue',
    recruiter: 'badge-purple',
    admin: 'badge-red',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-200 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5 p-5 border-b border-gray-100">
            <div className="p-1.5 bg-primary-600 rounded-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">SmartHire AI</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                <span className={clsx('badge text-xs', roleColors[user?.role || 'candidate'])}>{user?.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-500 hover:text-gray-700">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary-600" />
            <span className="font-bold text-gray-900">SmartHire AI</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

