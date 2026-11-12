import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Auth({ mode="login" }) {
  const isRegister = mode === "register";
  const { user, login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [name,setName] = useState(""); const [email,setEmail] = useState("alex@demo.com");
  const [password,setPassword] = useState("SmartHire@123"); const [show,setShow] = useState(false); const [error,setError] = useState("");
  if (user) return <Navigate to="/app" replace/>;
  const submit = async (e) => { e.preventDefault(); setError(""); try { if(isRegister) await register(name,email,password); else await login(email,password); navigate("/app"); } catch(err) { setError(err.message); } };
  return <div className="auth-shell"><div className="auth-left"><Link to="/" className="flex items-center gap-3"><div className="brand-mark"><Sparkles size={21}/></div><span className="font-extrabold text-xl text-white">SmartHire AI</span></Link><div className="auth-promo"><div className="eyebrow text-violet-200">YOUR NEXT OPPORTUNITY STARTS HERE</div><h1>Show up prepared.<br/><span className="text-violet-300">Stand out naturally.</span></h1><p>Build interview confidence with structured practice, intelligent feedback and a clearer view of your strengths.</p><div className="auth-points"><div><CheckCircle2/> Practice role-focused questions</div><div><CheckCircle2/> Understand your communication patterns</div><div><CheckCircle2/> Track your improvement over time</div></div></div><div className="text-xs text-indigo-200/60">SmartHire AI · Interview intelligence platform</div></div>
    <div className="auth-right"><div className="auth-form-wrap"><div className="eyebrow">{isRegister ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</div><h2>{isRegister ? "Start your journey" : "Sign in to SmartHire"}</h2><p className="text-sm text-muted mb-8">{isRegister ? "Create an account to begin your interview preparation." : "Your next practice session is just around the corner."}</p>
      <form onSubmit={submit} className="space-y-4">{isRegister && <label className="field-label">Full name<div className="field-wrap"><UserRound/><input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex Morgan"/></div></label>}
      <label className="field-label">Email address<div className="field-wrap"><Mail/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div></label>
      <label className="field-label">Password<div className="field-wrap"><LockKeyhole/><input required minLength={8} type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label>
      {error && <div className="error-banner">{error}</div>}
      <button className="btn-primary w-full justify-center mt-2" disabled={loading}>{loading?"Please wait...":isRegister?"Create account":"Sign in"} <ArrowRight size={17}/></button></form>
      {!isRegister && <div className="text-xs text-muted mt-4">Demo credentials are prefilled. Any email and password will work in demo mode.</div>}
      <div className="text-sm text-center text-muted mt-7">{isRegister?"Already have an account?":"New to SmartHire?"} <Link className="font-bold text-brand" to={isRegister?"/login":"/register"}>{isRegister?"Sign in":"Create an account"}</Link></div>
      <div className="mt-9 text-center text-xs text-slate-400">By continuing, you agree to our Terms of Service and Privacy Policy.</div>
    </div></div></div>;
}