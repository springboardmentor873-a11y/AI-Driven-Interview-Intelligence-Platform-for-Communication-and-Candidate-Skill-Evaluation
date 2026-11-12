import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import Shell from '../components/Shell'
import StatCard from '../components/StatCard'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function CandidateDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [resumes, setResumes] = useState([])
  const [message, setMessage] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const load = async () => {
    const [d, r] = await Promise.all([api.get('/dashboard/'), api.get('/resumes/')])
    setStats(d.data)
    setResumes(r.data)
  }

  useEffect(() => {
    load()
  }, [])

  const uploadFile = async (file) => {
    if (!file) return
    setBusy(true)
    setMessage(null)
    const body = new FormData()
    body.append('file', file)
    try {
      await api.post('/resumes/', body)
      setMessage({ type: 'ok', text: 'Resume uploaded successfully.' })
      load()
    } catch (err) {
      if (!err.response) {
        setMessage({ type: 'error', text: 'Cannot reach the server. Is the backend running?' })
      } else {
        const d = err.response.data
        setMessage({ type: 'error', text: d?.file?.[0] || d?.detail || 'Upload failed.' })
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
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
      subtitle='Upload your resume and get ready for your first practice interview.'
    >
      <div className='mb-8 grid gap-4 sm:grid-cols-3'>
        <StatCard label='Resumes uploaded' value={stats?.resumes} tone='sand' />
        <StatCard label='Practice interviews' value={stats?.interviews} tone='moss' />
        <StatCard label='Assessments' value={stats?.assessments} tone='saffron' />
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
            <p className='font-display text-2xl font-semibold'>{busy ? 'Uploading...' : 'Drop your resume here'}</p>
            <p className='mt-1 text-sm text-ink/60'>or click to browse. PDF only, up to 5 MB.</p>
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
          <ul className='space-y-3'>
            {resumes.length === 0 && (
              <li className='rounded-2xl bg-sand/60 px-5 py-4 text-sm text-ink/60'>Nothing here yet. Upload your first one above.</li>
            )}
            {resumes.map((r) => (
              <li key={r.id} className='flex items-center gap-4 rounded-2xl bg-white/70 px-5 py-4'>
                <span className='grid h-11 w-11 place-items-center rounded-xl bg-clay text-xs font-bold text-paper'>PDF</span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-semibold'>{r.original_name}</p>
                  <p className='text-xs text-ink/55'>{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className='rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold capitalize text-moss'>{r.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className='h-fit rounded-3xl bg-ink p-7 text-paper'>
          <span className='rounded-full bg-saffron px-3 py-1 text-xs font-bold text-ink'>Coming next</span>
          <h3 className='mt-4 font-display text-2xl font-semibold'>Your interview room</h3>
          <p className='mt-2 text-sm text-paper/70'>
            AI questions based on your resume, voice answers and detailed feedback are being built in the next milestones.
          </p>
        </aside>
      </div>
    </Shell>
  )
}