import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
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

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="border-b border-white/10 bg-ink/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        {user ? (
          <div className="flex items-center gap-5 text-sm">
            <Link to="/dashboard" className="text-white/70 hover:text-white">
              Dashboard
            </Link>
            {user.role === "admin" && (
              <Link to="/admin/users" className="text-white/70 hover:text-white">
                Users
              </Link>
            )}
            <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold capitalize text-brand-400">
              {user.role}
            </span>
            <Button variant="solid" className="!px-4 !py-2 text-sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
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