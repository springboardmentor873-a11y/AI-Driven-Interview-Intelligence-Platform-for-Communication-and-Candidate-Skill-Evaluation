import { useEffect, useState } from 'react'
import api from '../api/client'
import Navbar from '../components/Navbar'

export default function RecruiterDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/dashboard/').then((r) => setStats(r.data))
  }, [])

  return (
    <div className='min-h-screen bg-slate-100'>
      <Navbar />
      <main className='mx-auto max-w-5xl px-4 py-8'>
        <h2 className='mb-4 text-xl font-semibold text-slate-900'>Recruiter / Admin Dashboard</h2>
        <div className='grid gap-4 sm:grid-cols-3'>
          {[['Candidates', stats?.candidates], ['Interviews', stats?.interviews], ['Assessments', stats?.assessments]].map(([label, value]) => (
            <div key={label} className='rounded-xl bg-white p-5 shadow'>
              <p className='text-sm text-slate-500'>{label}</p>
              <p className='text-3xl font-bold text-slate-900'>{value ?? '-'}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}