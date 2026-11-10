
const API_BASE_URL = 'http://127.0.0.1:8000'

export async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Registration failed')
  }

  return data
}


export async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...credentials,
      role: credentials.role || 'candidate',
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Login failed')
  }

  localStorage.setItem('smarthire_token', data.access_token)

  return data
}


export async function getCurrentUser() {
  const token = localStorage.getItem('smarthire_token')

  if (!token) {
    throw new Error('Please log in to continue')
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    localStorage.removeItem('smarthire_token')
    throw new Error(data.detail || 'Unable to load profile')
  }

  return data
}

export function logoutUser() {
  localStorage.removeItem('smarthire_token')
}
