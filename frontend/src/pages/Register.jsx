import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setBusy(true)
    try {
      await register(form.username, form.email, form.password)
      navigate('/login')
    } catch (err) {
      setErrors(err.response?.data || { detail: 'Registration failed.' })
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (name) =>
    errors[name] && <p className='mt-1 text-xs text-red-600'>{[].concat(errors[name]).join(' ')}</p>

  return (
    <div className='flex min-h-screen items-center justify-center bg-slate-100 px-4'>
      <form onSubmit={handleSubmit} className='w-full max-w-sm rounded-xl bg-white p-8 shadow'>
        <h1 className='mb-6 text-2xl font-bold text-slate-900'>Create your account</h1>

        <label className='mb-1 block text-sm font-medium text-slate-700'>Username</label>
        <input required value={form.username} onChange={update('username')}
          className='w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none' />
        {fieldError('username')}

        <label className='mb-1 mt-4 block text-sm font-medium text-slate-700'>Email</label>
        <input type='email' required value={form.email} onChange={update('email')}
          className='w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none' />
        {fieldError('email')}

        <label className='mb-1 mt-4 block text-sm font-medium text-slate-700'>Password (min 8 characters)</label>
        <input type='password' required minLength={8} value={form.password} onChange={update('password')}
          className='w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none' />
        {fieldError('password')}
        {fieldError('detail')}

        <button type='submit' disabled={busy}
          className='mt-6 w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60'>
          {busy ? 'Creating...' : 'Register'}
        </button>

        <p className='mt-4 text-center text-sm text-slate-500'>
          Already registered? <Link to='/login' className='text-indigo-600 hover:underline'>Sign in</Link>
        </p>
      </form>
    </div>
  )
}