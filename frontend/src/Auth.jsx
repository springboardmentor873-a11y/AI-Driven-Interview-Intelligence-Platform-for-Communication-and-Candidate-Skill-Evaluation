
import { useState } from 'react'
import { loginUser, registerUser } from './services/auth'

const roles = [
  { value: 'candidate', label: 'Student', icon: '🎓', description: 'Practice and improve' },
  { value: 'recruiter', label: 'Recruiter', icon: '💼', description: 'Find great candidates' },
  { value: 'admin', label: 'Admin', icon: '🛡️', description: 'Manage the platform' },
]

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('candidate')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }

      if (password.length < 8) {
        setError('Password must contain at least 8 characters.')
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'register') {
        const result = await registerUser({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        })

        if (result.role === 'recruiter') {
          setMessage(
            'Recruiter account submitted successfully! Your account is pending admin approval.'
          )
        } else {
          setMessage('Student account created successfully! Please log in.')
        }

        setMode('login')
        setRole('candidate')
        setPassword('')
        setConfirmPassword('')
        setFullName('')
      } else {
        await loginUser({
          email: email.trim(),
          password,
          role,
        })

        await onLogin()
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function changeMode(nextMode, nextRole = 'candidate') {
    setMode(nextMode)
    setRole(nextRole)
    setError('')
    setMessage('')
  }

  const selectedRole = roles.find((item) => item.value === role)

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="brand-mark">S</div>
        <div>
          <h2>SmartHire <span>AI</span></h2>
          <p>INTERVIEW INTELLIGENCE PLATFORM</p>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <span className="auth-eyebrow">YOUR CAREER, YOUR NEXT LEVEL</span>
          <h1>
            {mode === 'login'
              ? 'Welcome back'
              : `Create ${role === 'recruiter' ? 'Recruiter' : 'Student'} Account`}
          </h1>
          <p>
            {mode === 'login'
              ? 'Choose your portal and sign in to continue.'
              : 'Join SmartHire AI and get started.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'selected' : ''}
            onClick={() => changeMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'selected' : ''}
            onClick={() => changeMode('register')}
          >
            Register
          </button>
        </div>

        {mode === 'login' && (
          <div className="auth-role-section">
            <p className="auth-role-label">SELECT YOUR LOGIN PORTAL</p>
            <div className="auth-role-grid">
              {roles.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`auth-role-card ${role === item.value ? 'selected' : ''}`}
                  onClick={() => {
                    setRole(item.value)
                    setError('')
                  }}
                  disabled={loading}
                >
                  <span className="auth-role-icon">{item.icon}</span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div className="auth-role-section">
            <p className="auth-role-label">CHOOSE ACCOUNT TYPE</p>
            <div className="auth-role-grid">
              {roles.filter((item) => item.value !== 'admin').map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`auth-role-card ${role === item.value ? 'selected' : ''}`}
                  onClick={() => {
                    setRole(item.value)
                    setError('')
                  }}
                  disabled={loading}
                >
                  <span className="auth-role-icon">{item.icon}</span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className="auth-field">
              Full Name
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                minLength={2}
                maxLength={150}
                required
              />
            </label>
          )}

          <label className="auth-field">
            Email Address
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={128}
              required
            />
          </label>

         
{mode === 'register' && (
  <label className="auth-field">
    Confirm Password
    <input
      type="password"
      placeholder="Confirm your password"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      autoComplete="new-password"
      required
    />
  </label>
)}


          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? `Sign In as ${selectedRole?.label} →`
                : `Create ${selectedRole?.label} Account →`}
          </button>
        </form>

        {mode === 'register' && role === 'recruiter' && (
          <p className="auth-footer">
            Recruiter accounts require administrator approval before access is granted.
          </p>
        )}

        <p className="auth-footer">
          By continuing, you agree to use SmartHire AI responsibly.
        </p>
      </div>

      <div className="auth-bottom">
        AI-powered interview preparation · Built for your growth
      </div>
    </div>
  )
}
