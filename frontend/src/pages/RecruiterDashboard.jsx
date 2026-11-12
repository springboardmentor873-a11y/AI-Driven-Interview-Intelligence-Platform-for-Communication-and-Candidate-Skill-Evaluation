import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import Shell from '../components/Shell'
import StatCard from '../components/StatCard'

export default function RecruiterDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/dashboard/').then((r) => setStats(r.data))
  }, [])

  return (
    <Shell title={`Welcome, ${user?.username}`} subtitle='Your recruiter workspace.'>
      <div className='mb-8 grid gap-4 sm:grid-cols-3'>
        <StatCard label='Candidates on the platform' value={stats?.candidates} tone='sand' />
        <StatCard label='Interviews' value={stats?.interviews} tone='moss' />
        <StatCard label='Assessments' value={stats?.assessments} tone='saffron' />
      </div>

      <div className='rounded-3xl bg-ink p-8 text-paper'>
        <span className='rounded-full bg-saffron px-3 py-1 text-xs font-bold text-ink'>Coming next</span>
        <h3 className='mt-4 font-display text-3xl font-semibold'>Candidate review tools</h3>
        <p className='mt-2 max-w-xl text-paper/70'>
          Interview templates, candidate reports and side-by-side comparison arrive in the next milestones.
        </p>
      </div>
    </Shell>
  )
}