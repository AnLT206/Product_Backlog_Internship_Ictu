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
  if (!user) return;
  const isApp =
    (user.email || '').toLowerCase().includes('ungvien') ||
    (user.code || '').toUpperCase() === 'UV0001' ||
    user.id === 7 ||
    user.role === 'applicant';
  const roleKey = isApp ? 'applicant' : (user.role || 'intern');

  if (access_token) {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem(`access_token_${roleKey}`, access_token);
  }
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem(`auth_user_${roleKey}`, JSON.stringify(user));

  if (roleKey === 'applicant' || roleKey === 'intern') {
    localStorage.setItem('last_portal_intern_role', roleKey);
  }
}

export function clearSession(roleKey) {
  if (roleKey) {
    localStorage.removeItem(`access_token_${roleKey}`);
    localStorage.removeItem(`auth_user_${roleKey}`);
    return;
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('access_token_applicant');
  localStorage.removeItem('auth_user_applicant');
  localStorage.removeItem('access_token_intern');
  localStorage.removeItem('auth_user_intern');
  localStorage.removeItem('access_token_hr');
  localStorage.removeItem('auth_user_hr');
  localStorage.removeItem('access_token_mentor');
  localStorage.removeItem('auth_user_mentor');
  localStorage.removeItem('access_token_admin');
  localStorage.removeItem('auth_user_admin');
}

export function readStoredUser() {
  try {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    // 1. Phân hệ HR (/hr/*)
    if (path.startsWith('/hr')) {
      const hrRaw = localStorage.getItem('auth_user_hr');
      if (hrRaw) return JSON.parse(hrRaw);
    }

    // 2. Phân hệ Admin (/admin/*)
    if (path.startsWith('/admin')) {
      const adminRaw = localStorage.getItem('auth_user_admin');
      if (adminRaw) return JSON.parse(adminRaw);
    }

    // 3. Phân hệ Mentor (/mentor/*)
    if (path.startsWith('/mentor')) {
      const mentorRaw = localStorage.getItem('auth_user_mentor');
      if (mentorRaw) return JSON.parse(mentorRaw);
    }

    // 4. Phân hệ TTS / Ứng viên (/intern/*)
    if (path.startsWith('/intern')) {
      const lastInternRole = localStorage.getItem('last_portal_intern_role');
      if (lastInternRole === 'applicant') {
        const appRaw = localStorage.getItem('auth_user_applicant');
        if (appRaw) return JSON.parse(appRaw);
      } else if (lastInternRole === 'intern') {
        const internRaw = localStorage.getItem('auth_user_intern');
        if (internRaw) return JSON.parse(internRaw);
      }

      if (path === '/intern/upload') {
        const appRaw = localStorage.getItem('auth_user_applicant');
        if (appRaw) return JSON.parse(appRaw);
      }

      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.role === 'intern' || (u?.email || '').includes('ungvien')) {
          return u;
        }
      }

      // Nếu auth_user là role khác (HR/Admin mở tab khác), không ghi đè sang /intern/*
      const appRaw = localStorage.getItem('auth_user_applicant');
      if (appRaw) return JSON.parse(appRaw);
      const internRaw = localStorage.getItem('auth_user_intern');
      if (internRaw) return JSON.parse(internRaw);
    }

    // 5. Mặc định
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

/**
 * POST /api/auth/register
 * Đăng ký tài khoản TTS mới.
 *
 * Backend ĐÃ CÓ THẬT — KHÔNG mock.
 *
 * @param {{
 *   full_name:     string,
 *   email:         string,
 *   password:      string,
 *   confirm_password: string,
 *   phone_number?: string,
 *   dob?:          string,
 *   gender?:       string,
 *   university?:   string,
 *   major?:        string,
 *   academic_year?: string,
 *   gpa?:          number,
 *   address?:      string,
 * }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *   201 → { id, full_name, email, role, ... }
 *   409 → { detail: "Email đã tồn tại." }
 *   422 → { detail: [{ loc, msg, type }, ...] }
 *
 * @example
 * const { ok, status, data } = await registerIntern({ full_name, email, password, confirm_password });
 */
export async function registerIntern(payload) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /api/auth/me
 * Cập nhật thông tin cá nhân.
 * @param {object} payload
 */
export async function updateMyProfile(payload) {
  return apiFetch('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/auth/change-password
 * Đổi mật khẩu tài khoản.
 * @param {{ current_password: string, new_password: string, confirm_password: string }} payload
 */
export async function changePassword(payload) {
  return apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

