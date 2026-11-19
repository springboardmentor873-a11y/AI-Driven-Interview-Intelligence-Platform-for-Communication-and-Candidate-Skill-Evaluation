import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button, Notice } from './ui';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { readableError } from '../lib/validation';
import { useAuth } from '../context/AuthContext';

export function mergeSkills(existing: string[], selected: string[]) {
  return [...new Map([...existing, ...selected].map(skill => [skill.toLowerCase(), skill])).values()];
}

export default function ResumeSkills({ userId, busy, setBusy }: { userId: string; busy: boolean; setBusy: (value: boolean) => void }) {
  const { reloadProfile } = useAuth();
  const [skills, setSkills] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function analyze() {
    setBusy(true); setError(''); setSuccess(''); setSkills(null); setSelected([]);
    try {
      const { data } = await api.post<{ skills: string[] }>('/api/resume/analyze', undefined, { timeout: 45000 });
      if (active.current) { setSkills(data.skills); setSelected(data.skills); }
    } catch (err) {
      if (active.current) setError(axios.isAxiosError(err) ? (typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Could not reach resume extraction. Check that the backend is running and try again.') : readableError(err));
    } finally { if (active.current) setBusy(false); }
  }
  async function save() {
    if (!supabase || !selected.length) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const { data, error: readError } = await supabase.from('profiles').select('skills').eq('id', userId).single();
      if (readError) throw readError;
      const merged = mergeSkills(data.skills || [], selected);
      if (merged.length > 30) throw new Error('Your profile can hold 30 skills. Select fewer suggestions or edit your existing skills first.');
      const { error: saveError } = await supabase.from('profiles').update({ skills: merged }).eq('id', userId).select('id').single();
      if (saveError) throw saveError;
      await reloadProfile();
      if (active.current) setSuccess('Selected skills saved to your profile. Existing skills were kept.');
    } catch (err) { if (active.current) setError(readableError(err)); }
    finally { if (active.current) setBusy(false); }
  }
  return <section className="card resume-next"><h2>Find skills in your resume</h2><p>Extract skill suggestions from your PDF, then review what belongs on your profile. This uses keyword matching, not an assessment of your ability.</p><Notice>{error}</Notice><Notice type="success">{success}</Notice><Button className="secondary" disabled={busy} onClick={() => void analyze()}>{busy ? 'Please wait…' : skills ? 'Extract again' : 'Extract skills'}</Button>
    {skills !== null && <div className="resume-suggestions"><h3>{skills.length ? 'Review suggested skills' : 'No matching skills found'}</h3><p>{skills.length ? 'Uncheck anything that does not describe your skills. You can add other skills on your profile.' : 'You can add skills manually on your profile. This matching list may not cover your field.'}</p><fieldset disabled={busy}><legend className="visually-hidden">Skills to add to profile</legend>{skills.map(skill => <label className="checkbox-row" key={skill}><input type="checkbox" checked={selected.includes(skill)} onChange={event => setSelected(current => event.target.checked ? [...current, skill] : current.filter(item => item !== skill))} />{skill}</label>)}</fieldset>{skills.length > 0 && <Button disabled={busy || !selected.length} onClick={() => void save()}>Save selected skills</Button>}</div>}
  </section>;
}
