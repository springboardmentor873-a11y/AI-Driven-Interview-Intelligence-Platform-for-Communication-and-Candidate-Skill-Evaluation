
import { useEffect, useState } from 'react'
import './App.css'
import Auth from './Auth'
import { getCurrentUser, logoutUser } from './services/auth'

const navigation = [
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
]

const scores = [
  { label: 'Technical Skills', value: 86, color: '#9275ff' },
  { label: 'Communication', value: 78, color: '#4ba9f5' },
  { label: 'Confidence', value: 82, color: '#35c9a1' },
  { label: 'Professionalism', value: 91, color: '#f1ad59' },
]

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Authentication state
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

  // Called after successful login
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

  // Show login when no authenticated user exists
  if (!user) {
    return <Auth onLogin={handleLogin} />
  }

  const allItems = navigation.flatMap((group) => group.items)
  const activeItem = allItems.find((item) => item.id === activePage)

  const pageTitle =
    activePage === 'dashboard'
      ? 'Dashboard'
      : activeItem?.label || 'Dashboard'

  function renderPage() {
    switch (activePage) {
      case 'resume':
        return (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>Resume Manager</h2>
                <p>
                  Manage your resumes and prepare for AI-powered analysis.
                </p>
              </div>
              <button className="primary-btn">＋ Upload Resume</button>
            </div>

            <div className="upload-area">
              <div className="upload-icon">↑</div>
              <h3>Upload your resume</h3>
              <p>Drag and drop your PDF here or browse your files.</p>
              <span>PDF files · Maximum size 5 MB</span>
            </div>

            <div className="empty-state">
              <span>▤</span>
              <h3>Resume integration coming next</h3>
              <p>
                Your resume upload API will be connected in the next stage.
              </p>
            </div>
          </section>
        )

      case 'interview':
        return (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>AI Interview Studio</h2>
                <p>Practice interviews and improve your skills.</p>
              </div>
              <span className="status-pill">
                <i /> AI READY
              </span>
            </div>

            <div className="interview-grid">
              {[
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
              ].map(([icon, title, description, duration]) => (
                <div className="interview-card" key={title}>
                  <div className="interview-icon">{icon}</div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span>{duration}</span>
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      alert(
                        'Interview session integration is the next development stage.'
                      )
                    }
                  >
                    Start practice →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )

      case 'history':
        return (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>Interview History</h2>
                <p>Review your previous interview sessions.</p>
              </div>
            </div>

            <div className="empty-state">
              <span>◷</span>
              <h3>No interviews recorded yet</h3>
              <p>Your completed interview sessions will appear here.</p>
            </div>
          </section>
        )

      case 'performance':
        return (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>Performance Analytics</h2>
                <p>Track your interview preparation progress.</p>
              </div>
            </div>

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

      case 'profile':
        return (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>My Profile</h2>
                <p>Your registered SmartHire AI account information.</p>
              </div>
            </div>

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

            <button className="secondary-btn" onClick={handleLogout}>
              Log Out
            </button>
          </section>
        )

      default:
        return (
          <Dashboard
            user={user}
            setActivePage={setActivePage}
          />
        )
    }
  }

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
            <strong>Candidate Space</strong>
            <small>Personal workspace</small>
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
              Explore tips to improve your interview performance.
            </p>

            <button
              onClick={() => setActivePage('performance')}
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

            <button
              className="icon-button"
              title="Notifications"
            >
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

function Dashboard({ setActivePage, user }) {
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || 'Candidate'

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
          <div className="section-heading">
            <div>
              <h2>Performance overview</h2>
              <p>Your interview skill breakdown</p>
            </div>

            <button
              className="text-button"
              onClick={() => setActivePage('performance')}
            >
              View details →
            </button>
          </div>

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
          <div className="section-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Your latest workspace updates</p>
            </div>

            <span className="activity-dot" />
          </div>

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
        <div className="section-heading">
          <div>
            <h2>Jump back in</h2>
            <p>Continue building your interview readiness</p>
          </div>
        </div>

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

export default App
