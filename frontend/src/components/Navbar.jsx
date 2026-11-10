import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className='bg-slate-900 text-white'>
      <div className='mx-auto flex max-w-5xl items-center justify-between px-4 py-3'>
        <span className='text-lg font-semibold'>SmartHire AI</span>
        <div className='flex items-center gap-4 text-sm'>
          <span className='text-slate-300'>{user?.email} ({user?.role})</span>
          <button onClick={handleLogout} className='rounded bg-indigo-500 px-3 py-1 hover:bg-indigo-400'>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}