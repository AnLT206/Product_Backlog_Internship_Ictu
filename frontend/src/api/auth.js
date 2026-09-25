/**
 * auth.js — API đăng nhập / phiên đăng nhập.
 */
import apiFetch from './client';

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} payload
 */
export async function login(payload) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/auth/me
 */
export async function getMe() {
  return apiFetch('/api/auth/me', { method: 'GET' });
}

export function saveSession({ access_token, user }) {
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('auth_user');
}

export function readStoredUser() {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Redirect path theo role (SRS §1.2). */
export function dashboardPathForRole(role) {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'hr':
      return '/hr/dashboard';
    case 'mentor':
      return '/mentor/dashboard';
    case 'intern':
      return '/intern/dashboard';
    default:
      return '/';
  }
}
