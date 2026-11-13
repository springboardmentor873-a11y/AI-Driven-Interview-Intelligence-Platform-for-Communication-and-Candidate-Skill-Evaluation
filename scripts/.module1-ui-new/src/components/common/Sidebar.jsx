import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, X, User, Briefcase, Shield } from 'lucide-react';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { profile, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = profile?.role;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const navLinks = [
    {
      to: '/candidate/dashboard',
      label: 'Candidate Dashboard',
      roles: ['candidate'],
      icon: User,
    },
    {
      to: '/recruiter/dashboard',
      label: 'Recruiter Dashboard',
      roles: ['recruiter'],
      icon: Briefcase,
    },
    {
      to: '/admin/dashboard',
      label: 'Admin Dashboard',
      roles: ['admin'],
      icon: Shield,
    },
  ];

  const visibleLinks = navLinks.filter((item) => item.roles.includes(role));

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-gray-200">
      <div>
        {/* Mobile Header Inside Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
          <div className="flex items-center space-x-2">
            <span className="w-7 h-7 rounded-md bg-blue-600 text-white font-bold text-center leading-7 text-xs">
              SH
            </span>
            <span className="font-bold text-gray-900 text-base">SmartHire AI</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Brand on Desktop */}
        <div className="hidden md:flex items-center space-x-2.5 px-6 py-5 border-b border-gray-200">
          <span className="w-8 h-8 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
            SH
          </span>
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            SmartHire <span className="text-blue-600">AI</span>
          </span>
        </div>

        {/* Navigation items */}
        <div className="px-3 py-4">
          <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Navigation
          </div>
          <nav className="space-y-1">
            {visibleLinks.map((item) => {
              const Icon = item.icon || LayoutDashboard;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / User Profile snippet & logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 p-3 rounded-md mb-2 border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">Signed in as</div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {profile?.name || user?.displayName || 'User'}
          </div>
          <div className="text-xs text-gray-500 truncate">{profile?.email || user?.email}</div>
          <span className="inline-block mt-1 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider rounded bg-blue-100 text-blue-800">
            {role || 'User'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-300 rounded-md transition-colors"
        >
          <LogOut size={14} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 min-h-screen">
        <div className="sticky top-0 h-screen">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full z-50 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
