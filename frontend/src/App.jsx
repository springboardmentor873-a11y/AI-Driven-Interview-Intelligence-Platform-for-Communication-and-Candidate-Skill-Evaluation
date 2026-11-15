
import { useEffect, useState } from 'react'
import './App.css'
import Auth from './Auth'
import { getCurrentUser, logoutUser } from './services/auth'

// ==========================================
// ROLE-BASED NAVIGATION
// ==========================================

const navigationByRole = {
  candidate: [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'dashboard', icon: '▦', label: 'Dashboard' },
        { id: 'resume', icon: '▤', label: 'Resume Manager' },
        { id: 'interview', icon: '◉', label: 'AI Interview' },
        { id: 'history', icon: '◷', label: 'Interview History' },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        { id: 'performance', icon: '▥', label: 'Performance' },
        { id: 'profile', icon: '♙', label: 'My Profile' },
      ],
    },
  ],

  recruiter: [
    {
      title: 'RECRUITER WORKSPACE',
      items: [
        { id: 'dashboard', icon: '▦', label: 'Dashboard' },
        { id: 'candidates', icon: '♙', label: 'Candidate Management' },
        { id: 'templates', icon: '▤', label: 'Interview Templates' },
        { id: 'sessions', icon: '◉', label: 'Interview Sessions' },
      ],
    },
    {
      title: 'INSIGHTS',
      items: [
        { id: 'reports', icon: '▥', label: 'Reports & Analytics' },
        { id: 'profile', icon: '♙', label: 'My Profile' },
      ],
    },
  ],

  admin: [
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'dashboard', icon: '▦', label: 'Admin Dashboard' },
        { id: 'users', icon: '♙', label: 'User Management' },
        { id: 'approvals', icon: '✓', label: 'Recruiter Approvals' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'activity', icon: '◷', label: 'System Activity' },
        { id: 'ai-settings', icon: '✦', label: 'AI Settings' },
        { id: 'profile', icon: '♙', label: 'My Profile' },
      ],
    },
  ],
}

// ==========================================
// SHARED DATA
// ==========================================

const scores = [
  { label: 'Technical Skills', value: 86, color: '#9275ff' },
  { label: 'Communication', value: 78, color: '#4ba9f5' },
  { label: 'Confidence', value: 82, color: '#35c9a1' },
  { label: 'Professionalism', value: 91, color: '#f1ad59' },
]

const API_BASE = 'http://127.0.0.1:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('smarthire_token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ==========================================
// MAIN APPLICATION
// ==========================================

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Check existing login session
  useEffect(() => {
    async function checkAuthentication() {
      const token = localStorage.getItem('smarthire_token')

      if (!token) {
        setAuthLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Authentication check failed:', error)
        logoutUser()
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuthentication()
  }, [])

  // Successful login
  async function handleLogin() {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
    setActivePage('dashboard')
  }

  // Logout
  function handleLogout() {
    logoutUser()
    setUser(null)
    setActivePage('dashboard')
    setSidebarOpen(false)
  }

  // Loading screen
  if (authLoading) {
    return (
      <div className="auth-screen">
        <div className="brand-mark">S</div>
        <h2>SmartHire AI</h2>
        <p>Checking your account...</p>
      </div>
    )
  }

  // Login screen
  if (!user) {
    return <Auth onLogin={handleLogin} />
  }

  // Select navigation according to authenticated role
  const navigation =
    navigationByRole[user.role] || navigationByRole.candidate

  const allItems = navigation.flatMap((group) => group.items)
  const activeItem = allItems.find((item) => item.id === activePage)

  const pageTitle = activeItem?.label || 'Dashboard'

  const workspaceName =
    user.role === 'admin'
      ? 'Admin Space'
      : user.role === 'recruiter'
        ? 'Recruiter Space'
        : 'Candidate Space'

  const workspaceDescription =
    user.role === 'admin'
      ? 'Platform administration'
      : user.role === 'recruiter'
        ? 'Recruitment workspace'
        : 'Personal workspace'

  // ==========================================
  // PAGE ROUTING
  // ==========================================

  function renderPage() {
    if (activePage === 'profile') {
      return <ProfilePage user={user} onLogout={handleLogout} />
    }

    if (user.role === 'candidate') {
      switch (activePage) {
        case 'resume':
          return <CandidateResumePage />

        case 'interview':
          return <CandidateInterviewPage />

        case 'history':
          return <CandidateHistoryPage />

        case 'performance':
          return <CandidatePerformancePage />

        default:
          return (
            <CandidateDashboard
              user={user}
              setActivePage={setActivePage}
            />
          )
      }
    }

    if (user.role === 'recruiter') {
      switch (activePage) {
        case 'candidates':
          return <RecruiterCandidatesPage />

        case 'templates':
          return <RecruiterTemplatesPage />

        case 'sessions':
          return <RecruiterSessionsPage />

        case 'reports':
          return <RecruiterReportsPage />

        default:
          return (
            <RecruiterDashboard
              user={user}
              setActivePage={setActivePage}
            />
          )
      }
    }

    if (user.role === 'admin') {
      switch (activePage) {
        case 'users':
          return <AdminUsersPage />

        case 'approvals':
          return <RecruiterApprovalsPage />

        case 'activity':
          return <AdminActivityPage />

        case 'ai-settings':
          return <AdminAISettingsPage />

        default:
          return (
            <AdminDashboard
              user={user}
              setActivePage={setActivePage}
            />
          )
      }
    }

    return (
      <section className="content-card">
        <h2>Unknown account role</h2>
        <p>Please contact the administrator.</p>
      </section>
    )
  }

  // ==========================================
  // APPLICATION LAYOUT
  // ==========================================

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">S</div>

          <div>
            <h2>
              SmartHire<span> AI</span>
            </h2>
            <p>INTERVIEW INTELLIGENCE</p>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-select">
          <div className="workspace-avatar">
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div>
            <strong>{workspaceName}</strong>
            <small>{workspaceDescription}</small>
          </div>

          <span>⌄</span>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-heading">{group.title}</p>

              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${
                    activePage === item.id ? 'active' : ''
                  }`}
                  onClick={() => {
                    setActivePage(item.id)
                    setSidebarOpen(false)
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}

                  {item.id === 'interview' && (
                    <span className="new-tag">AI</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✦</div>
            <strong>Need assistance?</strong>
            <p>
              {user.role === 'admin'
                ? 'Manage your platform and monitor system activity.'
                : user.role === 'recruiter'
                  ? 'Manage candidates and organize interviews.'
                  : 'Explore tips to improve your interview performance.'}
            </p>

            <button
              onClick={() =>
                setActivePage(
                  user.role === 'admin'
                    ? 'activity'
                    : user.role === 'recruiter'
                      ? 'reports'
                      : 'performance'
                )
              }
            >
              Explore insights →
            </button>
          </div>

          <div className="user-mini">
            <div className="avatar">
              {user.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div className="user-info">
              <strong>{user.full_name}</strong>
              <small>{user.role} account</small>
            </div>

            <button
              title="Profile"
              onClick={() => setActivePage('profile')}
            >
              •••
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{pageTitle}</strong>
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <i /> System operational
            </div>

            <button className="icon-button" title="Notifications">
              ♧
            </button>

            <button
              className="avatar"
              title="Open profile"
              onClick={() => setActivePage('profile')}
            >
              {user.full_name?.charAt(0).toUpperCase() || 'U'}
            </button>
          </div>
        </header>

        <div className="page-content">
          {renderPage()}

          <footer className="footer">
            <span>© 2026 SmartHire AI</span>
            <span>
              Built for smarter interviews <b>✦</b>
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ==========================================
// SHARED COMPONENTS
// ==========================================

function PageHeading({ title, description, children }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  )
}

function StatCard({ icon, label, value, change, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{change}</small>
    </div>
  )
}

function QuickAction({ icon, title, description, onClick }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon">{icon}</span>
      <span className="quick-text">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="quick-arrow">→</span>
    </button>
  )
}

function EmptyState({ icon = '◷', title, description }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function ProfilePage({ user, onLogout }) {
  return (
    <section className="content-card">
      <PageHeading
        title="My Profile"
        description="Your registered SmartHire AI account information."
      />

      <div className="profile-panel">
        <div className="avatar large">
          {user.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>

        <div>
          <h3>{user.full_name}</h3>
          <p>{user.email}</p>
          <span className="status-pill">
            {user.role} Account
          </span>
        </div>
      </div>

      <div className="content-card">
        <h3>Account Details</h3>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Full Name:</strong> {user.full_name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p>
          <strong>Account Status:</strong>{' '}
          {user.is_active ? 'Active' : 'Inactive'}
        </p>
      </div>

      <button className="secondary-btn" onClick={onLogout}>
        Log Out
      </button>
    </section>
  )
}

// ==========================================
// CANDIDATE DASHBOARD
// ==========================================

function CandidateDashboard({ user, setActivePage }) {
  const firstName =
    user?.full_name?.trim().split(/\s+/)[0] || 'Candidate'

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span /> YOUR INTERVIEW COMMAND CENTER
          </div>

          <h1>
            Welcome back, <span>{firstName}</span> 👋
          </h1>

          <p>
            Let's make your next interview your best one yet.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setActivePage('interview')}
        >
          <span>✦</span> Start AI Interview
        </button>
      </section>

      <section className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">
            ✦ AI-POWERED PREPARATION
          </span>

          <h2>
            Turn your potential
            <br />
            into <span>performance.</span>
          </h2>

          <p>
            Practice smarter, discover your strengths, and get ready
            to stand out in every interview.
          </p>

          <button onClick={() => setActivePage('interview')}>
            Explore AI Interview <span>→</span>
          </button>
        </div>

        <div className="hero-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-core">✦</div>
          <div className="floating-chip chip-one">AI Analysis</div>
          <div className="floating-chip chip-two">Smart Feedback</div>
          <div className="floating-chip chip-three">Skill Growth</div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          icon="◉"
          label="Interviews completed"
          value="0"
          change="Start your first session"
          tone="purple"
        />

        <StatCard
          icon="▤"
          label="Resumes uploaded"
          value="0"
          change="Upload your resume"
          tone="blue"
        />

        <StatCard
          icon="★"
          label="Average score"
          value="—"
          change="Awaiting first assessment"
          tone="orange"
        />

        <StatCard
          icon="◷"
          label="Practice time"
          value="0 min"
          change="Your journey starts here"
          tone="green"
        />
      </section>

      <section className="dashboard-grid">
        <div className="content-card performance-card">
          <PageHeading
            title="Performance overview"
            description="Your interview skill breakdown"
          >
            <button
              className="text-button"
              onClick={() => setActivePage('performance')}
            >
              View details →
            </button>
          </PageHeading>

          <div className="performance-content">
            <div className="score-circle">
              <div className="score-inner">
                <strong>—</strong>
                <span>NO SCORE</span>
              </div>
            </div>

            <div className="score-breakdown">
              {scores.map((score) => (
                <div className="score-item" key={score.label}>
                  <span style={{ background: score.color }} />
                  <p>{score.label}</p>
                  <strong>—</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="sample-note">
            Complete your first interview to generate real performance metrics.
          </div>
        </div>

        <div className="content-card activity-card">
          <PageHeading
            title="Recent activity"
            description="Your latest workspace updates"
          />

          <div className="empty-activity">
            <span>◷</span>
            <h3>No recent activity</h3>
            <p>
              Your uploads and completed interviews will appear here.
            </p>
          </div>
        </div>
      </section>

      <section className="content-card quick-card">
        <PageHeading
          title="Jump back in"
          description="Continue building your interview readiness"
        />

        <div className="quick-grid">
          <QuickAction
            icon="▤"
            title="Upload resume"
            description="Add your latest CV"
            onClick={() => setActivePage('resume')}
          />

          <QuickAction
            icon="◉"
            title="Practice interview"
            description="Start an AI mock interview"
            onClick={() => setActivePage('interview')}
          />

          <QuickAction
            icon="▥"
            title="View performance"
            description="Explore your progress"
            onClick={() => setActivePage('performance')}
          />
        </div>
      </section>
    </>
  )
}

// ==========================================
// CANDIDATE PAGES
// ==========================================


function CandidateResumePage() {
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [parsedResume, setParsedResume] = useState(null)
  const [parsingId, setParsingId] = useState(null)

  async function loadResumes() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`${API_BASE}/resumes/my-resumes`, {
        headers: getAuthHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to load resumes')
      }

      setResumes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResumes()
  }, [])

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')
    setSuccess('')
    setParsedResume(null)

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Please select a PDF file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must not exceed 5 MB.')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('smarthire_token')

      const response = await fetch(`${API_BASE}/resumes/upload`, {
        method: 'POST',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Resume upload failed')
      }

      setSuccess('Resume uploaded successfully!')
      await loadResumes()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleParse(resumeId) {
    try {
      setError('')
      setSuccess('')
      setParsingId(resumeId)
      setParsedResume(null)

      const response = await fetch(
        `${API_BASE}/resumes/${resumeId}/parse`,
        { headers: getAuthHeaders() }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Resume analysis failed')
      }

      setParsedResume(data)
      setSuccess('Resume analyzed successfully!')
    } catch (err) {
      setError(err.message)
    } finally {
      setParsingId(null)
    }
  }

  async function handleDownload(resumeId, filename) {
    try {
      setError('')

      const response = await fetch(
        `${API_BASE}/resumes/${resumeId}/download`,
        { headers: getAuthHeaders() }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = filename || 'resume.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(resumeId) {
    if (!window.confirm('Are you sure you want to delete this resume?')) {
      return
    }

    try {
      setError('')
      setSuccess('')

      const response = await fetch(
        `${API_BASE}/resumes/${resumeId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Unable to delete resume')
      }

      if (parsedResume && parsedResume.id === resumeId) {
        setParsedResume(null)
      }

      setSuccess('Resume deleted successfully.')
      await loadResumes()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="content-card resume-manager">
      <PageHeading
        title="Resume Manager"
        description="Upload your resume and let AI analyze your skills and experience."
      />

      {error && <div className="resume-message resume-error">{error}</div>}
      {success && <div className="resume-message resume-success">{success}</div>}

      <div className="upload-area resume-upload-area">
        <div className="upload-icon">↑</div>
        <h3>{uploading ? 'Uploading resume...' : 'Upload your resume'}</h3>
        <p>Choose a PDF resume from your computer.</p>
        <span>PDF files · Maximum size 5 MB</span>

        <label className="primary-btn resume-upload-button">
          {uploading ? 'Uploading...' : '＋ Browse PDF'}
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            disabled={uploading}
            hidden
          />
        </label>
      </div>

      <div className="resume-section">
        <div className="section-heading">
          <div>
            <h2>Your Resumes</h2>
            <p>Manage and analyze your uploaded documents.</p>
          </div>
          <span className="resume-count">{resumes.length} files</span>
        </div>

        {loading ? (
          <div className="resume-placeholder">Loading your resumes...</div>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon="▤"
            title="No resumes uploaded yet"
            description="Upload your first PDF resume to get started with AI analysis."
          />
        ) : (
          <div className="resume-list">
            {resumes.map((resume) => (
              <div className="resume-item" key={resume.id}>
                <div className="resume-file-icon">PDF</div>

                <div className="resume-file-info">
                  <strong>{resume.original_filename}</strong>
                  <small>
                    Uploaded: {resume.uploaded_at
                      ? new Date(resume.uploaded_at).toLocaleDateString()
                      : 'Date unavailable'}
                  </small>
                </div>

                <div className="resume-actions">
                  <button
                    className="resume-action analyze"
                    onClick={() => handleParse(resume.id)}
                    disabled={parsingId !== null}
                  >
                    {parsingId === resume.id ? 'Analyzing...' : 'AI Analyze'}
                  </button>

                  <button
                    className="resume-action"
                    onClick={() =>
                      handleDownload(resume.id, resume.original_filename)
                    }
                  >
                    Download
                  </button>

                  <button
                    className="resume-action delete"
                    onClick={() => handleDelete(resume.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {parsedResume && (
        <div className="resume-analysis">
          <div className="section-heading">
            <div>
              <h2>AI Resume Analysis</h2>
              <p>Information extracted from your PDF resume.</p>
            </div>
            <span className="status-pill">
              <i /> Analysis Complete
            </span>
          </div>

          <div className="resume-details-grid">
            <div className="resume-detail">
              <small>Candidate Name</small>
              <strong>{parsedResume.candidate_name || 'Not detected'}</strong>
            </div>

            <div className="resume-detail">
              <small>Email</small>
              <strong>{parsedResume.email || 'Not provided'}</strong>
            </div>

            <div className="resume-detail">
              <small>Phone</small>
              <strong>{parsedResume.phone || 'Not provided'}</strong>
            </div>

            <div className="resume-detail">
              <small>Experience</small>
              <strong>
                {parsedResume.experience_years != null
                  ? `${parsedResume.experience_years} years`
                  : 'Not specified'}
              </strong>
            </div>
          </div>

          <div className="resume-analysis-section">
            <h3>Detected Skills ({parsedResume.skills?.length || 0})</h3>
            <div className="skill-chips">
              {parsedResume.skills?.length ? (
                parsedResume.skills.map((skill, index) => (
                  <span key={`${skill}-${index}`}>{skill}</span>
                ))
              ) : (
                <p>No skills detected.</p>
              )}
            </div>
          </div>

          <div className="resume-analysis-section">
            <h3>Education</h3>
            {parsedResume.education?.length ? (
              <ul>
                {parsedResume.education.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No education details detected.</p>
            )}
          </div>

          <div className="resume-analysis-section">
            <h3>Experience Details</h3>
            {parsedResume.experience_details?.length ? (
              <ul>
                {parsedResume.experience_details.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No experience details detected.</p>
            )}
          </div>

          <div className="resume-analysis-section">
            <h3>Resume Summary</h3>
            <p>{parsedResume.summary || 'No summary available.'}</p>
          </div>
        </div>
      )}
    </section>
  )
}


function CandidateInterviewPage() {
  const interviewTypes = [
    [
      '◈',
      'Technical Interview',
      'Test your programming and technical knowledge.',
      '25–30 min',
    ],
    [
      '◇',
      'HR Interview',
      'Practice common HR and personality questions.',
      '15–20 min',
    ],
    [
      '◎',
      'Behavioral Interview',
      'Improve your problem-solving responses.',
      '20–25 min',
    ],
  ]

  return (
    <section className="content-card">
      <PageHeading
        title="AI Interview Studio"
        description="Practice interviews and improve your skills."
      >
        <span className="status-pill"><i /> AI READY</span>
      </PageHeading>

      <div className="interview-grid">
        {interviewTypes.map(([icon, title, description, duration]) => (
          <div className="interview-card" key={title}>
            <div className="interview-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
            <span>{duration}</span>
            <button
              className="secondary-btn"
              onClick={() =>
                alert('Interview session integration is planned for Milestone 2.')
              }
            >
              Start practice →
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function CandidateHistoryPage() {
  return (
    <section className="content-card">
      <PageHeading
        title="Interview History"
        description="Review your previous interview sessions."
      />
      <EmptyState
        title="No interviews recorded yet"
        description="Your completed interview sessions will appear here."
      />
    </section>
  )
}

function CandidatePerformancePage() {
  return (
    <section className="content-card">
      <PageHeading
        title="Performance Analytics"
        description="Track your interview preparation progress."
      />

      <div className="score-list">
        {scores.map((score) => (
          <div className="score-row" key={score.label}>
            <div className="score-label">
              <span>{score.label}</span>
              <strong>{score.value}%</strong>
            </div>

            <div className="progress-track">
              <div
                style={{
                  width: `${score.value}%`,
                  background: score.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="disclaimer">
        Illustrative sample scores. Actual scores will be calculated
        from completed assessments.
      </p>
    </section>
  )
}

// ==========================================
// RECRUITER DASHBOARD
// ==========================================

function RecruiterDashboard({ user, setActivePage }) {
  const firstName =
    user?.full_name?.trim().split(/\s+/)[0] || 'Recruiter'

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span /> RECRUITMENT COMMAND CENTER
          </div>

          <h1>
            Welcome back, <span>{firstName}</span> 👋
          </h1>

          <p>Manage candidates and organize your recruitment workflow.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setActivePage('templates')}
        >
          ＋ Create interview template
        </button>
      </section>

      <section className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">✦ SMART RECRUITMENT</span>

          <h2>
            Find the right talent
            <br />
            with <span>AI intelligence.</span>
          </h2>

          <p>
            Organize interviews, review candidate progress, and
            streamline your hiring workflow.
          </p>

          <button onClick={() => setActivePage('candidates')}>
            Manage candidates <span>→</span>
          </button>
        </div>

        <div className="hero-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-core">✦</div>
          <div className="floating-chip chip-one">Candidates</div>
          <div className="floating-chip chip-two">Interviews</div>
          <div className="floating-chip chip-three">Analytics</div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          icon="♙"
          label="Total candidates"
          value="—"
          change="Candidate API pending"
          tone="purple"
        />
        <StatCard
          icon="◉"
          label="Interview sessions"
          value="0"
          change="No sessions created"
          tone="blue"
        />
        <StatCard
          icon="▤"
          label="Interview templates"
          value="0"
          change="Create your first template"
          tone="orange"
        />
        <StatCard
          icon="✓"
          label="Completed interviews"
          value="0"
          change="No completed interviews"
          tone="green"
        />
      </section>

      <section className="content-card quick-card">
        <PageHeading
          title="Recruitment workspace"
          description="Quick access to your recruitment tools"
        />

        <div className="quick-grid">
          <QuickAction
            icon="♙"
            title="Candidates"
            description="Review candidate records"
            onClick={() => setActivePage('candidates')}
          />
          <QuickAction
            icon="▤"
            title="Interview templates"
            description="Organize interview questions"
            onClick={() => setActivePage('templates')}
          />
          <QuickAction
            icon="◉"
            title="Interview sessions"
            description="Manage interview sessions"
            onClick={() => setActivePage('sessions')}
          />
        </div>
      </section>
    </>
  )
}

// ==========================================
// RECRUITER PAGES
// ==========================================

function RecruiterCandidatesPage() {
  const [candidates, setCandidates] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCandidates() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${API_BASE}/recruiter/candidates?search=${encodeURIComponent(search)}`,
          {
            headers: getAuthHeaders(),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || 'Unable to load candidates')
        }

        if (!cancelled) {
          setCandidates(data.candidates || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Something went wrong')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchCandidates()

    return () => {
      cancelled = true
    }
  }, [search, refreshKey])

  async function viewCandidate(candidateId) {
    setLoadingProfile(true)
    setError('')
    setAnalysis(null)

    try {
      const response = await fetch(
        `${API_BASE}/recruiter/candidates/${candidateId}`,
        {
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to load candidate profile')
      }

      setSelectedCandidate(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingProfile(false)
    }
  }

  async function downloadResume(resumeId) {
    setDownloadingId(resumeId)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/recruiter/resumes/${resumeId}/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('smarthire_token')}`,
          },
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Resume download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `candidate_resume_${resumeId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  async function analyzeResume(resumeId) {
    setAnalyzingId(resumeId)
    setAnalysis(null)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/recruiter/resumes/${resumeId}/parse`,
        {
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Resume analysis failed')
      }

      setAnalysis({
        resumeId,
        data,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzingId(null)
    }
  }

  function closeProfile() {
    setSelectedCandidate(null)
    setAnalysis(null)
  }

  return (
    <section className="content-card recruiter-candidates-page">
      <PageHeading
        title="Candidate Management"
        description="Discover candidates, review their profiles, and analyze their resumes."
      />

      <div className="candidate-toolbar">
        <div className="candidate-search">
          <span>⌕</span>
          <input
            type="search"
            placeholder="Search by name, email, education or bio..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <button
          className="secondary-btn"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="resume-message error-message">
          {error}
        </div>
      )}

      <div className="candidate-results-heading">
        <div>
          <h3>Available Candidates</h3>
          <p>Candidate profiles and uploaded resumes</p>
        </div>

        <span className="candidate-count">
          {candidates.length} Candidates
        </span>
      </div>

      {loading ? (
        <div className="candidate-empty-state">
          Loading candidates...
        </div>
      ) : candidates.length === 0 ? (
        <div className="candidate-empty-state">
          <div className="candidate-empty-icon">♙</div>
          <h3>No candidates found</h3>
          <p>
            Registered candidates will appear here when they are available.
          </p>
        </div>
      ) : (
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <article
              className="candidate-card"
              key={candidate.candidate_id}
            >
              <div className="candidate-card-top">
                <div className="candidate-avatar">
                  {(candidate.full_name || 'C')
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="candidate-card-identity">
                  <h3>{candidate.full_name}</h3>
                  <p>{candidate.email}</p>
                </div>
              </div>

              <div className="candidate-card-info">
                <div>
                  <span>Education</span>
                  <strong>
                    {candidate.profile?.education || 'Not provided'}
                  </strong>
                </div>

                <div>
                  <span>Experience</span>
                  <strong>
                    {candidate.profile?.experience_years ?? 0} years
                  </strong>
                </div>

                <div>
                  <span>Uploaded resumes</span>
                  <strong>{candidate.resume_count}</strong>
                </div>
              </div>

              {candidate.profile?.bio && (
                <p className="candidate-bio">
                  {candidate.profile.bio}
                </p>
              )}

              <div className="candidate-card-actions">
                <button
                  className="primary-btn"
                  onClick={() => viewCandidate(candidate.candidate_id)}
                  disabled={loadingProfile}
                >
                  View Profile
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedCandidate && (
        <div className="candidate-modal-overlay">
          <div className="candidate-modal">
            <div className="candidate-modal-header">
              <div>
                <h2>{selectedCandidate.full_name}</h2>
                <p>{selectedCandidate.email}</p>
              </div>

              <button
                className="candidate-close-btn"
                onClick={closeProfile}
              >
                ×
              </button>
            </div>

            <div className="candidate-profile-details">
              <div>
                <span>Phone</span>
                <strong>
                  {selectedCandidate.profile?.phone || 'Not provided'}
                </strong>
              </div>

              <div>
                <span>Education</span>
                <strong>
                  {selectedCandidate.profile?.education || 'Not provided'}
                </strong>
              </div>

              <div>
                <span>Experience</span>
                <strong>
                  {selectedCandidate.profile?.experience_years ?? 0} years
                </strong>
              </div>

              <div>
                <span>Bio</span>
                <strong>
                  {selectedCandidate.profile?.bio || 'Not provided'}
                </strong>
              </div>
            </div>

            <div className="candidate-resumes-section">
              <h3>Uploaded Resumes</h3>

              {!selectedCandidate.resumes?.length ? (
                <p className="candidate-muted">
                  This candidate has not uploaded a resume yet.
                </p>
              ) : (
                selectedCandidate.resumes.map((resume) => (
                  <div className="recruiter-resume-item" key={resume.id}>
                    <div>
                      <strong>{resume.original_filename}</strong>
                      <span>
                        Uploaded:{' '}
                        {new Date(resume.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="recruiter-resume-actions">
                      <button
                        className="secondary-btn"
                        onClick={() => downloadResume(resume.id)}
                        disabled={downloadingId === resume.id}
                      >
                        {downloadingId === resume.id
                          ? 'Downloading...'
                          : 'Download'}
                      </button>

                      <button
                        className="primary-btn"
                        onClick={() => analyzeResume(resume.id)}
                        disabled={analyzingId === resume.id}
                      >
                        {analyzingId === resume.id
                          ? 'Analyzing...'
                          : 'AI Analyze'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {analysis && (
              <div className="recruiter-analysis">
                <h3>AI Resume Analysis</h3>

                <div className="candidate-profile-details">
                  <div>
                    <span>Detected name</span>
                    <strong>{analysis.data.candidate_name || 'Not found'}</strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>{analysis.data.email || 'Not provided'}</strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>{analysis.data.phone || 'Not provided'}</strong>
                  </div>

                  <div>
                    <span>Experience</span>
                    <strong>
                      {analysis.data.experience_years ?? 'Not specified'}
                      {analysis.data.experience_years != null ? ' years' : ''}
                    </strong>
                  </div>
                </div>

                <h4>Detected Skills</h4>
                <div className="recruiter-skill-list">
                  {analysis.data.skills?.length ? (
                    analysis.data.skills.map((skill, index) => (
                      <span key={`${skill}-${index}`}>{skill}</span>
                    ))
                  ) : (
                    <p>No skills detected.</p>
                  )}
                </div>

                <h4>Education</h4>
                <ul className="recruiter-analysis-list">
                  {analysis.data.education?.length ? (
                    analysis.data.education.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))
                  ) : (
                    <li>No education details detected.</li>
                  )}
                </ul>

                <h4>Experience Details</h4>
                <ul className="recruiter-analysis-list">
                  {analysis.data.experience_details?.length ? (
                    analysis.data.experience_details.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))
                  ) : (
                    <li>No experience details detected.</li>
                  )}
                </ul>

                <h4>Resume Summary</h4>
                <p className="recruiter-analysis-summary">
                  {analysis.data.summary || 'No summary available.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}


function RecruiterTemplatesPage() {
  const emptyForm = {
    title: '',
    description: '',
    category: 'Technical',
    difficulty: 'Medium',
    duration_minutes: 30,
    questions: [{ question: '' }],
  }

  const [templates, setTemplates] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  async function fetchTemplates() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/recruiter/templates`,
        { headers: getAuthHeaders() }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to load templates')
      }

      setTemplates(data)
    } catch (err) {
      setError(err.message || 'Unable to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  function updateField(field, value) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  function updateQuestion(index, value) {
    setFormData((previous) => ({
      ...previous,
      questions: previous.questions.map((item, i) =>
        i === index ? { question: value } : item
      ),
    }))
  }

  function addQuestion() {
    setFormData((previous) => ({
      ...previous,
      questions: [...previous.questions, { question: '' }],
    }))
  }

  function removeQuestion(index) {
    setFormData((previous) => ({
      ...previous,
      questions: previous.questions.filter((_, i) => i !== index),
    }))
  }

  function openCreateForm() {
    setEditingId(null)
    setFormData({
      ...emptyForm,
      questions: [{ question: '' }],
    })
    setError('')
    setShowForm(true)
  }

  function openEditForm(template) {
    setEditingId(template.id)
    setFormData({
      title: template.title,
      description: template.description || '',
      category: template.category,
      difficulty: template.difficulty,
      duration_minutes: template.duration_minutes,
      questions: template.questions?.length
        ? template.questions.map((item) => ({
            question: item.question,
          }))
        : [{ question: '' }],
    })
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
  }

  async function saveTemplate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...formData,
      duration_minutes: Number(formData.duration_minutes),
      questions: formData.questions.filter(
        (item) => item.question.trim().length > 0
      ),
    }

    try {
      const response = await fetch(
        editingId
          ? `${API_BASE}/recruiter/templates/${editingId}`
          : `${API_BASE}/recruiter/templates`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to save template')
      }

      closeForm()
      await fetchTemplates()
    } catch (err) {
      setError(
        Array.isArray(err.message)
          ? err.message.join(', ')
          : err.message || 'Unable to save template'
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(templateId) {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return
    }

    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/recruiter/templates/${templateId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to delete template')
      }

      await fetchTemplates()
    } catch (err) {
      setError(err.message || 'Unable to delete template')
    }
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(search.toLowerCase()) ||
      (template.description || '').toLowerCase().includes(search.toLowerCase())

    const matchesCategory =
      categoryFilter === 'All' || template.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  return (
    <section className="content-card recruiter-templates-page">
      <PageHeading
        title="Interview Templates"
        description="Create, organize and manage reusable interview templates."
      >
        <button className="primary-btn" onClick={openCreateForm}>
          + New Template
        </button>
      </PageHeading>

      {error && (
        <div className="resume-message error-message">
          {error}
        </div>
      )}

      <div className="template-toolbar">
        <input
          type="search"
          placeholder="Search interview templates..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="Technical">Technical</option>
          <option value="HR">HR</option>
          <option value="Behavioral">Behavioral</option>
          <option value="Aptitude">Aptitude</option>
        </select>

        <button
          className="secondary-btn"
          onClick={fetchTemplates}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="template-results-heading">
        <div>
          <h3>Your Interview Templates</h3>
          <p>Manage your reusable interview question sets.</p>
        </div>

        <span>{templates.length} Templates</span>
      </div>

      {loading ? (
        <div className="template-empty-state">
          Loading interview templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="template-empty-state">
          <div className="template-empty-icon">▤</div>
          <h3>
            {templates.length === 0
              ? 'No interview templates yet'
              : 'No matching templates'}
          </h3>
          <p>
            Create a Technical, HR, Behavioral or Aptitude interview template.
          </p>
          {templates.length === 0 && (
            <button className="primary-btn" onClick={openCreateForm}>
              Create First Template
            </button>
          )}
        </div>
      ) : (
        <div className="template-grid">
          {filteredTemplates.map((template) => (
            <article className="template-card" key={template.id}>
              <div className="template-card-header">
                <span className="template-category">
                  {template.category}
                </span>
                <span className={`template-difficulty ${template.difficulty.toLowerCase()}`}>
                  {template.difficulty}
                </span>
              </div>

              <h3>{template.title}</h3>

              <p className="template-description">
                {template.description || 'No description provided.'}
              </p>

              <div className="template-meta">
                <span>◷ {template.duration_minutes} minutes</span>
                <span>
                  {template.questions?.length || 0} Questions
                </span>
              </div>

              <div className="template-card-actions">
                <button
                  className="secondary-btn"
                  onClick={() => openEditForm(template)}
                >
                  Edit
                </button>

                <button
                  className="template-delete-btn"
                  onClick={() => deleteTemplate(template.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="template-modal-overlay">
          <div className="template-modal">
            <div className="template-modal-header">
              <div>
                <h2>
                  {editingId ? 'Edit Interview Template' : 'Create Interview Template'}
                </h2>
                <p>Configure your interview and add questions.</p>
              </div>

              <button
                type="button"
                className="candidate-close-btn"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveTemplate}>
              <div className="template-form-grid">
                <label>
                  Template Title *
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="Example: Python Developer Interview"
                    value={formData.title}
                    onChange={(event) =>
                      updateField('title', event.target.value)
                    }
                  />
                </label>

                <label>
                  Category *
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      updateField('category', event.target.value)
                    }
                  >
                    <option value="Technical">Technical</option>
                    <option value="HR">HR</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Aptitude">Aptitude</option>
                  </select>
                </label>

                <label>
                  Difficulty *
                  <select
                    value={formData.difficulty}
                    onChange={(event) =>
                      updateField('difficulty', event.target.value)
                    }
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </label>

                <label>
                  Duration (minutes) *
                  <input
                    type="number"
                    required
                    min="5"
                    max="180"
                    value={formData.duration_minutes}
                    onChange={(event) =>
                      updateField('duration_minutes', event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="template-description-field">
                Description
                <textarea
                  rows="3"
                  maxLength={2000}
                  placeholder="Describe the purpose of this interview..."
                  value={formData.description}
                  onChange={(event) =>
                    updateField('description', event.target.value)
                  }
                />
              </label>

              <div className="template-questions-section">
                <div className="template-questions-heading">
                  <div>
                    <h3>Interview Questions</h3>
                    <p>Add the questions candidates will answer.</p>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={addQuestion}
                  >
                    + Add Question
                  </button>
                </div>

                {formData.questions.map((item, index) => (
                  <div className="template-question-row" key={index}>
                    <span>{index + 1}.</span>

                    <textarea
                      required
                      minLength={3}
                      maxLength={1000}
                      rows="2"
                      placeholder={`Enter interview question ${index + 1}`}
                      value={item.question}
                      onChange={(event) =>
                        updateQuestion(index, event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="template-remove-question"
                      onClick={() => removeQuestion(index)}
                      disabled={formData.questions.length === 1}
                      title="Remove question"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="template-form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Template'
                      : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}


function RecruiterSessionsPage() {
  return (
    <section className="content-card">
      <PageHeading
        title="Interview Sessions"
        description="Schedule and monitor candidate interview sessions."
      />
      <EmptyState
        icon="◉"
        title="No interview sessions yet"
        description="Interview session management will be connected when the session API is implemented."
      />
    </section>
  )
}

function RecruiterReportsPage() {
  return (
    <section className="content-card">
      <PageHeading
        title="Reports & Analytics"
        description="Review recruitment performance and candidate assessment results."
      />
      <EmptyState
        icon="▥"
        title="Reports are not available yet"
        description="Analytics will appear after interview sessions and assessments are implemented."
      />
    </section>
  )
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================

function AdminDashboard({ user, setActivePage }) {
  const firstName =
    user?.full_name?.trim().split(/\s+/)[0] || 'Administrator'

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span /> PLATFORM CONTROL CENTER
          </div>

          <h1>
            Welcome back, <span>{firstName}</span> 👋
          </h1>

          <p>Monitor and manage your SmartHire AI platform.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setActivePage('users')}
        >
          Manage users →
        </button>
      </section>

      <section className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">✦ SYSTEM ADMINISTRATION</span>

          <h2>
            Complete platform
            <br />
            <span>control and visibility.</span>
          </h2>

          <p>
            Manage user accounts, review recruiter applications,
            and monitor platform operations.
          </p>

          <button onClick={() => setActivePage('approvals')}>
            Review recruiter approvals <span>→</span>
          </button>
        </div>

        <div className="hero-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-core">✦</div>
          <div className="floating-chip chip-one">Security</div>
          <div className="floating-chip chip-two">Management</div>
          <div className="floating-chip chip-three">Monitoring</div>
        </div>
      </section>

      <section className="content-card quick-card">
        <PageHeading
          title="Administration tools"
          description="Manage your platform from one place"
        />

        <div className="quick-grid">
          <QuickAction
            icon="♙"
            title="User management"
            description="View registered accounts"
            onClick={() => setActivePage('users')}
          />

          <QuickAction
            icon="✓"
            title="Recruiter approvals"
            description="Review pending applications"
            onClick={() => setActivePage('approvals')}
          />

          <QuickAction
            icon="◷"
            title="System activity"
            description="Monitor platform activity"
            onClick={() => setActivePage('activity')}
          />
        </div>
      </section>

      <section className="content-card quick-card">
        <PageHeading
          title="AI configuration"
          description="Platform AI settings and configuration"
        />

        <QuickAction
          icon="✦"
          title="AI settings"
          description="View AI configuration options"
          onClick={() => setActivePage('ai-settings')}
        />
      </section>
    </>
  )
}

// ==========================================
// ADMIN USER MANAGEMENT
// ==========================================

function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadUsers() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_BASE}/admin/users`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error(`Unable to load users (${response.status})`)
        }

        const data = await response.json()

        if (!cancelled) {
          setUsers(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [refresh])

  async function changeUserStatus(userId, isActive) {
    try {
      const response = await fetch(
        `${API_BASE}/admin/users/${userId}/status?is_active=${isActive}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to update account status')
      }

      setRefresh((value) => value + 1)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <section className="content-card">
      <PageHeading
        title="User Management"
        description="View and manage registered SmartHire AI accounts."
      >
        <button
          className="secondary-btn"
          onClick={() => setRefresh((value) => value + 1)}
        >
          ↻ Refresh
        </button>
      </PageHeading>

      {loading && <p>Loading users...</p>}

      {error && (
        <div className="empty-state">
          <h3>Unable to load users</h3>
          <p>{error}</p>
          <button
            className="secondary-btn"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="stats-grid">
            <StatCard
              icon="♙"
              label="Total users"
              value={users.length}
              change="Registered accounts"
              tone="purple"
            />
            <StatCard
              icon="✓"
              label="Active users"
              value={users.filter((item) => item.is_active).length}
              change="Active accounts"
              tone="green"
            />
            <StatCard
              icon="◉"
              label="Candidates"
              value={users.filter((item) => item.role === 'candidate').length}
              change="Candidate accounts"
              tone="blue"
            />
            <StatCard
              icon="▤"
              label="Recruiters"
              value={users.filter((item) => item.role === 'recruiter').length}
              change="Recruiter accounts"
              tone="orange"
            />
          </div>

          {users.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Registered accounts will appear here."
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.full_name}</td>
                      <td>{item.email}</td>
                      <td>{item.role}</td>
                      <td>
                        <span className="status-pill">
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {item.role === 'admin' ? (
                          <span>Protected</span>
                        ) : (
                          <button
                            className="secondary-btn"
                            onClick={() =>
                              changeUserStatus(item.id, !item.is_active)
                            }
                          >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ==========================================
// ADMIN RECRUITER APPROVALS
// ==========================================

function RecruiterApprovalsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadApplications() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${API_BASE}/admin/recruiters/pending`,
          {
            headers: getAuthHeaders(),
          }
        )

        if (!response.ok) {
          throw new Error(
            `Unable to load recruiter applications (${response.status})`
          )
        }

        const data = await response.json()

        if (!cancelled) {
          setApplications(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadApplications()

    return () => {
      cancelled = true
    }
  }, [refresh])

  async function reviewApplication(userId, action) {
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this recruiter application?`
    )

    if (!confirmed) return

    try {
      const response = await fetch(
        `${API_BASE}/admin/recruiters/${userId}/${action}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to review application')
      }

      alert(data.message || `Recruiter ${action} successful.`)
      setRefresh((value) => value + 1)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <section className="content-card">
      <PageHeading
        title="Recruiter Approvals"
        description="Review and approve or reject recruiter registration applications."
      >
        <button
          className="secondary-btn"
          onClick={() => setRefresh((value) => value + 1)}
        >
          ↻ Refresh
        </button>
      </PageHeading>

      {loading && <p>Loading recruiter applications...</p>}

      {error && (
        <div className="empty-state">
          <h3>Unable to load applications</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && applications.length === 0 && (
        <EmptyState
          icon="✓"
          title="No pending applications"
          description="New recruiter registrations requiring approval will appear here."
        />
      )}

      {!loading && !error && applications.length > 0 && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Designation</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {applications.map((application) => (
                <tr key={application.user_id}>
                  <td>{application.user_id}</td>
                  <td>{application.full_name}</td>
                  <td>{application.email}</td>
                  <td>{application.company_name || '—'}</td>
                  <td>{application.designation || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="secondary-btn"
                        onClick={() =>
                          reviewApplication(application.user_id, 'approve')
                        }
                      >
                        Approve
                      </button>

                      <button
                        className="secondary-btn"
                        onClick={() =>
                          reviewApplication(application.user_id, 'reject')
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ==========================================
// ADMIN SYSTEM PAGES
// ==========================================

function AdminActivityPage() {
  return (
    <section className="content-card">
      <PageHeading
        title="System Activity"
        description="Monitor important platform operations and administrative activity."
      />

      <EmptyState
        icon="◷"
        title="Activity monitoring is not connected"
        description="An audit log API is needed to display user logins, approvals, and administrative actions."
      />
    </section>
  )
}

function AdminAISettingsPage() {
  return (
    <section className="content-card">
      <PageHeading
        title="AI Settings"
        description="Manage AI-related platform configuration."
      />

      <div className="content-card">
        <h3>AI Configuration</h3>
        <p>AI provider: Not configured</p>
        <p>Question generation: Planned for Milestone 2</p>
        <p>Resume analysis: Planned for Milestone 2</p>
        <p>Speech analysis: Planned for Milestone 3</p>
      </div>

      <EmptyState
        icon="✦"
        title="AI configuration is not connected"
        description="AI settings will become editable after the AI service integration is implemented."
      />
    </section>
  )
}

export default App
