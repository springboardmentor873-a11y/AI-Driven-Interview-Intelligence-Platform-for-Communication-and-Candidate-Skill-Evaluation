import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";

function Logo() {
  return (
    <Link to="/" className="order-1 mr-auto flex items-center gap-2 whitespace-nowrap text-xl font-bold text-white">
      <span className="grid grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            className={`h-2.5 w-2.5 rounded-sm ${i === 3 ? "bg-white" : "bg-brand-400"}`}
          />
        ))}
      </span>
      SmartHire AI
    </Link>
  );
}

// The page you are on is highlighted
const linkClass = ({ isActive }) =>
  `whitespace-nowrap rounded-full px-3 py-1.5 transition ${
    isActive ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:text-white"
  }`;

const LINKS = {
  candidate: [
    { to: "/resumes", label: "Resumes" },
    { to: "/interview", label: "Interview" },
    { to: "/analytics", label: "Analytics" },
  ],
  recruiter: [{ to: "/templates", label: "Templates" }],
  admin: [{ to: "/admin/users", label: "Users" }],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initial = (user?.first_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/75 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-3.5">
        <Logo />

        {user ? (
          <>
            {/* On a phone the links get their own scrollable row under the logo */}
            <div className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 text-sm sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              {(LINKS[user.role] || []).map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
            </div>

            <div className="order-2 flex items-center gap-2 sm:order-3">
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 sm:flex">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-btn-brand text-xs font-bold">
                  {initial}
                </span>
                <span className="text-xs font-semibold capitalize text-brand-400">{user.role}</span>
              </span>
              <Button variant="solid" className="!px-4 !py-2 text-sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </>
        ) : (
          <div className="order-2 flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/70 hover:text-white">
              Sign in
            </Link>
            <Link to="/register">
              <Button className="!px-5 !py-2 text-sm">Get Started</Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
