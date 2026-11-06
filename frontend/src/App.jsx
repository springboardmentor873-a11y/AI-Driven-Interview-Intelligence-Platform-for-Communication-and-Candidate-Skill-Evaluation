import { useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import client from "./api/client";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  const [status, setStatus] = useState("checking...");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/api/health/")
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  const handleGoogle = async (response) => {
    setError("");
    try {
      const { data } = await client.post("/api/auth/google/", {
        id_token: response.credential,
      });
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      setUser(data.user);
    } catch {
      setError("Google login failed");
    }
  };

  return (
    <div className="min-h-screen bg-hero-glow flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-extrabold">
        SmartHire{" "}
        <span className="bg-text-accent bg-clip-text text-transparent">AI</span>
      </h1>
      <p className="text-white/70">Backend status: {status}</p>

      {user ? (
        <p className="text-white">
          Logged in as {user.email} ({user.role})
        </p>
      ) : (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleLogin onSuccess={handleGoogle} onError={() => setError("Google sign-in was cancelled")} />
        </GoogleOAuthProvider>
      )}
      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}