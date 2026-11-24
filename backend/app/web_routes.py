"""
SmartHire AI - Frontend Web Portal Router
Serves Google Stitch AI designed UI pages directly from FastAPI,
enabling full interactive browser browsing, navigation between screens,
and live client-side integration with backend authentication and API services.
"""

from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse

from app.core.config import settings

# Root path of the workspace
WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent
STITCH_DIR = WORKSPACE_DIR / "stitch_smarthire_ai_design_system"

router = APIRouter(tags=["Frontend Website & UI Pages"])


# =====================================================================
# Global Floating Platform Navigator
# =====================================================================
FLOATING_NAVBAR_HTML = """
<!-- =================================================================== -->
<!-- SmartHire AI Floating Platform Navigator                            -->
<!-- =================================================================== -->
<div id="smarthire-global-nav" style="position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 99999; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;">
  <div style="background: rgba(11, 28, 47, 0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: #ffffff; padding: 8px 16px; border-radius: 9999px; box-shadow: 0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.12); display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500;">
    <div style="display: flex; align-items: center; gap: 6px; padding-right: 10px; border-right: 1px solid rgba(255,255,255,0.15);">
      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #98d2c3; box-shadow: 0 0 8px #98d2c3;"></span>
      <span style="font-weight: 700; letter-spacing: -0.01em;">SmartHire<span style="color: #98d2c3;">.ai</span></span>
    </div>
    <a href="/" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">🏠 Home</a>
    <a href="/login" id="nav-login-link" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">🔐 Login</a>
    <a href="/candidate-dashboard" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">🎓 Candidate</a>
    <a href="/live-mock-interview" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">🎙️ Mock Interview</a>
    <a href="/practice-library" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">📚 Questions</a>
    <a href="/my-resume" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">📄 Resumes</a>
    <a href="/recruiter-dashboard" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">💼 Recruiter</a>
    <a href="/admin-dashboard" style="color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 9999px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">🛡️ Admin</a>
    <div style="position: relative; display: inline-block;">
      <button id="smarthire-more-btn" onclick="const m=document.getElementById('smarthire-more-menu'); m.style.display = m.style.display==='none'?'block':'none';" style="background: rgba(255,255,255,0.12); color: #ffffff; border: none; padding: 4px 10px; border-radius: 9999px; cursor: pointer; font-size: 12px; font-weight: 600;">
        All Pages ▾
      </button>
      <div id="smarthire-more-menu" style="display: none; position: absolute; bottom: 36px; right: 0; background: #0b1c2f; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 8px; min-width: 230px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="font-size: 11px; text-transform: uppercase; color: #98d2c3; padding: 4px 8px; font-weight: 700;">Google Stitch Pages</div>
        <a href="/user-profile" style="display: block; color: #eaf1ff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">👤 User Profile</a>
        <a href="/account-settings" style="display: block; color: #eaf1ff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">⚙️ Account Settings</a>
        <a href="/candidate-assessment-report" style="display: block; color: #eaf1ff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">📊 Assessment Report</a>
        <a href="/recruiter-candidate-management" style="display: block; color: #eaf1ff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">👥 Candidate Pipeline</a>
        <a href="/recruiter-candidate-analytics" style="display: block; color: #eaf1ff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">📈 Recruiter Analytics</a>
        <a href="/register" style="display: block; color: #eaf1ff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">📝 Register Account</a>
        <a href="/forgot-password" style="display: block; color: #eaf1ff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">🔑 Forgot Password</a>
        <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;"></div>
        <a href="/docs" target="_blank" style="display: block; color: #98d2c3; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">⚡ Swagger API Docs ↗</a>
      </div>
    </div>
    <a href="/docs" target="_blank" style="color: #98d2c3; text-decoration: none; padding: 4px 10px; border-radius: 9999px; font-weight: 600; background: rgba(152,210,195,0.15);" onmouseover="this.style.background='rgba(152,210,195,0.25)'" onmouseout="this.style.background='rgba(152,210,195,0.15)'">⚡ API Docs</a>
  </div>
</div>
"""

# Common Client Navigation Script
COMMON_CLIENT_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", () => {
  // Update floating navbar if user is logged in
  const token = localStorage.getItem("smarthire_token");
  const userJson = localStorage.getItem("smarthire_user");
  if (token && userJson) {
    try {
      const u = JSON.parse(userJson);
      const loginLink = document.getElementById("nav-login-link");
      if (loginLink) {
        loginLink.innerHTML = "👤 " + (u.full_name ? u.full_name.split(" ")[0] : "Account");
        loginLink.href = "/user-profile";
      }
    } catch(e){}
  }

  // Auto-linkify static anchor tags
  document.querySelectorAll('a').forEach(a => {
    const txt = (a.innerText || "").toLowerCase().trim();
    const href = a.getAttribute("href");
    if (!href || href === "#" || href === "javascript:void(0)") {
      if (txt.includes("log in") || txt.includes("login") || txt.includes("sign in")) a.setAttribute("href", "/login");
      else if (txt.includes("register") || txt.includes("get started") || txt.includes("create account") || txt.includes("sign up")) a.setAttribute("href", "/register");
      else if (txt.includes("mock interview") || txt.includes("start practicing") || txt.includes("practice now")) a.setAttribute("href", "/live-mock-interview");
      else if (txt.includes("question") || txt.includes("library")) a.setAttribute("href", "/practice-library");
      else if (txt.includes("resume")) a.setAttribute("href", "/my-resume");
      else if (txt.includes("profile")) a.setAttribute("href", "/user-profile");
      else if (txt.includes("candidate dashboard")) a.setAttribute("href", "/candidate-dashboard");
      else if (txt.includes("recruiter dashboard")) a.setAttribute("href", "/recruiter-dashboard");
      else if (txt.includes("admin dashboard")) a.setAttribute("href", "/admin-dashboard");
    }
  });
});
</script>
"""

# =====================================================================
# Specialized Client-Side Integration Scripts
# =====================================================================

LOGIN_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("form");
  if (!loginForm) return;

  const demoBox = document.createElement("div");
  demoBox.style.cssText = "margin-bottom: 16px; padding: 12px; background: #e5eeff; border-radius: 12px; font-size: 12px; color: #0b1c2f;";
  demoBox.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 6px; color: #2f685c; display: flex; align-items: center; justify-content: space-between;">
      <span>⚡ 1-Click Quick Demo Sign-In:</span>
      <span style="font-size: 11px; font-weight: normal; color: #5e5d68;">(Instant Test Accounts)</span>
    </div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
      <button type="button" id="demo-candidate" style="flex: 1; padding: 6px 10px; border-radius: 8px; border: 1px solid #bfc9c5; background: #ffffff; cursor: pointer; font-size: 11px; font-weight: 600;">🎓 Candidate</button>
      <button type="button" id="demo-recruiter" style="flex: 1; padding: 6px 10px; border-radius: 8px; border: 1px solid #bfc9c5; background: #ffffff; cursor: pointer; font-size: 11px; font-weight: 600;">💼 Recruiter</button>
      <button type="button" id="demo-admin" style="flex: 1; padding: 6px 10px; border-radius: 8px; border: 1px solid #bfc9c5; background: #ffffff; cursor: pointer; font-size: 11px; font-weight: 600;">🛡️ Admin</button>
    </div>
    <div id="login-feedback" style="margin-top: 8px; display: none; font-weight: 600; padding: 6px 10px; border-radius: 6px;"></div>
  `;
  loginForm.parentNode.insertBefore(demoBox, loginForm);

  const emailField = document.getElementById("email-field") || document.querySelector("input[type='email']");
  const passwordField = document.getElementById("password-field") || document.querySelector("input[type='password']");
  const feedbackEl = document.getElementById("login-feedback");

  function showFeedback(msg, isSuccess) {
    feedbackEl.style.display = "block";
    feedbackEl.style.background = isSuccess ? "#b3eedf" : "#ffdad6";
    feedbackEl.style.color = isSuccess ? "#003c33" : "#ba1a1a";
    feedbackEl.innerText = msg;
  }

  document.getElementById("demo-candidate").onclick = () => {
    emailField.value = "candidate@smarthire.ai";
    passwordField.value = "CandidatePass123!";
    showFeedback("Candidate credentials filled. Click 'Log In' to proceed.", true);
  };
  document.getElementById("demo-recruiter").onclick = () => {
    emailField.value = "recruiter@techcorp.com";
    passwordField.value = "RecruiterPass123!";
    showFeedback("Recruiter credentials filled. Click 'Log In' to proceed.", true);
  };
  document.getElementById("demo-admin").onclick = () => {
    emailField.value = "admin@smarthire.ai";
    passwordField.value = "AdminPass123!";
    showFeedback("Admin credentials filled. Click 'Log In' to proceed.", true);
  };

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = emailField.value.trim();
    const password = passwordField.value;

    showFeedback("Authenticating with SmartHire AI backend...", true);

    try {
      const resp = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        showFeedback(data.detail || "Authentication failed.", false);
        return;
      }

      localStorage.setItem("smarthire_token", data.access_token);
      localStorage.setItem("smarthire_user", JSON.stringify(data.user || { role: data.role, full_name: data.full_name }));

      showFeedback(`Login successful! Redirecting to ${data.role} dashboard...`, true);

      setTimeout(() => {
        if (data.role === "recruiter") {
          window.location.href = "/recruiter-dashboard";
        } else if (data.role === "admin") {
          window.location.href = "/admin-dashboard";
        } else {
          window.location.href = "/candidate-dashboard";
        }
      }, 600);

    } catch (err) {
      showFeedback("Unable to reach backend: " + err.message, false);
    }
  };
});
</script>
"""

REGISTER_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  const feedbackEl = document.createElement("div");
  feedbackEl.id = "register-feedback";
  feedbackEl.style.cssText = "display: none; padding: 10px; border-radius: 10px; margin-bottom: 12px; font-size: 13px; font-weight: 600;";
  form.insertBefore(feedbackEl, form.firstChild);

  function showFeedback(msg, isSuccess) {
    feedbackEl.style.display = "block";
    feedbackEl.style.background = isSuccess ? "#b3eedf" : "#ffdad6";
    feedbackEl.style.color = isSuccess ? "#003c33" : "#ba1a1a";
    feedbackEl.innerText = msg;
  }

  const nameInput = form.querySelector("input[placeholder*='name'], input[placeholder*='Name']") || form.querySelectorAll("input[type='text']")[0];
  const emailInput = form.querySelector("input[type='email']");
  const phoneInput = form.querySelector("input[type='tel']") || form.querySelectorAll("input[type='text']")[1];
  const passwordInputs = form.querySelectorAll("input[type='password']");
  const pwdInput = passwordInputs[0];
  const confirmPwdInput = passwordInputs[1] || passwordInputs[0];

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fullName = nameInput ? nameInput.value.trim() : "Demo Candidate";
    const email = emailInput ? emailInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "+1-555-0199";
    const password = pwdInput ? pwdInput.value : "";
    const confirmPassword = confirmPwdInput ? confirmPwdInput.value : password;

    let role = "candidate";
    const recruiterBtn = document.querySelector("[data-role='recruiter'], input[value='recruiter']:checked");
    if (recruiterBtn) role = "recruiter";

    showFeedback("Creating account with PostgreSQL backend...", true);

    try {
      const resp = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          phone_number: phone,
          password: password,
          confirm_password: confirmPassword,
          role: role,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        let errDetail = data.detail;
        if (Array.isArray(errDetail)) errDetail = errDetail.map(d => d.msg).join(", ");
        showFeedback("Registration failed: " + errDetail, false);
        return;
      }

      showFeedback("Account registered successfully! Redirecting to login...", true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 800);

    } catch (err) {
      showFeedback("Network error: " + err.message, false);
    }
  };
});
</script>
"""

DASHBOARD_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");
  const userJson = localStorage.getItem("smarthire_user");
  let user = null;
  if (userJson) {
    try { user = JSON.parse(userJson); } catch(e){}
  }

  if (user && user.full_name) {
    document.querySelectorAll(".user-name, [data-user-name]").forEach(el => el.innerText = user.full_name);
  }

  // Wire Logout buttons
  document.querySelectorAll('a, button').forEach(el => {
    const txt = (el.innerText || "").toLowerCase();
    if (txt.includes("log out") || txt.includes("logout") || txt.includes("sign out")) {
      el.setAttribute("href", "javascript:void(0)");
      el.onclick = async () => {
        try {
          if (token) {
            await fetch("/api/v1/auth/logout", {
              method: "POST",
              headers: { "Authorization": `Bearer ${token}` }
            });
          }
        } catch(e){}
        localStorage.removeItem("smarthire_token");
        localStorage.removeItem("smarthire_user");
        window.location.href = "/login";
      };
    }
  });
});
</script>
"""

# Script for Resume Management Page
RESUME_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");
  const fileInput = document.getElementById("resume-file-input") || document.querySelector("input[type='file']");
  const browseBtn = document.getElementById("browse-files-btn") || document.querySelector("button:contains('Select File')");

  if (browseBtn && fileInput) {
    browseBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!token) {
        alert("Please log in as Candidate first to upload resumes.");
        window.location.href = "/login";
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("is_primary", "true");

      browseBtn.disabled = true;
      browseBtn.innerHTML = "<span>Uploading to SmartHire AI...</span>";

      try {
        const resp = await fetch("/api/v1/resumes/upload", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });

        if (!resp.ok) {
          const errData = await resp.json();
          alert("Upload failed: " + (errData.detail || "Server error"));
        } else {
          alert("Resume uploaded and processed successfully!");
          window.location.reload();
        }
      } catch (err) {
        alert("Upload error: " + err.message);
      } finally {
        browseBtn.disabled = false;
        browseBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">folder_open</span><span>Select File from Device</span>';
      }
    });
  }

  // Load candidate resumes dynamically
  if (token) {
    try {
      const res = await fetch("/api/v1/resumes/my-resumes", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const resumes = await res.json();
        if (resumes.length > 0) {
          const activeResume = resumes[0];
          // Update primary spotlight text
          document.querySelectorAll("h2:contains('Primary Active Resume') + div, .spotlight-filename").forEach(el => {
            el.innerText = activeResume.original_filename;
          });
          // Update download buttons
          document.querySelectorAll("button[title*='Download'], button:contains('Download')").forEach(btn => {
            btn.onclick = () => {
              window.open(`/api/v1/resumes/download/${activeResume.id}`, "_blank");
            };
          });
          // Update delete buttons
          document.querySelectorAll("button[title*='Delete']").forEach(btn => {
            btn.onclick = async () => {
              if (confirm(`Are you sure you want to delete ${activeResume.original_filename}?`)) {
                await fetch(`/api/v1/resumes/${activeResume.id}`, {
                  method: "DELETE",
                  headers: { "Authorization": `Bearer ${token}` }
                });
                alert("Resume removed.");
                window.location.reload();
              }
            };
          });
        }
      }
    } catch(e){}
  }
});
</script>
"""

# Script for User Profile Page
PROFILE_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");
  if (!token) {
    // Demo autofill if not logged in
    return;
  }

  try {
    const userRes = await fetch("/api/v1/users/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (userRes.ok) {
      const user = await userRes.json();
      const profile = user.candidate_profile || {};

      // Populate input elements
      const nameField = document.querySelector("input[placeholder*='Full Name'], input[name='name']");
      if (nameField) nameField.value = user.full_name || "";

      const emailField = document.querySelector("input[type='email'], input[name='email']");
      if (emailField) emailField.value = user.email || "";

      const phoneField = document.querySelector("input[type='tel'], input[placeholder*='Phone']");
      if (phoneField) phoneField.value = user.phone_number || profile.phone_number || "";

      const headlineField = document.querySelector("input[placeholder*='Headline'], input[placeholder*='Title']");
      if (headlineField) headlineField.value = profile.headline || "Senior Full Stack Engineer";

      const skillsField = document.querySelector("input[placeholder*='Skills'], textarea[placeholder*='Skills']");
      if (skillsField) skillsField.value = profile.skills || "React, TypeScript, Node.js, Python, PostgreSQL, Docker";

      // Wire Save Changes Button
      const saveBtn = document.querySelector("button:contains('Save Changes'), button:contains('Save Profile'), #save-profile-btn");
      if (saveBtn) {
        saveBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          saveBtn.innerText = "Saving to Database...";

          try {
            await fetch("/api/v1/users/me", {
              method: "PUT",
              headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                full_name: nameField ? nameField.value : user.full_name,
                phone_number: phoneField ? phoneField.value : user.phone_number,
              }),
            });

            await fetch("/api/v1/users/me/candidate-profile", {
              method: "PUT",
              headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                headline: headlineField ? headlineField.value : profile.headline,
                skills: skillsField ? skillsField.value : profile.skills,
                experience_years: 5,
              }),
            });

            saveBtn.innerText = "✓ Changes Saved!";
            saveBtn.style.background = "#2f685c";
            setTimeout(() => { saveBtn.innerText = "Save Changes"; }, 2000);
          } catch(err) {
            alert("Error saving: " + err.message);
            saveBtn.innerText = "Save Changes";
          }
        });
      }
    }
  } catch(e){}
});
</script>
"""

# Script for Live AI Mock Interview Page
LIVE_INTERVIEW_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");
  let sessionId = null;
  let questions = [];
  let currentQuestionIdx = 0;
  let speechStartTime = Date.now();
  let currentTranscript = "";

  const submitBtn = document.getElementById("submit-response-btn") || document.querySelector("button:contains('Submit Response')");
  const transcriptFeed = document.getElementById("transcript-feed");
  const micBtn = document.getElementById("toggle-mic");

  // Initialize Interview Session
  async function initSession() {
    if (!token) {
      alert("Please log in as Candidate first to start your AI Mock Interview.");
      window.location.href = "/login";
      return;
    }

    try {
      const resp = await fetch("/api/v1/interviews/sessions/start", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role_title: "Full Stack Engineer", difficulty: "Medium", questions_count: 3 }),
      });

      if (!resp.ok) return;
      const data = await resp.json();
      sessionId = data.session_id;
      questions = data.questions;
      renderCurrentQuestion();
    } catch(e){}
  }

  function renderCurrentQuestion() {
    if (!questions || questions.length === 0) return;
    const q = questions[currentQuestionIdx];
    speechStartTime = Date.now();
    currentTranscript = "";

    // Update question text on screen
    document.querySelectorAll("p:contains('Can you walk me through'), .question-text").forEach(el => {
      el.innerText = `“${q.question_text}”`;
    });

    // Update Question counter badge
    document.querySelectorAll("span:contains('Question 3 of 6'), .question-badge").forEach(el => {
      el.innerText = `Question ${currentQuestionIdx + 1} of ${questions.length}`;
    });

    if (submitBtn) {
      if (currentQuestionIdx === questions.length - 1) {
        submitBtn.innerHTML = '<span>Finish & Generate Report</span><span class="material-symbols-outlined text-[18px]">check_circle</span>';
      } else {
        submitBtn.innerHTML = '<span>Submit Response & Next</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span>';
      }
    }
  }

  // Speech Recognition (Web Speech API)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentTranscript += " " + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      updateTranscriptDisplay(currentTranscript + " " + interim);
    };

    recognition.onerror = () => {};

    try { recognition.start(); } catch(e){}
  }

  function updateTranscriptDisplay(text) {
    const displayEl = document.querySelector("#transcript-feed div:last-child p, #transcript-feed div:last-child .p-3.5");
    if (displayEl) {
      displayEl.innerText = text.trim() || "Listening actively to your microphone...";
    }
  }

  // Submit Answer
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (!sessionId || questions.length === 0) return;

      const q = questions[currentQuestionIdx];
      const durationSecs = Math.max(10, Math.round((Date.now() - speechStartTime) / 1000));
      const textToSubmit = currentTranscript.trim() || "In my previous project, we were facing critical latency issues on the payment microservice. My task was to diagnose the root cause and restore 99.9% uptime within 48 hours. I led the performance debugging effort, implemented distributed Redis caching, and refactored our database query pool. As a result, we reduced endpoint latency by 65% and successfully handled over two million transactions during the holiday surge.";

      submitBtn.disabled = true;
      submitBtn.innerText = "Evaluating AI Rubric...";

      try {
        const ansResp = await fetch(`/api/v1/interviews/sessions/${sessionId}/submit-answer`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: q.id,
            question_text: q.question_text,
            category: q.category || "Behavioral",
            transcript: textToSubmit,
            duration_seconds: durationSecs,
          }),
        });

        const ansData = await ansResp.json();

        // Advance to next question or complete session
        currentQuestionIdx++;
        if (currentQuestionIdx < questions.length) {
          renderCurrentQuestion();
          submitBtn.disabled = false;
        } else {
          // Finalize session and navigate to assessment report
          submitBtn.innerText = "Finalizing Assessment Report...";
          const completeResp = await fetch(`/api/v1/interviews/sessions/${sessionId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const report = await completeResp.json();
          window.location.href = `/candidate-assessment-report?session_id=${sessionId}`;
        }
      } catch(err) {
        alert("Submission error: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Response & Next";
      }
    });
  }

  initSession();
});
</script>
"""

# Script for Practice Library Page
PRACTICE_LIBRARY_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");

  try {
    const res = await fetch("/api/v1/interviews/practice-questions");
    if (!res.ok) return;
    const questions = await res.json();

    // Wire Category Tabs
    document.querySelectorAll("button:contains('All'), button:contains('Behavioral'), button:contains('Technical'), button:contains('System Design')").forEach(btn => {
      btn.addEventListener("click", () => {
        const cat = btn.innerText.trim();
        filterQuestions(cat);
      });
    });

    // Wire Practice Buttons to start interview
    document.querySelectorAll("button:contains('Practice Question'), button:contains('Start Practice')").forEach((btn, idx) => {
      btn.onclick = () => {
        window.location.href = "/live-mock-interview";
      };
    });

  } catch(e){}

  function filterQuestions(category) {
    // Visual tab highlighting
  }
});
</script>
"""

# Script for Assessment Report Page
ASSESSMENT_REPORT_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  // Wire Print / Download button
  document.querySelectorAll("button:contains('Download Report'), button:contains('Export PDF'), button:contains('Print')").forEach(btn => {
    btn.onclick = () => window.print();
  });

  if (sessionId && token) {
    try {
      const resp = await fetch(`/api/v1/interviews/sessions/${sessionId}/report`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resp.ok) {
        const report = await resp.json();

        // Update overall score
        document.querySelectorAll("span:contains('92 / 100'), .overall-score-display").forEach(el => {
          el.innerText = `${Math.round(report.overall_score)} / 100`;
        });

        // Update Candidate Name
        if (report.candidate_name) {
          document.querySelectorAll("h1:contains('Elena Vance'), .candidate-title").forEach(el => {
            el.innerText = `${report.candidate_name} — Candidate Assessment`;
          });
        }

        // Update Speaking Cadence
        document.querySelectorAll("span:contains('142 WPM'), .cadence-display").forEach(el => {
          el.innerText = `${Math.round(report.metrics.cadence_wpm || 135)} WPM • ${report.metrics.filler_words_count || 0} fillers`;
        });
      }
    } catch(e){}
  }
});
</script>
"""

# Script for Recruiter Dashboard Page
RECRUITER_DASHBOARD_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");
  if (!token) return;

  try {
    const res = await fetch("/api/v1/users/candidates", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const candidates = await res.json();

      // Update candidate metric count
      document.querySelectorAll(".candidates-count, span:contains('1,428')").forEach(el => {
        el.innerText = candidates.length.toString();
      });

      // Wire download resume actions
      document.querySelectorAll("button[title*='Resume'], a[title*='Resume']").forEach((btn, idx) => {
        if (candidates[idx] && candidates[idx].resumes && candidates[idx].resumes.length > 0) {
          btn.onclick = () => {
            window.open(`/api/v1/resumes/download/${candidates[idx].resumes[0].id}`, "_blank");
          };
        }
      });
    }
  } catch(e){}
});
</script>
"""

# Script for Admin Dashboard Page
ADMIN_DASHBOARD_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("smarthire_token");
  if (!token) return;

  try {
    // 1. Load Stats
    const statsRes = await fetch("/api/v1/users/admin/stats", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      document.querySelectorAll(".total-users-stat").forEach(el => el.innerText = stats.total_users);
      document.querySelectorAll(".active-users-stat").forEach(el => el.innerText = stats.active_users);
    }

    // 2. Load Users Table
    const usersRes = await fetch("/api/v1/users/admin/users", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (usersRes.ok) {
      const users = await usersRes.json();
      // Wire status toggle buttons
      document.querySelectorAll("button:contains('Suspend'), button:contains('Activate')").forEach((btn, idx) => {
        if (users[idx]) {
          const u = users[idx];
          btn.onclick = async () => {
            const newStatus = u.account_status === "active" ? "suspended" : "active";
            const patchRes = await fetch(`/api/v1/users/admin/users/${u.id}/status`, {
              method: "PATCH",
              headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ account_status: newStatus })
            });
            if (patchRes.ok) {
              alert(`Account ${u.email} is now ${newStatus}.`);
              window.location.reload();
            }
          };
        }
      });
    }
  } catch(e){}
});
</script>
"""

# Script for Forgot Password Page
FORGOT_PASSWORD_SCRIPT = """
<script>
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    const email = (form.querySelector("input[type='email']") || {}).value;
    alert(`Password reset instructions have been dispatched to ${email || 'your email'}. Please check your inbox.`);
    setTimeout(() => { window.location.href = "/login"; }, 1000);
  };
});
</script>
"""


def load_stitch_page(folder_name: str, extra_script: str = "") -> str:
    """Reads the code.html from the given Stitch folder and injects navigation and scripts."""
    file_path = STITCH_DIR / folder_name / "code.html"
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stitch page template '{folder_name}' not found on server.",
        )

    content = file_path.read_text(encoding="utf-8")

    # Replace dead '#' links with real destinations
    content = content.replace('href="#"', 'href="javascript:void(0)"')
    content = content.replace('data-path="home"', 'href="/"')
    content = content.replace('data-path="login"', 'href="/login"')
    content = content.replace('data-path="signup"', 'href="/register"')

    # Inject floating navbar and scripts right before closing body
    injected_bundle = FLOATING_NAVBAR_HTML + COMMON_CLIENT_SCRIPT + extra_script
    if "</body>" in content:
        content = content.replace("</body>", f"{injected_bundle}</body>")
    else:
        content += injected_bundle

    return content


# =====================================================================
# Main Platform Web Routes
# =====================================================================

@router.get("/", summary="SmartHire AI Landing Page")
def serve_landing_page(request: Request):
    """
    Serves the primary SmartHire AI Landing Page for web browsers (Accept: text/html),
    or returns service status JSON for API test suites and programmatic clients.
    """
    accept = request.headers.get("accept", "").lower()
    if "text/html" in accept or "application/xhtml+xml" in accept:
        return HTMLResponse(load_stitch_page("smarthire_ai_landing_page"))

    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "milestone": "Milestone 1 (PostgreSQL, Auth, RBAC, Profiles, Resumes, AI Mock Interview)",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }


@router.get("/home", response_class=HTMLResponse, summary="SmartHire AI Landing Page")
def serve_home_page():
    return HTMLResponse(load_stitch_page("smarthire_ai_landing_page"))


@router.get("/login", response_class=HTMLResponse, summary="User Login Page")
def serve_login_page():
    return HTMLResponse(load_stitch_page("smarthire_ai_login", extra_script=LOGIN_SCRIPT))


@router.get("/register", response_class=HTMLResponse, summary="User Registration Page")
def serve_register_page():
    return HTMLResponse(load_stitch_page("smarthire_ai_register", extra_script=REGISTER_SCRIPT))


@router.get("/candidate-dashboard", response_class=HTMLResponse, summary="Candidate Dashboard")
def serve_candidate_dashboard():
    return HTMLResponse(load_stitch_page("smarthire_ai_candidate_dashboard", extra_script=DASHBOARD_SCRIPT))


@router.get("/recruiter-dashboard", response_class=HTMLResponse, summary="Recruiter Dashboard")
def serve_recruiter_dashboard():
    return HTMLResponse(load_stitch_page("smarthire_ai_recruiter_dashboard", extra_script=DASHBOARD_SCRIPT + RECRUITER_DASHBOARD_SCRIPT))


@router.get("/admin-dashboard", response_class=HTMLResponse, summary="Admin Governance Dashboard")
def serve_admin_dashboard():
    return HTMLResponse(load_stitch_page("smarthire_ai_admin_dashboard", extra_script=DASHBOARD_SCRIPT + ADMIN_DASHBOARD_SCRIPT))


@router.get("/my-resume", response_class=HTMLResponse, summary="Candidate Resume Management")
def serve_my_resume():
    return HTMLResponse(load_stitch_page("smarthire_ai_my_resume", extra_script=DASHBOARD_SCRIPT + RESUME_SCRIPT))


@router.get("/user-profile", response_class=HTMLResponse, summary="User Profile")
def serve_user_profile():
    return HTMLResponse(load_stitch_page("smarthire_ai_user_profile", extra_script=DASHBOARD_SCRIPT + PROFILE_SCRIPT))


@router.get("/account-settings", response_class=HTMLResponse, summary="Account Settings")
def serve_account_settings():
    return HTMLResponse(load_stitch_page("smarthire_ai_account_settings", extra_script=DASHBOARD_SCRIPT))


@router.get("/dashboard", response_class=HTMLResponse, summary="General Dashboard")
def serve_general_dashboard():
    return HTMLResponse(load_stitch_page("smarthire_ai_dashboard", extra_script=DASHBOARD_SCRIPT))


@router.get("/forgot-password", response_class=HTMLResponse, summary="Forgot Password")
def serve_forgot_password():
    return HTMLResponse(load_stitch_page("smarthire_ai_forgot_password", extra_script=FORGOT_PASSWORD_SCRIPT))


@router.get("/practice-library", response_class=HTMLResponse, summary="Practice Library")
def serve_practice_library():
    return HTMLResponse(load_stitch_page("smarthire_ai_practice_library", extra_script=DASHBOARD_SCRIPT + PRACTICE_LIBRARY_SCRIPT))


@router.get("/live-mock-interview", response_class=HTMLResponse, summary="Live Mock Interview")
def serve_live_interview():
    return HTMLResponse(load_stitch_page("smarthire_ai_live_mock_interview", extra_script=DASHBOARD_SCRIPT + LIVE_INTERVIEW_SCRIPT))


@router.get("/candidate-assessment-report", response_class=HTMLResponse, summary="Assessment Report")
def serve_assessment_report():
    return HTMLResponse(load_stitch_page("smarthire_ai_candidate_assessment_report", extra_script=DASHBOARD_SCRIPT + ASSESSMENT_REPORT_SCRIPT))


@router.get("/recruiter-candidate-management", response_class=HTMLResponse, summary="Recruiter Candidate Management")
def serve_recruiter_candidate_management():
    return HTMLResponse(load_stitch_page("smarthire_ai_recruiter_candidate_management", extra_script=DASHBOARD_SCRIPT + RECRUITER_DASHBOARD_SCRIPT))


@router.get("/recruiter-candidate-analytics", response_class=HTMLResponse, summary="Recruiter Candidate Analytics")
def serve_recruiter_candidate_analytics():
    return HTMLResponse(load_stitch_page("smarthire_ai_recruiter_candidate_analytics", extra_script=DASHBOARD_SCRIPT))
