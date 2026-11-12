import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your email and password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout heading='Welcome back' sub='Sign in to pick up where you left off.'>
      <form onSubmit={handleSubmit} className='space-y-5'>
        {error && <p className='rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay'>{error}</p>}

        <div>
          <label className='mb-1.5 block text-sm font-semibold'>Email</label>
          <input type='email' required value={email} onChange={(e) => setEmail(e.target.value)} className='field' />
        </div>

        <div>
          <label className='mb-1.5 block text-sm font-semibold'>Password</label>
          <input type='password' required value={password} onChange={(e) => setPassword(e.target.value)} className='field' />
        </div>

        <button type='submit' disabled={busy} className='btn-primary w-full'>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className='mt-6 text-sm text-ink/65'>
        New to SmartHire?{' '}
        <Link to='/register' className='font-semibold text-moss underline underline-offset-4'>
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}