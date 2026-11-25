// Turns an API error into ONE readable sentence for the user.
export function errorText(err, fallback = 'Something went wrong. Please try again.') {
  // No answer from the server at all (backend stopped, no internet)
  if (err?.request && !err.response) return 'Cannot reach the server. Is the backend running?'

  const data = err?.response?.data
  if (!data) return fallback

  // A plain short text. Long text is probably an HTML error page, so skip it.
  if (typeof data === 'string') return data.length < 200 && !data.trim().startsWith('<') ? data : fallback

  if (data.detail) return String(data.detail)

  // Field errors such as { file: ['Only PDF files are allowed.'] }
  const first = Object.values(data)[0]
  const message = Array.isArray(first) ? first[0] : first
  return typeof message === 'string' ? message : fallback
}
