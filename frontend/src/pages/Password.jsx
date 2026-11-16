import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, errorText } from '../api'
import { homeFor, useAuth } from '../auth'
import { Alert } from '../components/ui'
import { LegalLinks, Shell } from './Auth'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { setMsg((await api.post('/api/auth/forgot-password', { email })).data.message) } catch (e2) { setErr(errorText(e2)) } finally { setBusy(false) }
  }
  return (
    <Shell>
      <div className="form-heading">
        <span className="eyebrow">ACCOUNT HELP</span>
        <h1>Reset your password.</h1>
        <p>Enter your email and we’ll send you a reset link.</p>
      </div>
      {msg ? <div className="mt-6"><Alert kind="ok">{msg}</Alert><Link to="/login" className="link mt-4 inline-block">Back to sign in</Link></div> : (
        <form onSubmit={submit} className="auth-form">
          <div><label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Alert>{err}</Alert>
          <button className="btn-primary auth-submit" disabled={busy}>{busy ? 'Sending link…' : 'Send reset link'} {!busy && <span aria-hidden="true">→</span>}</button>
          <Link to="/login" className="link block text-sm">Back to sign in</Link>
        </form>
      )}
      <LegalLinks />
    </Shell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const { accept } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const token = params.get('token') || ''
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (pw !== pw2) { setErr('The two passwords do not match'); return }
    setBusy(true)
    try { nav(homeFor(accept((await api.post('/api/auth/reset-password', { token, new_password: pw })).data).role)) }
    catch (e2) { setErr(errorText(e2)); setBusy(false) }
  }
  return (
    <Shell>
      <div className="form-heading">
        <span className="eyebrow">ACCOUNT HELP</span>
        <h1>Choose a new password.</h1>
        <p>You’ll be signed out on other devices.</p>
      </div>
      {!token ? <div className="mt-6"><Alert>This link is missing its token. Request a new reset email.</Alert><Link to="/forgot-password" className="link mt-4 inline-block">Request a new link</Link></div> : (
        <form onSubmit={submit} className="auth-form">
          <div><label className="label" htmlFor="pw">New password</label>
            <input id="pw" type="password" required minLength={8} autoComplete="new-password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} />
            <p className="mt-1 text-xs text-muted">At least 8 characters with letters and numbers.</p></div>
          <div><label className="label" htmlFor="pw2">Repeat new password</label>
            <input id="pw2" type="password" required minLength={8} autoComplete="new-password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <Alert>{err}</Alert>
          <button className="btn-primary auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'} {!busy && <span aria-hidden="true">→</span>}</button>
        </form>
      )}
    </Shell>
  )
}
