import { Navigate, Route, Routes } from 'react-router-dom'
import { homeFor, useAuth } from './auth'
import { Spinner } from './components/ui'
import { Login, Register } from './pages/Auth'
import { Privacy, Terms } from './pages/Legal'
import { ForgotPassword, ResetPassword } from './pages/Password'

function Protected({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="mx-auto max-w-6xl px-4"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return children
}

// Placeholder landing for each role's home route (feature pages arrive in later milestones).
function Home() {
  const { user, logout } = useAuth()
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Welcome, {user.name}</h1>
      <p className="mt-1 text-muted">Signed in as {user.role} ({user.email}).</p>
      <button className="btn-quiet mt-6" onClick={logout}>Sign out</button>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={homeFor(user.role)} /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
      <Route path="/dashboard" element={<Protected roles={['candidate']}><Home /></Protected>} />
      <Route path="/recruiter" element={<Protected roles={['recruiter', 'admin']}><Home /></Protected>} />
      <Route path="/admin" element={<Protected roles={['admin']}><Home /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
