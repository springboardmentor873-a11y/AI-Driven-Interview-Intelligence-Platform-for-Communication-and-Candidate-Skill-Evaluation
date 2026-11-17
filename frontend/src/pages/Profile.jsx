import { useState } from "react";
import api, { errorMessage } from "../api";
import { useAuth } from "../AuthContext";
import { inputCls, btnCls } from "./AuthLayout";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.full_name);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [msg, setMsg] = useState({ name: "", pw: "" });

  const saveName = async (e) => {
    e.preventDefault();
    try { updateUser((await api.patch("/api/auth/me", { full_name: name })).data); setMsg({ ...msg, name: "Name saved." }); }
    catch (err) { setMsg({ ...msg, name: errorMessage(err) }); }
  };

  const savePw = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/auth/change-password", pw);
      setPw({ current_password: "", new_password: "" });
      setMsg({ ...msg, pw: "Password changed." });
    } catch (err) { setMsg({ ...msg, pw: errorMessage(err) }); }
  };

  return (
    <div className="max-w-md space-y-10">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <form onSubmit={saveName} className="space-y-3">
        <h2 className="font-medium">Your details</h2>
        <input className={`${inputCls} bg-slate-100`} value={user.email} disabled />
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
        <button className={btnCls}>Save name</button>
        {msg.name && <p className="text-sm text-slate-600">{msg.name}</p>}
      </form>

      {user.auth_provider === "local" && (
        <form onSubmit={savePw} className="space-y-3">
          <h2 className="font-medium">Change password</h2>
          <input className={inputCls} type="password" placeholder="Current password" required
            value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
          <input className={inputCls} type="password" placeholder="New password (min 8 characters)" required minLength={8}
            value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
          <button className={btnCls}>Change password</button>
          {msg.pw && <p className="text-sm text-slate-600">{msg.pw}</p>}
        </form>
      )}
    </div>
  );
}
