import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    <div className='flex min-h-screen items-center justify-center bg-slate-100 px-4'>
      <form onSubmit={handleSubmit} className='w-full max-w-sm rounded-xl bg-white p-8 shadow'>
        <h1 className='mb-1 text-2xl font-bold text-slate-900'>SmartHire AI</h1>
        <p className='mb-6 text-sm text-slate-500'>Sign in to continue your interview practice</p>

        {error && <p className='mb-4 rounded bg-red-50 p-2 text-sm text-red-700'>{error}</p>}

        <label className='mb-1 block text-sm font-medium text-slate-700'>Email</label>
        <input
          type='email'
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none'
        />

        <label className='mb-1 block text-sm font-medium text-slate-700'>Password</label>
        <input
          type='password'
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none'
        />

        <button
          type='submit'
          disabled={busy}
          className='w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60'
        >
          {busy ? 'Signing in...' : 'Sign in'}
        </button>

        <p className='mt-4 text-center text-sm text-slate-500'>
          New here? <Link to='/register' className='text-indigo-600 hover:underline'>Create an account</Link>
        </p>
      </form>
    </div>
  )
}