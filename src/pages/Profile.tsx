import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { Camera, Check, Mail, Save, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Field, Loading, Notice } from '../components/ui';
import { editableProfileFields, supabase, type Profile as ProfileData } from '../lib/supabase';
import { phoneValid, readableError } from '../lib/validation';

export default function Profile() {
  const { profile, session, profileLoading, reloadProfile } = useAuth();
  const [draft, setDraft] = useState<ProfileData | null>(null); const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [avatar, setAvatar] = useState('');
  useEffect(() => { if (profile) { setDraft(profile); setSkills(profile.skills.join(', ')); } }, [profile]);
  useEffect(() => {
    let active = true;
    setAvatar('');
    if (profile?.avatar_path && supabase) supabase.storage.from('avatars').createSignedUrl(profile.avatar_path, 3600).then(({ data, error }) => { if (active) { if (data) setAvatar(data.signedUrl); if (error) setError('Your photo could not be loaded. Please try uploading it again.'); } });
    return () => { active = false; };
  }, [profile?.avatar_path]);
  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) { setDraft(current => current ? { ...current, [key]: value } : current); setSuccess(''); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !draft || !session) return;
    setError(''); setSuccess('');
    if (draft.full_name.trim().length < 2) { setError('Your full name must contain at least two characters.'); return; }
    if (draft.phone && !phoneValid(draft.phone)) { setError('Use an international phone number, for example +919876543210.'); return; }
    const parsedSkills = [...new Set(skills.split(',').map(skill => skill.trim()).filter(Boolean))];
    if (parsedSkills.length > 30 || parsedSkills.some(skill => skill.length > 50)) { setError('Add up to 30 skills, with no more than 50 characters each.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').update(editableProfileFields({ ...draft, skills: parsedSkills })).eq('id', session.user.id).select('id').single();
      if (error) throw error;
      await reloadProfile(); setSuccess('Your profile has been saved. Looking good!');
    } catch (error) { setError(readableError(error)); } finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || !supabase || !session) return;
    setError(''); setSuccess('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setError('Choose a JPG, PNG, or WebP photo smaller than 2 MB.'); return; }
    setUploading(true);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`; const oldPath = profile?.avatar_path;
    try {
      const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type }); if (error) throw error;
      const { error: saveError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', session.user.id).select('id').single();
      if (saveError) { await supabase.storage.from('avatars').remove([path]); throw saveError; }
      if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      await reloadProfile(); setSuccess('Your profile photo has been updated.');
    } catch (error) { setError(readableError(error)); } finally { setUploading(false); }
  }
  if (profileLoading && !draft) return <Loading />;
  if (!draft) return <section className="card"><h1>Let’s load your profile</h1><p>Your profile isn’t available yet. Ensure the database migration has been applied, then try again.</p><Button onClick={() => void reloadProfile()}>Reload profile</Button></section>;
  return <><div className="page-heading"><div><div className="eyebrow small-eyebrow">THE PERSON BEHIND THE POTENTIAL</div><h1>My profile</h1><p>Your story, your strengths, your next move.</p></div><span className="pill"><UserRound size={14} /> {profile?.role || 'candidate'}</span></div><Notice>{error}</Notice><Notice type="success">{success}</Notice><form onSubmit={save} className="profile-layout"><section className="card profile-summary"><div className="avatar large">{avatar ? <img src={avatar} alt="Your profile" /> : draft.full_name.slice(0, 1).toUpperCase() || <UserRound />}</div><h2>{draft.full_name}</h2><p>{session?.user.email}</p><label className={`button secondary photo-label ${uploading ? 'disabled' : ''}`}><Camera size={16} />{uploading ? 'Uploading…' : 'Change photo'}<input className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={uploading || busy} /></label><small>JPG, PNG or WebP · Max 2 MB<br />Stored privately. Only you can access it.</small><div className="profile-account"><Check size={16} /><span>Your account, your space.</span></div></section><div className="profile-details"><section className="card"><div className="section-heading"><h2>The basics</h2><p>Help us get to know you.</p></div><div className="form-grid"><Field label="Full name" value={draft.full_name} onChange={e => update('full_name', e.target.value)} autoComplete="name" required minLength={2} maxLength={100} /><Field label="Email address" value={session?.user.email || ''} icon={Mail} disabled hint="Your verified sign-in email." /><Field label="Phone number" type="tel" value={draft.phone} onChange={e => update('phone', e.target.value)} autoComplete="tel" placeholder="+919876543210" maxLength={16} /><Field label="Preferred job role" value={draft.preferred_role} onChange={e => update('preferred_role', e.target.value)} placeholder="e.g. Frontend Developer" maxLength={100} /></div></section><section className="card"><div className="section-heading"><h2>Education & skills</h2><p>Every experience adds to your story.</p></div><div className="form-grid"><Field label="College / university" value={draft.college} onChange={e => update('college', e.target.value)} placeholder="Your institution" maxLength={160} /><Field label="Degree" value={draft.degree} onChange={e => update('degree', e.target.value)} placeholder="e.g. B.Tech in Computer Science" maxLength={120} /><Field label="Graduation year" type="number" value={draft.graduation_year || ''} min={1950} max={2100} onChange={e => update('graduation_year', e.target.value ? Number(e.target.value) : null)} placeholder="2027" /><Field label="Skills" value={skills} onChange={e => { setSkills(e.target.value); setSuccess(''); }} placeholder="React, Python, Communication" hint="Separate skills with commas." maxLength={1500} /></div><div className="field bio-field"><label htmlFor="bio">A little about you</label><textarea id="bio" value={draft.bio} maxLength={1000} rows={4} onChange={e => update('bio', e.target.value)} placeholder="Share your interests, experience, and what you’re working toward…" /><small className="field-hint">{draft.bio.length}/1000 characters</small></div></section><div className="form-actions"><span>Your information is visible only to you.</span><Button busy={busy} disabled={uploading} type="submit"><Save size={17} /> Save changes</Button></div></div></form></>;
}
