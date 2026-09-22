/**
 * API auth — bổ sung register/login khi có backend.
 */
import { apiFetch } from './client.js'

export async function login(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return res
}

export async function register(payload) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res
}
