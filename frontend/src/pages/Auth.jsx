import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorText } from '../api'
import { homeFor, useAuth } from '../auth'
import { Alert, Segmented } from '../components/ui'

function GoogleButton({ consent = false }) {
  const { config, google } = useAuth()
  const ref = useRef(null)
  const nav = useNavigate()
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!config.google_client_id) return

    const init = () => {
      window.google.accounts.id.initialize({
        client_id: config.google_client_id,
        callback: async ({ credential }) => {
          try {
            nav(homeFor((await google(credential, consent)).role))
          } catch (e) {
            setErr(errorText(e))
          }
        },
      })
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      })
    }

    if (window.google?.accounts) return init()

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = init
    document.head.appendChild(script)
  }, [config.google_client_id, google, nav, consent])

  if (!config.google_client_id) return null

  return (
    <div className="google-area">
      <div className="auth-divider"><span>or</span></div>
      <div ref={ref} className="google-button" />
      <Alert>{err}</Alert>
    </div>
  )
}

export function Shell({ children }) {
  return (
    <main className="auth-layout">
      <aside className="auth-aside">
        <Link to="/" className="brand-lockup" aria-label="SmartHire home">
          <span className="brand-mark">s</span>
          <span>smarthire</span>
        </Link>

        <div className="aside-copy">
          <span className="eyebrow">INTERVIEW PRACTICE</span>
          <h2>Make the next<br />conversation count.</h2>
          <p>Practice at your pace. Get clear feedback. Walk into your next interview prepared.</p>
        </div>

        <div className="aside-foot">
          <span className="aside-rule" />
          <span>Prepare well. Show up confidently.</span>
        </div>
        <span className="aside-index" aria-hidden="true">01 / 01</span>
      </aside>

      <section className="auth-main">
        <div className="auth-mobile-brand">
          <Link to="/" className="brand-lockup">
            <span className="brand-mark">s</span>
            <span>smarthire</span>
          </Link>
        </div>
        <div className="auth-content">{children}</div>
        <footer className="auth-footer">© {new Date().getFullYear()} SmartHire</footer>
      </section>
    </main>
  )
}

export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal">
      <Link to="/privacy">Privacy</Link>
      <span>·</span>
      <Link to="/terms">Terms</Link>
    </nav>
  )
}

export function Login() {
  const { login, config } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      nav(homeFor((await login(f.email, f.password)).role))
    } catch (e2) {
      setErr(errorText(e2))
    } finally {
      setBusy(false)
    }
  }

  const demo = (email, password) => setF({ email, password })

  return (
    <Shell>
      <div className="form-heading">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1>Welcome back.</h1>
        <p>Sign in to continue.</p>
      </div>

      <form onSubmit={submit} className="auth-form">
        <div className="form-field">
          <label className="label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="field"
            placeholder="you@example.com"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
        </div>
        <div className="form-field">
          <div className="field-heading">
            <label className="label" htmlFor="pw">Password</label>
            <Link to="/forgot-password" className="form-link">Forgot password?</Link>
          </div>
          <input
            id="pw"
            type="password"
            required
            autoComplete="current-password"
            className="field"
            placeholder="Enter your password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
        </div>
        <Alert>{err}</Alert>
        <button className="btn-primary auth-submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
          {!busy && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <GoogleButton />
      {config.demo && (
        <details className="demo-details">
          <summary>Use a demo account</summary>
          <div className="demo-options">
            <button type="button" onClick={() => demo('candidate@smarthire.ai', 'Candidate@123')}>Candidate</button>
            <button type="button" onClick={() => demo('recruiter@smarthire.ai', 'Recruiter@123')}>Recruiter</button>
            <button type="button" onClick={() => demo('admin@smarthire.ai', 'Admin@123')}>Admin</button>
          </div>
        </details>
      )}

      <p className="auth-switch">New to SmartHire? <Link to="/register">Create an account</Link></p>
      <LegalLinks />
    </Shell>
  )
}

export function Register() {
  const { register, config } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'candidate', consent: false })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      nav(homeFor((await register(f)).role))
    } catch (e2) {
      setErr(errorText(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <div className="form-heading">
        <span className="eyebrow">GET STARTED</span>
        <h1>Create your account.</h1>
        <p>A few details and you're ready to go.</p>
      </div>

      <form onSubmit={submit} className="auth-form register-form">
        {config.allow_recruiter_signup !== false && (
          <div className="form-field">
            <span className="label">Account type</span>
            <Segmented
              name="Account type"
              value={f.role}
              onChange={(role) => setF({ ...f, role })}
              options={[['candidate', 'Candidate'], ['recruiter', 'Recruiter']]}
            />
          </div>
        )}
        <div className="form-field">
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required minLength={2} autoComplete="name" className="field" placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="label" htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" required minLength={8} autoComplete="new-password" className="field" placeholder="At least 8 characters" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </div>
        <label className="consent-row">
          <input type="checkbox" required checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
          <span>I agree to the <Link to="/privacy" target="_blank">privacy notice</Link> and <Link to="/terms" target="_blank">terms</Link>, including processing of my resume, voice and on-device face signals to score practice interviews.</span>
        </label>
        <Alert>{err}</Alert>
        <button className="btn-primary auth-submit" disabled={busy || !f.consent}>
          {busy ? 'Creating account…' : 'Create account'}
          {!busy && <span aria-hidden="true">→</span>}
        </button>
      </form>

      {f.consent ? <GoogleButton consent /> : config.google_client_id && <p className="google-hint">Agree to the notice above to continue with Google.</p>}
      <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
      <LegalLinks />
    </Shell>
  )
}
