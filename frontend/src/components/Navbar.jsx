import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ user }) {
  const nav = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    nav('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                S
              </span>
              <span className="font-bold text-xl text-slate-800 tracking-tight">
                SmartHire AI
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition"
            >
              Dashboard
            </Link>
            <Link
              to="/resumes"
              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition"
            >
              Resumes
            </Link>

            {user && (
              <div className="flex items-center pl-3 border-l border-slate-200 space-x-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">
                    {user.username}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
