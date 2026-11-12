import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import Shell from '../components/Shell'
import StatCard from '../components/StatCard'
import RoleBadge from '../components/RoleBadge'

const tabs = [
  ['all', 'Everyone'],
  ['candidate', 'Candidates'],
  ['recruiter', 'Recruiters'],
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')

  const load = async () => {
    const [d, u] = await Promise.all([api.get('/dashboard/'), api.get('/admin/users/')])
    setStats(d.data)
    setUsers(u.data)
  }

  useEffect(() => {
    load()
  }, [])

  const countOf = (key) => (key === 'all' ? users.length : users.filter((u) => u.role === key).length)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(
      (u) =>
        (tab === 'all' || u.role === tab) &&
        (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }, [users, tab, query])

  const createRecruiter = async (e) => {
    e.preventDefault()
    setErrors({})
    setNotice('')
    try {
      await api.post('/admin/recruiters/', form)
      setForm({ username: '', email: '', password: '' })
      setShowForm(false)
      setNotice('Recruiter account created.')
      load()
    } catch (err) {
      setErrors(err.response?.data || { detail: 'Could not create the account.' })
    }
  }

  const fieldError = (name) =>
    errors[name] && <p className='mt-1 text-xs text-clay'>{[].concat(errors[name]).join(' ')}</p>

  return (
    <Shell
      title='Admin console'
      subtitle='Everyone on the platform, in one place.'
      actions={
        <button onClick={() => setShowForm(!showForm)} className='btn-primary'>
          {showForm ? 'Close' : '+ Add recruiter'}
        </button>
      }
    >
      <div className='mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard label='Candidates' value={stats?.candidates} tone='sand' />
        <StatCard label='Recruiters' value={stats?.recruiters} tone='moss' />
        <StatCard label='Interviews' value={stats?.interviews} tone='saffron' />
        <StatCard label='Assessments' value={stats?.assessments} tone='clay' />
      </div>

      {notice && <p className='mb-4 rounded-xl bg-moss/10 px-4 py-3 text-sm text-moss'>{notice}</p>}

      {showForm && (
        <form onSubmit={createRecruiter} className='mb-8 rounded-3xl bg-sand/60 p-6'>
          <h3 className='mb-4 font-display text-2xl font-semibold'>New recruiter account</h3>
          <div className='grid gap-4 sm:grid-cols-3'>
            <div>
              <input
                required
                placeholder='Username'
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className='field'
              />
              {fieldError('username')}
            </div>
            <div>
              <input
                required
                type='email'
                placeholder='Email'
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className='field'
              />
              {fieldError('email')}
            </div>
            <div>
              <input
                required
                type='password'
                minLength={8}
                placeholder='Password (min 8)'
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className='field'
              />
              {fieldError('password')}
            </div>
          </div>
          {fieldError('detail')}
          <button type='submit' className='btn-primary mt-5'>
            Create recruiter
          </button>
        </form>
      )}

      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex gap-2'>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === key ? 'bg-ink text-paper' : 'bg-sand/70 text-ink hover:bg-sand'
              }`}
            >
              {label} <span className='opacity-60'>{countOf(key)}</span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search name or email'
          className='field max-w-xs'
        />
      </div>

      <div className='overflow-x-auto rounded-3xl bg-white/70'>
        <table className='w-full min-w-[640px] text-left text-sm'>
          <thead>
            <tr className='border-b border-sand text-xs uppercase tracking-wide text-ink/50'>
              <th className='px-6 py-4 font-semibold'>User</th>
              <th className='px-6 py-4 font-semibold'>Email</th>
              <th className='px-6 py-4 font-semibold'>Role</th>
              <th className='px-6 py-4 font-semibold'>Joined</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className='px-6 py-8 text-center text-ink/50'>
                  No users match.
                </td>
              </tr>
            )}
            {visible.map((u) => (
              <tr key={u.id} className='border-b border-sand/60 last:border-0'>
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-3'>
                    <span className='grid h-9 w-9 place-items-center rounded-full bg-moss font-display text-paper'>
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                    <span className='font-semibold'>{u.username}</span>
                  </div>
                </td>
                <td className='px-6 py-4 text-ink/70'>{u.email}</td>
                <td className='px-6 py-4'>
                  <RoleBadge role={u.role} />
                </td>
                <td className='px-6 py-4 text-ink/60'>{new Date(u.date_joined).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  )
}