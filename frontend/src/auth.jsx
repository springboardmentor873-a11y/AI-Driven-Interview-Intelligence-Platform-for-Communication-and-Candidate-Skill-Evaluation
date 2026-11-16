import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, tokenStore } from './api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({})

  useEffect(() => {
    api.get('/api/auth/config').then((r) => setConfig(r.data)).catch(() => {})
    if (!tokenStore.get()) { setLoading(false); return }
    api.get('/api/auth/me').then((r) => setUser(r.data)).catch(() => tokenStore.clear()).finally(() => setLoading(false))
  }, [])

  const accept = useCallback((data) => { tokenStore.set(data.access_token); setUser(data.user); return data.user }, [])
  const login = useCallback(async (email, password) => accept((await api.post('/api/auth/login', { email, password })).data), [accept])
  const register = useCallback(async (payload) => accept((await api.post('/api/auth/register', payload)).data), [accept])
  const google = useCallback(async (credential, consent = false) => accept((await api.post('/api/auth/google', { credential, consent })).data), [accept])
  const logout = useCallback(() => { tokenStore.clear(); setUser(null) }, [])

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, config, login, register, google, logout, accept }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)

export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'recruiter' ? '/recruiter' : '/dashboard')
