import { useEffect, useRef, useState } from "react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const workflow = [
  {
    number: "01",
    title: "Set up your profile",
    description: "Create a secure candidate account.",
    status: "In place",
  },
  {
    number: "02",
    title: "Add your resume",
    description: "Upload a PDF so your skills can guide practice.",
    status: "Next step",
  },
  {
    number: "03",
    title: "Plan an interview",
    description: "Choose an interview type and difficulty.",
    status: "Coming next",
  },
];

async function requestJson(path, { method = "GET", token, body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const messages = [];
    if (typeof data?.detail === "string") {
      messages.push(data.detail);
    } else if (data && typeof data === "object") {
      Object.values(data).forEach((value) => {
        messages.push(...(Array.isArray(value) ? value : [value]));
      });
    }

    const error = new Error(
      messages.filter((message) => typeof message === "string").join(" ") ||
        `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

function App() {
  const [accessToken, setAccessToken] = useState(() =>
    sessionStorage.getItem("smarthire.access"),
  );
  const [authChecking, setAuthChecking] = useState(() =>
    Boolean(sessionStorage.getItem("smarthire.access")),
  );
  const [authMode, setAuthMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [profile, setProfile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!accessToken) {
      setAuthChecking(false);
      return undefined;
    }

    let active = true;
    setAuthChecking(true);

    Promise.all([
      requestJson("/auth/profile/", { token: accessToken }),
      requestJson("/auth/resumes/", { token: accessToken }),
    ])
      .then(([user, userResumes]) => {
        if (active) {
          setProfile(user);
          setResumes(userResumes);
          setDashboardError("");
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        sessionStorage.removeItem("smarthire.access");
        sessionStorage.removeItem("smarthire.refresh");
        setAccessToken(null);
        setProfile(null);
        setResumes([]);
        setAuthError(
          error.status === 401
            ? "Your session expired. Please sign in again."
            : error.message,
        );
      })
      .finally(() => {
        if (active) {
          setAuthChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");

    try {
      if (authMode === "register") {
        await requestJson("/auth/register/", {
          method: "POST",
          body: JSON.stringify({
            username,
            email: String(form.get("email") || "").trim(),
            password,
            first_name: String(form.get("first_name") || "").trim(),
            last_name: String(form.get("last_name") || "").trim(),
          }),
        });
      }

      const tokens = await requestJson("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      sessionStorage.setItem("smarthire.access", tokens.access);
      sessionStorage.setItem("smarthire.refresh", tokens.refresh);
      setAuthChecking(true);
      setAccessToken(tokens.access);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignOut() {
    sessionStorage.removeItem("smarthire.access");
    sessionStorage.removeItem("smarthire.refresh");
    setAccessToken(null);
    setProfile(null);
    setResumes([]);
    setSelectedFile(null);
    setDashboardError("");
    setAuthError("");
  }

  async function handleResumeUpload(event) {
    event.preventDefault();
    setDashboardError("");

    if (!selectedFile) {
      setDashboardError("Choose a PDF file to upload.");
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setDashboardError("Choose a file with a .pdf extension.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setDashboardError("Resume files must be 10 MB or smaller.");
      return;
    }

    const form = new FormData();
    form.append("file", selectedFile);
    setIsUploading(true);

    try {
      const resume = await requestJson("/auth/resumes/", {
        method: "POST",
        token: accessToken,
        body: form,
      });
      setResumes((current) => [resume, ...current]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setDashboardError(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleResumeDownload(resumeId) {
    setDashboardError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/resumes/${resumeId}/download/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}.`);
      }

      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `smarthire-resume-${resumeId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      setDashboardError(error.message);
    }
  }

  async function handleResumeDelete(resumeId) {
    if (!window.confirm("Delete this resume?")) {
      return;
    }

    setDashboardError("");
    try {
      await requestJson(`/auth/resumes/${resumeId}/`, {
        method: "DELETE",
        token: accessToken,
      });
      setResumes((current) =>
        current.filter((resume) => resume.id !== resumeId),
      );
    } catch (error) {
      setDashboardError(error.message);
    }
  }

  if (authChecking) {
    return (
      <main className="auth-page">
        <p className="loading-message">Loading your SmartHire workspace...</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="auth-page">
        <a className="auth-brand" href="/" aria-label="SmartHire AI home">
          <span className="brand-mark">S</span>
          <span>
            SmartHire<span className="brand-light"> AI</span>
          </span>
        </a>
        <section className="auth-card">
          <p className="eyebrow">CANDIDATE WORKSPACE</p>
          <h1>
            {authMode === "login"
              ? "Welcome back."
              : "Create your candidate account."}
          </h1>
          <p className="auth-description">
            {authMode === "login"
              ? "Sign in to continue preparing for your next interview."
              : "Set up your account to organize your interview preparation."}
          </p>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <>
                <label>
                  First name
                  <input
                    autoComplete="given-name"
                    name="first_name"
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    autoComplete="family-name"
                    name="last_name"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    autoComplete="email"
                    name="email"
                    type="email"
                    required
                  />
                </label>
              </>
            )}
            <label>
              Username
              <input
                autoComplete="username"
                name="username"
                required
              />
            </label>
            <label>
              Password
              <span className="password-input-wrap">
                <input
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
            {authError && (
              <p className="form-message error" role="alert">
                {authError}
              </p>
            )}
            <button className="primary-button" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait..."
                : authMode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login"
              ? "New to SmartHire AI?"
              : "Already have an account?"}{" "}
            <button
              className="text-button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              type="button"
            >
              {authMode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
        <p className="auth-footnote">
          Candidate accounts are created with the candidate role.
        </p>
      </main>
    );
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.username ||
    "Candidate";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="SmartHire AI home">
          <span className="brand-mark">S</span>
          <span>
            SmartHire<span className="brand-light"> AI</span>
          </span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Candidate workspace">
          <a className="nav-link active" href="#overview">
            Overview
          </a>
          <a className="nav-link" href="#resume">
            My resume
          </a>
          <a className="nav-link" href="#workflow">
            Interview plan
          </a>
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          <span>Milestone 1 workspace</span>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <span className="breadcrumb">Candidate workspace / Overview</span>
          <div className="topbar-actions">
            <div className="user-chip">
              <span className="avatar">{initials}</span>
              <span>{displayName}</span>
            </div>
            <button className="text-button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">YOUR PREPARATION, IN ONE PLACE</p>
            <h1>Build confidence, one interview at a time.</h1>
            <p className="welcome-copy">
              Organize your profile and resume before starting a practice
              session.
            </p>
          </div>
          <span className="role-badge">Candidate</span>
        </section>

        <section className="summary-grid" aria-label="Candidate summary">
          <article className="summary-card">
            <span className="card-icon purple">P</span>
            <p className="card-label">Profile status</p>
            <h2>{displayName}</h2>
            <p className="muted">{profile?.email}</p>
          </article>
          <article className="summary-card" id="resume">
            <span className="card-icon green">R</span>
            <p className="card-label">Resume library</p>
            <h2>
              {resumes.length
                ? `${resumes.length} resume${resumes.length === 1 ? "" : "s"} uploaded`
                : "No resume uploaded"}
            </h2>
            <p className="muted">PDF files up to 10 MB are supported.</p>
          </article>
          <article className="summary-card">
            <span className="card-icon orange">I</span>
            <p className="card-label">Interview practice</p>
            <h2>Ready when you are</h2>
            <p className="muted">Your interview history will appear here.</p>
          </article>
        </section>

        {dashboardError && (
          <p className="form-message error dashboard-message" role="alert">
            {dashboardError}
          </p>
        )}

        <section className="content-grid">
          <article className="panel workflow-panel" id="workflow">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">GETTING STARTED</p>
                <h2>Your preparation workflow</h2>
              </div>
              <span className="step-count">3 steps</span>
            </div>
            <ol className="workflow-list">
              {workflow.map((step) => (
                <li className="workflow-item" key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <div className="step-copy">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                  <span
                    className={
                      step.status === "In place"
                        ? "step-status complete"
                        : "step-status"
                    }
                  >
                    {step.status}
                  </span>
                </li>
              ))}
            </ol>
          </article>

          <article className="panel resume-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">RESUME LIBRARY</p>
                <h2>Add your resume</h2>
              </div>
              <span className="upload-icon" aria-hidden="true">
                ↑
              </span>
            </div>
            <form className="resume-upload-form" onSubmit={handleResumeUpload}>
              <label className="file-picker">
                <span>{selectedFile?.name || "Choose a PDF file"}</span>
                <input
                  accept=".pdf,application/pdf"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] || null)
                  }
                  ref={fileInputRef}
                  type="file"
                />
              </label>
              <p className="muted">PDF files only, up to 10 MB.</p>
              <button
                className="primary-button upload-button"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload PDF"}
              </button>
            </form>
            {resumes.length > 0 && (
              <ul className="resume-list" aria-label="Uploaded resumes">
                {resumes.map((resume) => (
                  <li className="resume-item" key={resume.id}>
                    <div>
                      <strong>Resume #{resume.id}</strong>
                      <span>
                        Uploaded{" "}
                        {new Date(resume.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="resume-actions">
                      <button
                        className="text-button"
                        onClick={() => handleResumeDownload(resume.id)}
                        type="button"
                      >
                        Download
                      </button>
                      <button
                        className="text-button danger-button"
                        onClick={() => handleResumeDelete(resume.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <footer className="page-footer">
          <span>SmartHire AI</span>
          <span>Candidate preparation workspace</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
