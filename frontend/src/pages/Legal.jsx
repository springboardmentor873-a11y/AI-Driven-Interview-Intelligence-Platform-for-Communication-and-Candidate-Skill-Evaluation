import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

function Page({ title, children }) {
  return (
    <main className="legal-page">
      <div className="legal-inner">
        <header className="legal-top">
          <Link to="/" className="brand-lockup">
            <span className="brand-mark">s</span>
            <span>smarthire</span>
          </Link>
          <Link to="/" className="form-link">Back to SmartHire</Link>
        </header>
        <h1 className="legal-title">{title}</h1>
        <div className="legal-body">{children}</div>
      </div>
    </main>
  )
}

export function Privacy() {
  const { config: c } = useAuth()
  const co = c.company_name || 'SmartHire AI'
  return (
    <Page title="Privacy notice">
      <p>This notice explains what {co} collects when you use this interview practice and assessment platform, why, and the choices you have. It is written to meet the Digital Personal Data Protection Act, 2023 (India) and GDPR principles.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, role, and a hashed password (or your Google account email if you sign in with Google).</li>
        <li>Resumes you upload, and the skills, education and experience we extract from them.</li>
        <li>Interview answers: the transcript of what you say, timing, and the scores and feedback we produce.</li>
        <li>Audio of each answer, kept only to improve transcription accuracy.</li>
        <li>Camera signals: eye contact, head position and expression are measured in your own browser. Only summary numbers (for example "looked at the camera 72% of the time") are sent to us. Video is uploaded only if you choose to save a recording.</li>
        <li>Basic security logs: sign-ins and important account actions.</li>
      </ul>
      <h2>Why we use it</h2>
      <p>To run practice interviews, score them, show your progress, and, if a recruiter assigned you an interview, share your report with that recruiter. We do not sell your data or use it for advertising.</p>
      <h2>Automated scoring</h2>
      <p>Scores are produced automatically. They are a coaching aid and should not be the only basis of a hiring decision. You can ask for a human review of any report by writing to us.</p>
      <h2>Service providers</h2>
      <p>Depending on how this platform is configured, answer text and audio may be processed by an AI provider (for example Groq, OpenAI or Anthropic) to write questions, grade answers and transcribe speech, and files may be stored with a cloud storage provider. These providers process data on our instructions.</p>
      <h2>How long we keep it</h2>
      <ul>
        <li>Answer audio: {c.retention?.audio_days ?? 30} days, then deleted automatically.</li>
        <li>Saved video recordings: {c.retention?.recording_days ?? 90} days, then deleted automatically.</li>
        <li>Account, resumes, transcripts and reports: until you delete them or your account.</li>
      </ul>
      <h2>Your rights</h2>
      <p>From your Account page you can download all your data and permanently delete your account. You can also withdraw consent, correct your details, or raise a grievance by emailing {c.support_email}. Grievance officer: {c.grievance_officer}. We respond within 30 days.</p>
      <p className="legal-note">Template notice. Have it reviewed by your legal counsel before public launch.</p>
    </Page>
  )
}

export function Terms() {
  const { config: c } = useAuth()
  const co = c.company_name || 'SmartHire AI'
  return (
    <Page title="Terms of use">
      <p>By using {co} you agree to these terms.</p>
      <h2>Using the service</h2>
      <ul>
        <li>Use your own identity and your own answers. Do not upload resumes or recordings of other people without their permission.</li>
        <li>Do not attempt to break, overload or reverse engineer the service, or access other users' data.</li>
        <li>Recruiters may use reports only for the hiring process the candidate applied to, and must not rely on automated scores alone.</li>
      </ul>
      <h2>Your content</h2>
      <p>You keep ownership of your resume, answers and recordings. You give {co} permission to process them to provide the service.</p>
      <h2>No guarantee</h2>
      <p>Scores and feedback are estimates produced by software. They can be wrong and do not guarantee any interview or hiring outcome.</p>
      <h2>Accounts</h2>
      <p>We may suspend accounts that misuse the service. You can delete your account at any time from the Account page.</p>
      <h2>Contact</h2>
      <p>{c.support_email}</p>
      <p className="legal-note">Template terms. Have them reviewed by your legal counsel before public launch.</p>
    </Page>
  )
}
