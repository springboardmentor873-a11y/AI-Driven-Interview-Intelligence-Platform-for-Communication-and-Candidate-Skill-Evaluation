import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import CandidateDashboard from './pages/CandidateDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'

function Home() {
  const { user, loading } = useAuth()
  if (loading) return <p className='p-8'>Loading...</p>
  if (!user) return <Navigate to='/login' replace />
  return <Navigate to={user.role === 'candidate' ? '/candidate' : '/recruiter'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/candidate' element={
            <ProtectedRoute roles={['candidate']}><CandidateDashboard /></ProtectedRoute>
          } />
          <Route path='/recruiter' element={
            <ProtectedRoute roles={['recruiter', 'admin']}><RecruiterDashboard /></ProtectedRoute>
          } />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}