import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function OAuthCallback() {
  const { loginWithTokens } = useAuth();
  const nav = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const p = new URLSearchParams(window.location.hash.slice(1));
    const access = p.get("access_token"), refresh = p.get("refresh_token");
    if (!access || !refresh) return nav("/login?error=Google%20sign-in%20failed", { replace: true });
    window.history.replaceState(null, "", "/oauth/callback"); // drop tokens from the URL
    loginWithTokens(access, refresh)
      .then(() => nav("/dashboard", { replace: true }))
      .catch(() => nav("/login?error=Google%20sign-in%20failed", { replace: true }));
  }, []);

  return <p className="p-8 text-slate-500">Signing you in…</p>;
}
