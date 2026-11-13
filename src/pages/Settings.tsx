import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LockKeyhole, LogOut, Mail, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Notice } from '../components/ui';
import { redirectUrl, supabase } from '../lib/supabase';
import { readableError } from '../lib/validation';

export default function Settings() {
  const { session, profile, reloadProfile, signOut } = useAuth();
  const [preferences, setPreferences] = useState({ email_updates: false, practice_reminders: false, analytics_consent: false });
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  useEffect(() => { if (profile) setPreferences({ email_updates: profile.email_updates, practice_reminders: profile.practice_reminders, analytics_consent: profile.analytics_consent }); }, [profile]);
  async function action(type: 'save' | 'password' | 'logout') {
    if (!supabase || !session) return; setBusy(type); setError(''); setSuccess('');
    try {
      if (type === 'save') {
        const { error } = await supabase.from('profiles').update(preferences).eq('id', session.user.id).select('id').single(); if (error) throw error;
        await reloadProfile(); setSuccess('Your preferences have been saved.');
      } else if (type === 'password') {
        const { error } = await supabase.auth.resetPasswordForEmail(session.user.email!, { redirectTo: redirectUrl('/reset-password') }); if (error) throw error;
        setSuccess('A secure password reset link is on its way. Open it in this browser to choose a new password.');
      } else await signOut();
    } catch (error) { setError(readableError(error)); } finally { setBusy(''); }
  }
  function toggle(key: keyof typeof preferences) { setPreferences(previous => ({ ...previous, [key]: !previous[key] })); setSuccess(''); }
  return <><div className="page-heading"><div><div className="eyebrow small-eyebrow">JUST THE WAY YOU LIKE IT</div><h1>Settings</h1><p>A few preferences to make this space your own.</p></div></div><div className="settings-container"><Notice>{error}</Notice><Notice type="success">{success}</Notice><section className="card settings-card"><div className="section-heading"><h2><ShieldCheck size={20} /> Account & security</h2><p>Your account is protected by Supabase authentication.</p></div><div className="setting-row"><div><h3>Email address</h3><p>{session?.user.email}</p></div><span className="pill">{session?.user.email_confirmed_at ? 'Verified' : 'Verification pending'}</span></div><div className="setting-row"><div><h3>Password</h3><p>We’ll email a secure link to change your password.</p></div><Button className="secondary" busy={busy === 'password'} disabled={!!busy} onClick={() => void action('password')}><LockKeyhole size={16} /> Send reset link</Button></div><div className="setting-row"><div><h3>Account information</h3><p>Manage your name, education, and career interests.</p></div><Link className="subtle-link" to="/profile">Edit profile →</Link></div></section><section className="card settings-card"><div className="section-heading"><h2><Bell size={20} /> Communication preferences</h2><p>Preferences are saved now. Delivery will begin when these features launch.</p></div><Preference title="Product updates by email" description="Occasional updates about new SmartHire AI features." checked={preferences.email_updates} disabled={!profile || !!busy} onChange={() => toggle('email_updates')} /><Preference title="Practice reminders" description="A gentle nudge to keep your preparation on track. Coming soon." checked={preferences.practice_reminders} disabled={!profile || !!busy} onChange={() => toggle('practice_reminders')} /></section><section className="card settings-card"><div className="section-heading"><h2><LockKeyhole size={20} /> Privacy</h2><p>Your profile and photo are private by default.</p></div><Preference title="Optional product analytics" description="Allow future usage analytics to help improve the experience. No optional analytics are collected in this version." checked={preferences.analytics_consent} disabled={!profile || !!busy} onChange={() => toggle('analytics_consent')} /><div className="setting-row"><div><h3>Your information</h3><p>Learn what this internship application stores and why.</p></div><Link className="subtle-link" to="/privacy">Privacy notice →</Link></div></section><div className="form-actions"><span><Mail size={14} /> You’re always in control.</span><Button busy={busy === 'save'} disabled={!profile || !!busy} onClick={() => void action('save')}><Save size={16} /> Save preferences</Button></div><section className="card setting-row signout-card"><div><h3>Ready to take a break?</h3><p>Sign out of your SmartHire AI account.</p></div><Button className="secondary" busy={busy === 'logout'} disabled={!!busy} onClick={() => void action('logout')}><LogOut size={16} /> Sign out</Button></section></div></>;
}
function Preference({ title, description, checked, disabled, onChange }: { title: string; description: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return <label className="setting-row preference-row"><span><strong>{title}</strong><span className="preference-description">{description}</span></span><input className="toggle" type="checkbox" checked={checked} disabled={disabled} onChange={onChange} /><span className="visually-hidden">{title}</span></label>;
}
