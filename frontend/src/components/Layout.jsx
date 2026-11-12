import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Bell, BookOpen, BriefcaseBusiness, ChartNoAxesCombined, CircleHelp, FileText, LayoutDashboard, LogOut, Menu, Mic2, Settings, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/resume", label: "Resume & skills", icon: FileText },
  { to: "/app/interview", label: "Mock interview", icon: Mic2 },
  { to: "/app/history", label: "Interview history", icon: BookOpen },
  { to: "/app/analytics", label: "Performance", icon: ChartNoAxesCombined }
];
export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = links.find(x => x.to === location.pathname)?.label || "SmartHire AI";
  return <div className="min-h-screen bg-canvas">
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="flex items-center gap-3 px-6 py-7"><div className="brand-mark"><Sparkles size={21}/></div><div><div className="font-extrabold tracking-tight text-lg">SmartHire<span className="text-brand"> AI</span></div><div className="text-[10px] text-muted tracking-[.18em] uppercase">Interview intelligence</div></div><button className="ml-auto lg:hidden" onClick={() => setOpen(false)}><X/></button></div>
      <div className="px-5 mb-3 text-[10px] font-bold tracking-[.18em] uppercase text-slate-400">Workspace</div>
      <nav className="px-3 space-y-1">{links.map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({isActive}) => `nav-link ${isActive ? "nav-active" : ""}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="mx-5 my-7 border-t border-slate-100"/>
      <div className="px-5 mb-3 text-[10px] font-bold tracking-[.18em] uppercase text-slate-400">Support</div>
      <nav className="px-3 space-y-1"><a className="nav-link" href="mailto:support@smarthire.demo"><CircleHelp size={18}/>Help centre</a><a className="nav-link" href="#about"><Settings size={18}/>Settings</a></nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="flex gap-2 items-center text-brand font-bold"><ShieldCheck size={17}/> Your progress matters</div><p className="text-xs text-slate-500 mt-2 leading-5">Practice consistently and turn every attempt into progress.</p><div className="mt-3 h-1.5 rounded-full bg-violet-100"><div className="h-full w-3/4 rounded-full bg-brand"/></div></div>
        <div className="flex items-center gap-3 px-3 py-4"><div className="avatar">{(user?.full_name || "A").charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="text-sm font-bold truncate">{user?.full_name || "Candidate"}</div><div className="text-xs text-muted truncate">{user?.email}</div></div><button title="Sign out" onClick={logout} className="icon-button"><LogOut size={17}/></button></div>
      </div>
    </aside>
    {open && <button className="mobile-scrim" onClick={() => setOpen(false)} aria-label="Close menu"/>}
    <main className="main-area"><header className="topbar"><button className="lg:hidden icon-button" onClick={() => setOpen(true)}><Menu/></button><div><div className="text-xs text-muted">Workspace / <span className="text-slate-700">{title}</span></div><div className="font-bold text-lg mt-1">{title}</div></div><div className="ml-auto flex items-center gap-3"><span className="demo-chip"><span className="pulse-dot"/>{import.meta.env.VITE_USE_REAL_AUTH === "true" ? "Connected mode" : "Interactive demo"}</span><button className="icon-button relative"><Bell size={18}/><span className="notification-dot"/></button><div className="avatar hidden sm:flex">{(user?.full_name || "A").charAt(0).toUpperCase()}</div></div></header><motion.div key={location.pathname} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.25}} className="page-content"><Outlet/></motion.div></main>
  </div>;
}