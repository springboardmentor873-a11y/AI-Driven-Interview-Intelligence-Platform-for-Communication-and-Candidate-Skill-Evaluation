import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Field, Loading, Notice } from '../components/ui';
import { readableError } from '../lib/validation';

type Session = { id: string; interview_type: string; difficulty: string; target_role: string; questions: string[]; answers: string[]; status: 'in_progress' | 'completed'; created_at: string; updated_at: string };
type Setup = { interview_type: string; difficulty: string; target_role: string; skills: string[] };
function errorText(error: unknown) {
  return axios.isAxiosError(error) ? (typeof error.response?.data?.detail === 'string' ? error.response.data.detail : 'Could not generate questions. Check that the backend is running, then retry.') : readableError(error);
}

export function InterviewSetup() {
  const { profile, session, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<{ setup: Setup; questions: string[] } | null>(null);
  async function save(prepared: { setup: Setup; questions: string[] }) {
    if (!supabase || !session) return;
    const { skills: _skills, ...settings } = prepared.setup;
    const { data, error } = await supabase.from('interview_sessions').insert({ ...settings, questions: prepared.questions, user_id: session.user.id }).select('id').single();
    if (error) throw error;
    navigate(`/interviews/${data.id}`);
  }
  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (generated) { await save(generated); return; }
      const form = new FormData(event.currentTarget);
      const setup: Setup = { interview_type: String(form.get('type')), difficulty: String(form.get('difficulty')), target_role: String(form.get('role')).trim(), skills: form.getAll('skill').map(String) };
      if (setup.skills.length > 10) throw new Error('Select up to 10 skills for this interview.');
      const { data } = await api.post<{ questions: string[] }>('/api/interviews/questions', setup, { timeout: 75000 });
      const prepared = { setup, questions: data.questions };
      setGenerated(prepared);
      await save(prepared);
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }
  if (profileLoading) return <Loading />;
  if (!profile) return <Notice>Your profile must load before starting an interview.</Notice>;
  if (profile.role !== 'candidate') return <Notice type="info">Interview practice is for candidate accounts. Evaluator reviews will be added separately.</Notice>;
  return <div className="interview-page"><div className="page-heading"><div><h1>Set up your interview</h1><p>Five questions, tailored to what you want to practice.</p></div></div><Notice>{error}</Notice><form className="card interview-setup" onSubmit={start}>
    <fieldset disabled={busy || !!generated}><legend>Practice preferences</legend><div className="form-grid"><label className="field">Interview type<select name="type"><option value="technical">Technical</option><option value="hr">HR</option><option value="behavioral">Behavioral</option><option value="aptitude">Aptitude</option></select></label><label className="field">Difficulty<select name="difficulty"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><Field label="Target role" name="role" defaultValue={profile.preferred_role} placeholder="e.g. Frontend developer" minLength={2} maxLength={100} required /></div><p className="interview-help">Choose up to 10 skills from your profile.</p><div className="interview-skills">{profile.skills.map((skill, index) => <label className="checkbox-row" key={skill}><input type="checkbox" name="skill" value={skill} defaultChecked={index < 5} />{skill}</label>)}</div>{!profile.skills.length && <Link className="subtle-link" to="/profile">Add skills to your profile</Link>}</fieldset>
    <p className="interview-help">Your selected role, skills, type, and difficulty are sent to OpenAI to generate questions. Your resume file and answers are not sent in this step. This is a text practice session; recording and scoring are not available yet.</p>
    {generated && <Notice type="info">Questions are generated but the session could not be saved. Retry saving below without another AI request.</Notice>}
    <Button type="submit" busy={busy}>{generated ? 'Retry saving session' : 'Generate questions & start'}</Button>
  </form></div>;
}

export function InterviewHistory() {
  const { session } = useAuth();
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setItems([]);
    if (!supabase || !session) { setLoading(false); return; }
    supabase.from('interview_sessions').select('id,interview_type,difficulty,target_role,status,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50).then(({ data, error }) => { if (active) { if (error) setError(readableError(error)); else setItems(data as Session[]); setLoading(false); } });
    return () => { active = false; };
  }, [session?.user.id, retry]);
  return <div className="interview-page"><div className="page-heading"><div><h1>My interviews</h1><p>Your latest 50 practice sessions and saved answers.</p></div><Link className="button" to="/interview">New interview</Link></div><Notice>{error}</Notice>{error && <Button onClick={() => setRetry(value => value + 1)}>Retry</Button>}{loading ? <Loading /> : !error && <section className="card">{items.length ? <div className="session-list">{items.map(item => <Link key={item.id} to={`/interviews/${item.id}`}><div><strong>{item.target_role}</strong><span>{item.interview_type} · {item.difficulty} · {new Date(item.created_at).toLocaleDateString()}</span></div><span className="pill">{item.status === 'completed' ? 'Completed · Unscored' : 'Resume session'}</span></Link>)}</div> : <p>No interviews yet. Start a session when you’re ready.</p>}</section>}</div>;
}

export function InterviewRoom() {
  const { id } = useParams();
  const { session } = useAuth();
  const [record, setRecord] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const dirty = !!record && JSON.stringify(record.answers) !== JSON.stringify(answers);
  useEffect(() => {
    let active = true;
    setRecord(null); setLoading(true); setError(''); setIndex(0); setSaved('');
    if (!supabase || !session || !id) { setLoading(false); return; }
    supabase.from('interview_sessions').select('*').eq('id', id).eq('user_id', session.user.id).single().then(({ data, error }) => { if (active) { if (error) setError('Session could not be loaded. Check your connection and that it belongs to your account.'); else { setRecord(data); setAnswers(data.answers); } setLoading(false); } });
    return () => { active = false; };
  }, [id, session?.user.id]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  async function save(complete = false, next?: number) {
    if (!record || !supabase || !session) return;
    setBusy(true); setError(''); setSaved('');
    try {
      if (complete && answers.some(answer => !answer.trim())) throw new Error('Answer all five questions before finishing.');
      const { data, error } = await supabase.from('interview_sessions').update({ answers, status: complete ? 'completed' : 'in_progress' }).eq('id', record.id).eq('user_id', session.user.id).eq('updated_at', record.updated_at).select('*').single();
      if (error) throw new Error('Could not save. Check your connection. If this session changed in another tab, copy your answer before reloading.');
      setRecord(data); setSaved(complete ? 'Session completed. Your answers are saved; scoring is not available yet.' : 'Answers saved.');
      if (next !== undefined) setIndex(next);
    } catch (err) { setError(readableError(err)); } finally { setBusy(false); }
  }
  if (loading) return <Loading />;
  if (!record) return <><Notice>{error}</Notice><Link className="subtle-link" to="/interviews">Back to interviews</Link></>;
  const completed = record.status === 'completed';
  return <div className="interview-page"><div className="page-heading"><div><h1>{record.target_role}</h1><p>{record.interview_type} · {record.difficulty} · {completed ? 'Completed, unscored' : 'Text practice'}</p></div></div><Notice>{error}</Notice><Notice type="success">{saved}</Notice><section className="card interview-room"><span className="pill">Question {index + 1} of {record.questions.length}</span><h2 tabIndex={-1}>{record.questions[index]}</h2><label className="field">Your answer<textarea rows={9} maxLength={4000} value={answers[index]} disabled={busy || completed} onChange={event => { setAnswers(values => values.map((value, n) => n === index ? event.target.value : value)); setSaved(''); }} /></label><p className="interview-help">{answers[index]?.length || 0}/4000 characters · {dirty ? 'Unsaved changes—save before leaving this page.' : 'Saved answers can be revisited from My interviews.'}</p><div className="resume-actions">{index > 0 && <Button className="secondary" disabled={busy} onClick={() => completed ? setIndex(index - 1) : void save(false, index - 1)}>Previous</Button>}{!completed && <Button busy={busy} onClick={() => void save()}>Save answer</Button>}{index < 4 ? <Button disabled={busy} onClick={() => completed ? setIndex(index + 1) : void save(false, index + 1)}>{completed ? 'Next' : 'Save & next'}</Button> : !completed && <Button disabled={busy} onClick={() => void save(true)}>Finish interview</Button>}</div></section>{!dirty && <Link className="subtle-link" to="/interviews">Back to my interviews</Link>}</div>;
}
