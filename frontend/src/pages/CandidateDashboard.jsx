import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import { useAuth } from '../context/AuthContext'
import Shell from '../components/Shell'
import StatCard from '../components/StatCard'
import ResumeDetails from '../components/ResumeDetails'
import { categoryLabel, difficultyLabel, resumeStatusLabel, resumeStatusStyle, sessionStatusLabel } from '../labels'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const uploadMessage = {
  parsed: { type: 'ok', text: 'Resume uploaded and read. Your skills are shown below.' },
  no_text: { type: 'error', text: 'Resume uploaded, but no text was found. It looks like a scanned PDF and OCR is not supported yet.' },
  failed: { type: 'error', text: 'Resume uploaded, but we could not read the PDF.' },
  template: { type: 'error', text: 'This looks like an unfilled template. Please fill in your details and upload again.' },
}

const HISTORY_LIMIT = 8

// A small error for one section of the page, with its own Retry button.
// `dark` is for use on the dark "practice history" panel.
function SectionError({ message, onRetry, dark = false }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ${dark ? 'bg-paper/10 text-paper' : 'bg-clay/10 text-clay'}`}>
      <p>{message}</p>
      <button
        type='button'
        onClick={onRetry}
        className={`mt-1 font-semibold underline underline-offset-4 ${dark ? 'text-saffron' : ''}`}
      >
        Retry
      </button>
    </div>
  )
}

export default function CandidateDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [resumes, setResumes] = useState([])
  const [resumesError, setResumesError] = useState('')
  const [interviews, setInterviews] = useState([])
  const [interviewsError, setInterviewsError] = useState('')
  const [message, setMessage] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const inputRef = useRef(null)

  // Each section loads and fails on its own - one going wrong never hides the others.
  const loadStats = () =>
    api
      .get('/dashboard/')
      .then((r) => {
        setStats(r.data)
        setStatsError('')
      })
      .catch((err) => setStatsError(errorText(err, 'We could not load your stats.')))

  const loadResumes = () =>
    api
      .get('/resumes/')
      .then((r) => {
        setResumes(r.data)
        setResumesError('')
      })
      .catch((err) => setResumesError(errorText(err, 'We could not load your resumes.')))

  const loadInterviews = () =>
    api
      .get('/interviews/')
      .then((r) => {
        setInterviews(r.data)
        setInterviewsError('')
      })
      .catch((err) => setInterviewsError(errorText(err, 'We could not load your practice history.')))

  // Used after an upload or a delete: the resume list is reloaded, and if that
  // first attempt fails it is retried once more before showing an error, so a
  // short network hiccup right after a successful action doesn't look like a problem.
  const reloadResumesWithRetry = () =>
    api
      .get('/resumes/')
      .then((r) => {
        setResumes(r.data)
        setResumesError('')
      })
      .catch(() =>
        api
          .get('/resumes/')
          .then((r) => {
            setResumes(r.data)
            setResumesError('')
          })
          .catch((err) => setResumesError(errorText(err, 'We could not load your resumes.')))
      )

  useEffect(() => {
    Promise.allSettled([loadStats(), loadResumes(), loadInterviews()])
  }, [])

  const updateResume = (updated) =>
    setResumes((all) => all.map((item) => (item.id === updated.id ? updated : item)))

  const uploadFile = async (file) => {
    if (!file) return
    setBusy(true)
    setMessage(null)
    const body = new FormData()
    body.append('file', file)
    try {
      const { data } = await api.post('/resumes/', body)
      // The upload itself succeeded - say so, no matter what happens next.
      setMessage(uploadMessage[data.status] || { type: 'ok', text: 'Resume uploaded.' })
      await reloadResumesWithRetry()
      loadStats()
    } catch (err) {
      setMessage({ type: 'error', text: errorText(err, 'Upload failed.') })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const deleteResume = async (id) => {
    setConfirmDeleteId(null)
    setMessage(null)
    try {
      await api.delete(`/resumes/${id}/`)
      setMessage({ type: 'ok', text: 'Resume deleted.' })
      await reloadResumesWithRetry()
      loadStats()
    } catch (err) {
      setMessage({ type: 'error', text: errorText(err, 'We could not delete this resume.') })
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    uploadFile(e.dataTransfer.files[0])
  }

  return (
    <Shell
      title={`${greeting()}, ${user?.username}`}
      subtitle='Upload your resume, then practise with a timed mock interview.'
      actions={
        <Link to='/candidate/new' className='btn-primary'>
          Start practice interview
        </Link>
      }
    >
      <div className='mb-8 grid gap-4 sm:grid-cols-3'>
        {statsError ? (
          <div className='sm:col-span-3'>
            <SectionError message={statsError} onRetry={loadStats} />
          </div>
        ) : (
          <>
            <StatCard label='Resumes uploaded' value={stats?.resumes} tone='sand' />
            <StatCard label='Practice interviews' value={stats?.interviews} tone='moss' />
            <StatCard label='Assessments' value={stats?.assessments} tone='saffron' />
          </>
        )}
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <section className='lg:col-span-2'>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
              dragging ? 'border-moss bg-moss/5' : 'border-ink/20 bg-white/60 hover:border-moss'
            }`}
          >
            <input
              ref={inputRef}
              type='file'
              accept='application/pdf'
              className='hidden'
              onChange={(e) => uploadFile(e.target.files[0])}
            />
            <p className='font-display text-2xl font-semibold'>
              {busy ? 'Reading your resume with AI...' : 'Drop your resume here'}
            </p>
            <p className='mt-1 text-sm text-ink/60'>
              {busy ? 'This can take up to 30 seconds.' : 'or click to browse. PDF only, up to 5 MB.'}
            </p>
          </div>

          {message && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                message.type === 'ok' ? 'bg-moss/10 text-moss' : 'bg-clay/10 text-clay'
              }`}
            >
              {message.text}
            </p>
          )}

          <h2 className='mb-3 mt-8 font-display text-2xl font-semibold'>Your resumes</h2>
          {resumesError ? (
            <SectionError message={resumesError} onRetry={loadResumes} />
          ) : (
            <ul className='space-y-3'>
              {resumes.length === 0 && (
                <li className='rounded-2xl bg-sand/60 px-5 py-4 text-sm text-ink/60'>Nothing here yet. Upload your first one above.</li>
              )}
              {resumes.map((r) => (
                <li key={r.id} className='rounded-2xl bg-white/70 px-5 py-4'>
                  <div className='flex items-center gap-4'>
                    <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-clay text-xs font-bold text-paper'>PDF</span>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-semibold'>{r.original_name}</p>
                      <p className='text-xs text-ink/55'>{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${resumeStatusStyle[r.status] || resumeStatusStyle.uploaded}`}
                    >
                      {resumeStatusLabel[r.status] || r.status}
                    </span>
                  </div>
                  <ResumeDetails resume={r} onUpdated={updateResume} />
                  <div className='mt-3 flex flex-wrap items-center gap-3 text-sm'>
                    {confirmDeleteId === r.id ? (
                      <>
                        <span className='font-semibold'>Delete this resume for good?</span>
                        <button
                          onClick={() => deleteResume(r.id)}
                          className='rounded-full bg-clay px-4 py-1 font-semibold text-paper transition hover:opacity-90'
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className='rounded-full border border-ink/20 px-4 py-1 font-medium transition hover:bg-ink hover:text-paper'
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className='font-semibold text-clay underline underline-offset-4'
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className='h-fit rounded-3xl bg-ink p-7 text-paper'>
          <h3 className='font-display text-2xl font-semibold'>Practice history</h3>
          {interviewsError ? (
            <div className='mt-4'>
              <SectionError message={interviewsError} onRetry={loadInterviews} dark />
            </div>
          ) : interviews.length === 0 ? (
            <p className='mt-2 text-sm text-paper/70'>
              No interviews yet. Press Start practice interview to create your first one.
            </p>
          ) : (
            <ul className='mt-4 space-y-3'>
              {interviews.slice(0, HISTORY_LIMIT).map((s) => {
                const open = s.status === 'created' || s.status === 'in_progress'
                return (
                  <li key={s.id} className='rounded-2xl bg-paper/10 p-4'>
                    <p className='font-semibold'>
                      {s.domain || categoryLabel[s.category]}
                      <span className='font-normal text-paper/60'> · {difficultyLabel[s.difficulty]}</span>
                    </p>
                    <p className='mt-0.5 text-xs text-paper/60'>
                      {sessionStatusLabel[s.status] || s.status} · {s.answered_count}/{s.num_questions} answered
                    </p>
                    <p className='text-xs text-paper/50'>{new Date(s.created_at).toLocaleDateString()}</p>
                    <Link
                      to={`/interview/${s.id}`}
                      className='mt-2 inline-block text-sm font-semibold text-saffron underline underline-offset-4'
                    >
                      {open ? 'Continue' : 'Review'}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {interviews.length > HISTORY_LIMIT && (
            <p className='mt-3 text-xs text-paper/50'>Showing your latest {HISTORY_LIMIT} interviews.</p>
          )}
        </aside>
      </div>
    </Shell>
  )
}
