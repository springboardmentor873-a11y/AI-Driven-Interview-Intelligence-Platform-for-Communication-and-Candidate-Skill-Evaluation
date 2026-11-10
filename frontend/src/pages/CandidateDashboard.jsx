import { useEffect, useState } from 'react'
import api from '../api/client'
import Navbar from '../components/Navbar'

export default function CandidateDashboard() {
  const [stats, setStats] = useState(null)
  const [resumes, setResumes] = useState([])
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    const [d, r] = await Promise.all([api.get('/dashboard/'), api.get('/resumes/')])
    setStats(d.data)
    setResumes(r.data)
  }

  useEffect(() => {
    load()
  }, [])

 const upload = async (e) => {
  e.preventDefault()
  if (!file) {
    setMessage('Please choose a PDF file first.')
    return
  }
  const form = e.target
  const body = new FormData()
  body.append('file', file)
  try {
    await api.post('/resumes/', body)
    setMessage('Resume uploaded.')
    setFile(null)
    form.reset()
    load()
  } catch (err) {
    console.error('Upload error:', err)
    if (!err.response) {
      setMessage('Cannot reach the server. Check that Django is running and CORS / VITE_API_BASE_URL are correct.')
    } else {
      const d = err.response.data
      setMessage(`Error ${err.response.status}: ` + (d?.file?.[0] || d?.detail || 'Upload failed.'))
    }
  }
}
  const Card = ({ label, value }) => (
    <div className='rounded-xl bg-white p-5 shadow'>
      <p className='text-sm text-slate-500'>{label}</p>
      <p className='text-3xl font-bold text-slate-900'>{value ?? '-'}</p>
    </div>
  )

  return (
    <div className='min-h-screen bg-slate-100'>
      <Navbar />
      <main className='mx-auto max-w-5xl px-4 py-8'>
        <h2 className='mb-4 text-xl font-semibold text-slate-900'>Candidate Dashboard</h2>

        <div className='mb-8 grid gap-4 sm:grid-cols-3'>
          <Card label='Resumes' value={stats?.resumes} />
          <Card label='Interviews' value={stats?.interviews} />
          <Card label='Assessments' value={stats?.assessments} />
        </div>

        <section className='rounded-xl bg-white p-6 shadow'>
          <h3 className='mb-3 font-semibold text-slate-900'>Upload resume (PDF, max 5 MB)</h3>
          <form onSubmit={upload} className='flex flex-wrap items-center gap-3'>
            <input type='file' accept='application/pdf' onChange={(e) => setFile(e.target.files[0])} />
            <button className='rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500'>Upload</button>
          </form>
          {message && <p className='mt-3 text-sm text-slate-600'>{message}</p>}

          <ul className='mt-5 divide-y'>
            {resumes.length === 0 && <li className='py-2 text-sm text-slate-500'>No resumes yet.</li>}
            {resumes.map((r) => (
              <li key={r.id} className='flex justify-between py-2 text-sm'>
                <span>{r.original_name}</span>
                <span className='text-slate-500'>{r.status} - {new Date(r.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}