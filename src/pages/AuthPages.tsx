import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, LockKeyhole, Mail, UserRound, Check, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '../components/AuthLayout';
import { Button, Field, Loading, Notice } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isConfigured, oauthEnabled, redirectUrl, supabase } from '../lib/supabase';
import { emailValid, passwordError, phoneValid, readableError } from '../lib/validation';

function SetupNotice() { return !isConfigured ? <Notice type="info">Account services aren’t connected yet. Add your Supabase configuration to enable secure sign-in.</Notice> : null; }
function SocialAuth({ onError }: { onError: (error: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function oauth(provider: 'google' | 'linkedin_oidc') {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl('/auth/callback'), ...(provider === 'linkedin_oidc' ? { scopes: 'openid profile email' } : {}) } });
      if (error) throw error;
    } catch (error) { onError(readableError(error)); setBusy(false); }
  }
  return <><div className="divider"><span>or continue with</span></div><div className="social-buttons"><button type="button" className="social-button" disabled={!oauthEnabled.google || busy} onClick={() => oauth('google')}><span className="google-mark">G</span>Google{!oauthEnabled.google && <span className="soon-label">Not connected</span>}</button>{oauthEnabled.linkedin_oidc && <button type="button" className="social-button" disabled={busy} onClick={() => oauth('linkedin_oidc')}><span className="linkedin-mark">in</span>LinkedIn</button>}</div></>;
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register'; const { session, loading, recovery } = useAuth(); const navigate = useNavigate();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [password, setPassword] = useState('');
  useEffect(() => { setError(''); setSuccess(''); setPassword(''); }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSuccess('');
    if (!supabase) { setError('Connect Supabase before creating an account or signing in. See the setup guide in README.md.'); return; }
    const form = new FormData(event.currentTarget); const email = String(form.get('email')).trim(); const enteredPassword = String(form.get('password'));
    if (!emailValid(email)) { setError('Enter a valid email address.'); return; }
    if (register) {
      const invalid = passwordError(enteredPassword);
      if (invalid) { setError(invalid); return; }
      if (enteredPassword !== form.get('confirmPassword')) { setError('Your passwords don’t match. Please check them.'); return; }
      if (String(form.get('fullName')).trim().length < 2) { setError('Enter your full name (at least two characters).'); return; }
      if (!phoneValid(`${form.get('countryCode')}${String(form.get('phone')).replace(/[\s()-]/g, '')}`)) { setError('Enter a valid phone number without the country code.'); return; }
      if (!form.get('terms')) { setError('Please acknowledge the terms and privacy notice.'); return; }
    }
    setBusy(true);
    try {
      if (register) {
        const { data, error: authError } = await supabase.auth.signUp({ email, password: enteredPassword, options: {
          emailRedirectTo: redirectUrl('/auth/callback'), data: { full_name: String(form.get('fullName')).trim(), phone: `${form.get('countryCode')}${String(form.get('phone')).replace(/[\s()-]/g, '')}`, terms_accepted_at: new Date().toISOString() },
        } });
        if (authError) throw authError;
        if (data.session) navigate('/dashboard', { replace: true });
        else setSuccess('Check your inbox for a confirmation link. If this address is already registered, sign in or reset your password.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password: enteredPassword });
        if (authError) throw authError;
        navigate('/dashboard', { replace: true });
      }
    } catch (error) { setError(readableError(error)); }
    finally { setBusy(false); }
  }
  if (loading) return <Loading />;
  if (recovery && session) return <Navigate to="/reset-password" replace />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <motion.div key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}><div className="form-kicker"><span /> {register ? 'MAKE YOUR NEXT MOVE' : 'WELCOME BACK'}</div><h2>{register ? 'Create your account' : 'Sign in'}</h2><p className="form-subtitle">{register ? 'A more confident you starts right here.' : 'Your next opportunity is worth preparing for.'}</p><SetupNotice /><Notice>{error}</Notice><Notice type="success">{success}</Notice><form onSubmit={submit} className="auth-form" key={mode}>
    {register && <Field label="Full name" name="fullName" icon={UserRound} placeholder="Your full name" autoComplete="name" required minLength={2} maxLength={100} />}
    <Field label="Email address" name="email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email" required maxLength={254} />
    <Field label="Password" name="password" icon={LockKeyhole} type="password" placeholder={register ? 'Create a strong password' : 'Enter your password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 12 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
    {register && <><div className="password-guidance"><span className={password.length >= 12 ? 'passed' : ''}><Check size={12} />12+ characters</span><span className={/[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'passed' : ''}><Check size={12} />Aa & numbers</span></div><Field label="Confirm password" name="confirmPassword" icon={LockKeyhole} type="password" placeholder="Re-enter your password" autoComplete="new-password" required maxLength={128} /><div className="field"><label htmlFor="phone">Phone number</label><div className="input-wrap phone-input"><select name="countryCode" aria-label="Country calling code" defaultValue="+91"><option value="+91">IN +91</option><option value="+1">US/CA +1</option><option value="+44">UK +44</option><option value="+61">AU +61</option><option value="+65">SG +65</option><option value="+971">AE +971</option></select><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="Your phone number" required maxLength={18} /></div></div><label className="checkbox-row"><input type="checkbox" name="terms" required /><span>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Notice</Link>.</span></label></>}
    {!register && <div className="login-options"><span><ShieldCheck size={13} /> Secure, persistent sign-in</span><Link to="/forgot-password">Forgot password?</Link></div>}
    <Button type="submit" busy={busy} className="full-width" disabled={!isConfigured}>{register ? 'Create account' : 'Sign in'}<ArrowRight size={18} /></Button>
  </form><SocialAuth onError={setError} /><p className="auth-switch">{register ? 'Already part of the journey?' : 'New to SmartHire AI?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'} <ArrowRight size={14} /></Link></p></motion.div>;
}

export function ForgotPassword() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return;
    const email = String(new FormData(event.currentTarget).get('email')).trim();
    if (!emailValid(email)) { setError('Enter a valid email address.'); return; }
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl('/reset-password') });
      if (error) throw error;
      setSuccess('If an account exists for that address, you’ll receive a password reset link. Open it in this browser to continue.');
    } catch (error) { setError(readableError(error)); } finally { setBusy(false); }
  }
  return <AuthLayout><Link className="back-link" to="/login"><ArrowLeft size={16} /> Back to sign in</Link><div className="form-kicker">LET’S GET YOU BACK IN</div><h2>Forgot your password?</h2><p className="form-subtitle">It happens. We’ll send you a secure reset link.</p><SetupNotice /><Notice>{error}</Notice><Notice type="success">{success}</Notice><form className="auth-form" onSubmit={submit}><Field label="Email address" type="email" name="email" icon={Mail} autoComplete="email" placeholder="you@example.com" required /><Button busy={busy} disabled={!isConfigured} className="full-width">Send reset link <ArrowRight size={18} /></Button></form></AuthLayout>;
}

export function ResetPassword() {
  const { session, loading, clearRecovery } = useAuth(); const navigate = useNavigate(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !session) return;
    const form = new FormData(event.currentTarget); const password = String(form.get('password'));
    const invalid = passwordError(password); if (invalid) { setError(invalid); return; }
    if (password !== form.get('confirm')) { setError('Your passwords don’t match.'); return; }
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
      clearRecovery();
      const result = await supabase.auth.signOut(); if (result.error) throw result.error;
      navigate('/login', { replace: true });
    } catch (error) { setError(readableError(error)); } finally { setBusy(false); }
  }
  if (loading) return <Loading />;
  return <AuthLayout><div className="form-kicker">A FRESH START</div><h2>Set a new password</h2><p className="form-subtitle">Choose a unique password to protect your account.</p><Notice>{error}</Notice>{session ? <form className="auth-form" onSubmit={submit}><Field label="New password" type="password" name="password" icon={LockKeyhole} autoComplete="new-password" hint="12+ characters, uppercase, lowercase, and a number." minLength={12} maxLength={128} required /><Field label="Confirm new password" type="password" name="confirm" icon={LockKeyhole} autoComplete="new-password" required /><Button busy={busy} className="full-width">Update password <ArrowRight size={18} /></Button></form> : <><Notice>This reset link has expired or is invalid. Request another link and open it in the same browser.</Notice><Link className="button full-width" to="/forgot-password">Request a new link</Link></>}</AuthLayout>;
}

export function AuthCallback() {
  const { session, loading, recovery } = useAuth(); const [expired, setExpired] = useState(false);
  const params = new URLSearchParams(window.location.search); const hash = new URLSearchParams(window.location.hash.slice(1));
  const error = params.get('error_description') || hash.get('error_description');
  useEffect(() => { const timer = window.setTimeout(() => setExpired(true), 12000); return () => window.clearTimeout(timer); }, []);
  if (error) return <AuthLayout><h2>Let’s try that again.</h2><Notice>{error}</Notice><Link to="/login" className="button">Back to sign in</Link></AuthLayout>;
  if (!loading && session) return <Navigate to={recovery ? '/reset-password' : '/dashboard'} replace />;
  if (expired || !isConfigured) return <AuthLayout><h2>Link couldn’t be verified</h2><Notice>Open the link in the browser where you started, or request a fresh link. If your email is already verified, you can sign in.</Notice><Link to="/login" className="button">Back to sign in</Link></AuthLayout>;
  return <Loading />;
}

