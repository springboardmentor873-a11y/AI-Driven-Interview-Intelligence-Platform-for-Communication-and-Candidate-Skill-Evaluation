import axios from 'axios'

const TOKEN_KEY = 'smarthire_token'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
}

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      tokenStore.clear()
      if (!location.pathname.startsWith('/login')) location.assign('/login')
    }
    return Promise.reject(err)
  },
)

export function errorText(err, fallback = 'Something went wrong. Try again.') {
  const d = err?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => `${x.loc?.slice(-1)[0] ?? ''}: ${x.msg}`).join('; ')
  if (err?.message === 'Network Error') return 'Cannot reach SmartHire. If it runs on this computer, double-click the SmartHire AI icon on your Desktop to start it, then try again.'
  return fallback
}

export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 2000)
}
