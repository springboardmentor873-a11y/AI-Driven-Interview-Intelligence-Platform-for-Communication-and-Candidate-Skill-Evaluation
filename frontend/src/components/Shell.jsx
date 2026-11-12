import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function Shell({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = () => {
    logout()
    navigate('/login')
  }

  const initial = (user?.username || '?').charAt(0).toUpperCase()

  return (
    <div className='min-h-screen bg-paper font-sans text-ink'>
      <header className='sticky top-0 z-10 border-b border-sand bg-paper/90 backdrop-blur'>
        <div className='mx-auto flex max-w-6xl items-center justify-between px-5 py-3'>
          <Logo />
          <div className='flex items-center gap-3'>
            <div className='hidden text-right sm:block'>
              <p className='text-sm font-semibold leading-tight'>{user?.username}</p>
              <p className='text-xs capitalize text-ink/60'>{user?.role}</p>
            </div>
            <div className='grid h-9 w-9 place-items-center rounded-full bg-moss font-display text-base font-semibold text-paper'>
              {initial}
            </div>
            <button
              onClick={signOut}
              className='rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium transition hover:bg-ink hover:text-paper'
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-6xl px-5 py-10'>
        <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h1 className='font-display text-4xl font-semibold tracking-tight sm:text-5xl'>{title}</h1>
            {subtitle && <p className='mt-2 max-w-xl text-ink/70'>{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  )
}