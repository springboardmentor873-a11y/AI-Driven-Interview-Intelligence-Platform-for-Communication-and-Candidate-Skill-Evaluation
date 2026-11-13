import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, User } from 'lucide-react';

const Header = ({ onToggleSidebar }) => {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = profile?.name || user?.displayName || 'User';
  const roleName = profile?.role || 'User';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Mobile hamburger & logo */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Open sidebar menu"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline-block w-8 h-8 rounded-md bg-blue-600 text-white font-bold text-center leading-8 text-sm">
              SH
            </span>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              SmartHire <span className="text-blue-600">AI</span>
            </span>
          </div>
        </div>

        {/* Right: User info & logout */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-semibold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900 leading-tight">
                {displayName}
              </div>
              <div className="text-xs text-blue-600 font-medium capitalize">
                {roleName}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-300 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            title="Log out"
          >
            <LogOut size={14} />
            <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
