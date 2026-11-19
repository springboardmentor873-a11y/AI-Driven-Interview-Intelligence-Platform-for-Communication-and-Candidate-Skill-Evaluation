import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Loading, Notice } from '../components/ui';
import { downloadResume, loadResume, removeResume, uploadResume, type ResumeInfo } from '../lib/resumes';
import ResumeSkills from '../components/ResumeSkills';
import { readableError } from '../lib/validation';

export default function Resume() {
  const { session, profile, profileLoading } = useAuth();
  const userId = session?.user.id;
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [preview, setPreview] = useState('');
  const [retry, setRetry] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const identity = useRef(userId);
  identity.current = userId;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    let active = true;
    setResume(null); setPreview(''); setError(''); setSuccess(''); setConfirmRemove(false);
    if (!userId || profile?.role !== 'candidate') { setLoading(false); return; }
    setLoading(true);
    loadResume(userId).then(data => { if (active) setResume(data); })
      .catch(err => { if (active) setError(readableError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, profile?.role, retry]);

  async function upload(file?: File) {
    if (!file || !userId || busy) return;
    const owner = userId;
    setBusy(true); setError(''); setSuccess(''); setConfirmRemove(false);
    try {
      await uploadResume(owner, file);
      if (identity.current !== owner) return;
      setPreview('');
      setResume({ updatedAt: new Date().toISOString(), size: file.size });
      setSuccess('Your resume has been saved privately.');
    } catch (err) { if (identity.current === owner) setError(readableError(err)); }
    finally { if (identity.current === owner) setBusy(false); }
  }
  async function open() {
    if (!userId || busy) return;
    const owner = userId;
    setBusy(true); setError(''); setSuccess('');
    try {
      const file = await downloadResume(owner);
      if (identity.current === owner) setPreview(URL.createObjectURL(file));
    } catch (err) { if (identity.current === owner) setError(readableError(err)); }
    finally { if (identity.current === owner) setBusy(false); }
  }
  async function remove() {
    if (!userId || busy) return;
    const owner = userId;
    setBusy(true); setError(''); setSuccess('');
    try {
      await removeResume(owner);
      if (identity.current !== owner) return;
      setResume(null); setPreview(''); setConfirmRemove(false); setSuccess('Your resume has been removed.');
    } catch (err) { if (identity.current === owner) setError(readableError(err)); }
    finally { if (identity.current === owner) setBusy(false); }
  }
  if (profileLoading) return <Loading />;
  if (!profile) return <Notice>Your profile must load before you can manage a resume. Use the profile retry above.</Notice>;
  if (profile.role !== 'candidate') return <section className="card"><h1>Candidate resumes</h1><p>Resume uploads are available to candidate accounts. Assigned candidate reviews will be added to the evaluator workspace.</p><Link className="subtle-link" to="/dashboard">Back to overview</Link></section>;
  return <div className="resume-page">
    <div className="page-heading"><div><div className="eyebrow small-eyebrow">PREPARE YOUR NEXT STEP</div><h1>My resume</h1><p>Keep your latest resume ready for interview preparation.</p></div><span className="pill"><ShieldCheck size={14} /> Private to you</span></div>
    <Notice>{error}</Notice><Notice type="success">{success}</Notice>
    {error && <button className="text-button" disabled={busy || loading} onClick={() => setRetry(value => value + 1)}>Reload resume</button>}
    {loading ? <Loading /> : <section className="card resume-upload" aria-label="Resume upload">
      <div className="resume-file-icon"><FileText size={32} /></div>
      <h2>{resume ? 'Your resume is ready' : 'Add your resume'}</h2>
      <p>{resume ? 'One current resume, stored securely in your account.' : 'Choose a PDF of your resume to get started.'}</p>
      {resume && <div className="resume-file-details"><strong>Resume.pdf</strong><span>{(resume.size / 1024).toFixed(0)} KB{resume.updatedAt && ` · Updated ${new Date(resume.updatedAt).toLocaleDateString()}`}</span></div>}
      <input ref={fileInput} className="visually-hidden" type="file" accept=".pdf,application/pdf" aria-label="Choose resume PDF" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} />
      <div className="resume-actions"><Button busy={busy} onClick={() => fileInput.current?.click()}><Upload size={17} />{resume ? 'Replace PDF' : 'Upload PDF'}</Button>{resume && <><Button className="secondary" disabled={busy} onClick={() => void open()}><Download size={17} />View / download</Button><button className="text-button" disabled={busy} onClick={() => setConfirmRemove(true)}><Trash2 size={16} />Remove</button></>}</div>
      <small>PDF only · Up to 5 MB{resume && ' · A new upload replaces your current resume'}</small>
      {preview && <div className="resume-preview" role="status"><a className="subtle-link" href={preview} target="_blank" rel="noopener noreferrer">Open PDF in a new tab</a><a className="subtle-link" href={preview} download="Resume.pdf">Download PDF</a></div>}
      {confirmRemove && <div className="resume-remove" role="group" aria-label="Confirm resume removal"><p>Remove your saved resume? You can upload it again later.</p><div className="resume-actions"><Button disabled={busy} onClick={() => void remove()}>Remove resume</Button><Button className="secondary" disabled={busy} onClick={() => setConfirmRemove(false)}>Keep resume</Button></div></div>}
    </section>}
    {resume && userId && <ResumeSkills key={`${userId}/${resume.updatedAt}`} userId={userId} busy={busy} setBusy={setBusy} />}
    <section className="card resume-next"><h2>Your preparation</h2><p>Review extracted skills before saving. Tailored interview questions are coming next.</p><Link className="subtle-link" to="/profile">Edit your profile skills</Link></section>
  </div>;
}
