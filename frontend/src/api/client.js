import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const refresh = localStorage.getItem('refresh')
    const isTokenCall = original?.url?.includes('/auth/token/')

    if (error.response?.status === 401 && refresh && !original._retry && !isTokenCall) {
      original._retry = true
      try {
        const { data } = await axios.post(`${BASE}/auth/token/refresh/`, { refresh })
        localStorage.setItem('access', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch (e) {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api