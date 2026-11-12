import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

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
    errors[name] && <p className='mt-1.5 text-xs text-clay'>{[].concat(errors[name]).join(' ')}</p>

  return (
    <AuthLayout heading='Create your account' sub='Candidate sign-up takes less than a minute.'>
      <form onSubmit={handleSubmit} className='space-y-5'>
        <div>
          <label className='mb-1.5 block text-sm font-semibold'>Username</label>
          <input required value={form.username} onChange={update('username')} className='field' />
          {fieldError('username')}
        </div>

        <div>
          <label className='mb-1.5 block text-sm font-semibold'>Email</label>
          <input type='email' required value={form.email} onChange={update('email')} className='field' />
          {fieldError('email')}
        </div>

        <div>
          <label className='mb-1.5 block text-sm font-semibold'>Password (at least 8 characters)</label>
          <input type='password' required minLength={8} value={form.password} onChange={update('password')} className='field' />
          {fieldError('password')}
          {fieldError('detail')}
        </div>

        <button type='submit' disabled={busy} className='btn-primary w-full'>
          {busy ? 'Creating...' : 'Create account'}
        </button>
      </form>

      <p className='mt-6 text-sm text-ink/65'>
        Already registered?{' '}
        <Link to='/login' className='font-semibold text-moss underline underline-offset-4'>
          Sign in
        </Link>
      </p>
      <p className='mt-3 text-xs text-ink/50'>Recruiter and admin accounts are created by an administrator.</p>
    </AuthLayout>
  )
}