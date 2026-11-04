import { useEffect, useState } from "react";
import client from "./api/client";

export default function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    client
      .get("/api/health/")
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <div className="min-h-screen bg-hero-glow flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-extrabold">
        SmartHire{" "}
        <span className="bg-text-accent bg-clip-text text-transparent">AI</span>
      </h1>
      <p className="text-white/70">Backend status: {status}</p>
      <button className="bg-btn-brand px-6 py-3 rounded-xl font-semibold shadow-glow">
        Get Started
      </button>
    </div>
  );
}