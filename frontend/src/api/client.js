/**
 * HTTP client dùng chung (axios/fetch).
 * Gắn baseURL + JWT khi có API backend.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function getApiBaseUrl() {
  return API_BASE_URL
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = localStorage.getItem('access_token')
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { ...options, headers })
  return response
}
