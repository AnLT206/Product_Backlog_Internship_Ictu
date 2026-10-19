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
    user.role === 'applicant' ||
    user.status === 'pending' ||
    user.status === 'rejected' ||
    user.status === 'unsubmitted' ||
    user.profile_status === 'pending' ||
    user.profile_status === 'rejected';
  const roleKey = isApp ? 'applicant' : (user.role || 'intern');

  // Tab-level storage (sessionStorage) để cô lập tuyệt đối giữa các tab khi F5
  if (typeof window !== 'undefined' && window.sessionStorage) {
    if (access_token) {
      sessionStorage.setItem('access_token', access_token);
      sessionStorage.setItem('access_token_current', access_token);
      sessionStorage.setItem(`access_token_${roleKey}`, access_token);
    }
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    sessionStorage.setItem('auth_user_current', JSON.stringify(user));
    sessionStorage.setItem(`auth_user_${roleKey}`, JSON.stringify(user));
    if (user.code) {
      sessionStorage.setItem(`auth_user_${user.code.toLowerCase()}`, JSON.stringify(user));
    }
    if (roleKey === 'applicant' || roleKey === 'intern') {
      sessionStorage.setItem('last_portal_intern_role', roleKey);
    }
  }

  // Cross-tab fallback storage (localStorage)
  if (access_token) {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem(`access_token_${roleKey}`, access_token);
  }
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem(`auth_user_${roleKey}`, JSON.stringify(user));
  if (user.code) {
    localStorage.setItem(`auth_user_${user.code.toLowerCase()}`, JSON.stringify(user));
  }

  if (roleKey === 'applicant' || roleKey === 'intern') {
    localStorage.setItem('last_portal_intern_role', roleKey);
  }
}

export function clearSession(roleKey) {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    if (roleKey) {
      sessionStorage.removeItem(`access_token_${roleKey}`);
      sessionStorage.removeItem(`auth_user_${roleKey}`);
    } else {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token_current');
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_user_current');
      sessionStorage.removeItem('access_token_applicant');
      sessionStorage.removeItem('auth_user_applicant');
      sessionStorage.removeItem('access_token_intern');
      sessionStorage.removeItem('auth_user_intern');
      sessionStorage.removeItem('access_token_hr');
      sessionStorage.removeItem('auth_user_hr');
      sessionStorage.removeItem('access_token_mentor');
      sessionStorage.removeItem('auth_user_mentor');
      sessionStorage.removeItem('access_token_admin');
      sessionStorage.removeItem('auth_user_admin');
      sessionStorage.removeItem('last_portal_intern_role');
    }
  }

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
  localStorage.removeItem('applicant_onboarded');
  localStorage.removeItem('applicant_pending_contract');
  localStorage.removeItem('last_portal_intern_role');
}

export function readStoredUser() {
  try {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    // Khi ở trang /login hoặc /register, không tự động khôi phục phiên từ storage
    if (path === '/login' || path === '/register') {
      return null;
    }

    // 1. Phân hệ HR (/hr/*) — Cô lập tuyệt đối cho HR
    if (path.startsWith('/hr')) {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const curRaw = sessionStorage.getItem('auth_user_current');
        if (curRaw) {
          const parsed = JSON.parse(curRaw);
          if (parsed?.role === 'hr') return parsed;
        }
        const sHrRaw = sessionStorage.getItem('auth_user_hr');
        if (sHrRaw) {
          const parsed = JSON.parse(sHrRaw);
          if (parsed?.role === 'hr') return parsed;
        }
      }
      const hrRaw = localStorage.getItem('auth_user_hr');
      if (hrRaw) {
        const parsed = JSON.parse(hrRaw);
        if (parsed?.role === 'hr') return parsed;
      }
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.role === 'hr') return parsed;
      }
      return {
        id: 2,
        full_name: 'Trần Thị Mai (HR Manager)',
        code: 'HR0001',
        email: 'hr@ictu.edu.vn',
        role: 'hr',
        status: 'active',
      };
    }

    // 2. Phân hệ Admin (/admin/*) — Cô lập tuyệt đối cho Admin
    if (path.startsWith('/admin')) {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const curRaw = sessionStorage.getItem('auth_user_current');
        if (curRaw) {
          const parsed = JSON.parse(curRaw);
          if (parsed?.role === 'admin') return parsed;
        }
        const sAdminRaw = sessionStorage.getItem('auth_user_admin');
        if (sAdminRaw) {
          const parsed = JSON.parse(sAdminRaw);
          if (parsed?.role === 'admin') return parsed;
        }
      }
      const adminRaw = localStorage.getItem('auth_user_admin');
      if (adminRaw) {
        const parsed = JSON.parse(adminRaw);
        if (parsed?.role === 'admin') return parsed;
      }
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.role === 'admin') return parsed;
      }
      return {
        id: 1,
        full_name: 'Quản trị viên Hệ thống (Admin)',
        code: 'AD0001',
        email: 'admin@ictu.edu.vn',
        role: 'admin',
        status: 'active',
      };
    }

    // 3. Phân hệ Mentor (/mentor/*) — Cô lập và bảo toàn Mentor 1 vs Mentor 2 trên từng tab
    if (path.startsWith('/mentor')) {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const curRaw = sessionStorage.getItem('auth_user_current');
        if (curRaw) {
          const parsed = JSON.parse(curRaw);
          if (parsed?.role === 'mentor') return parsed;
        }
        const sMentorRaw = sessionStorage.getItem('auth_user_mentor');
        if (sMentorRaw) {
          const parsed = JSON.parse(sMentorRaw);
          if (parsed?.role === 'mentor') return parsed;
        }
      }
      const mentorRaw = localStorage.getItem('auth_user_mentor');
      if (mentorRaw) {
        const parsed = JSON.parse(mentorRaw);
        if (parsed?.role === 'mentor') return parsed;
      }
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.role === 'mentor') return parsed;
      }
      return {
        id: 3,
        full_name: 'Trần Hoàng Quân',
        code: 'MT0001',
        email: 'mentor@ictu.edu.vn',
        role: 'mentor',
        status: 'active',
        department: 'Kỹ thuật phần mềm (Software Engineering)',
      };
    }

    // 4. Phân hệ TTS / Ứng viên (/intern/*) — Cô lập giữa các TTS và Ứng viên
    if (path.startsWith('/intern')) {
      const lastInternRole =
        (typeof window !== 'undefined' && window.sessionStorage && sessionStorage.getItem('last_portal_intern_role')) ||
        localStorage.getItem('last_portal_intern_role');
      const isOnboarded = localStorage.getItem('applicant_onboarded') === 'true';

      // Đọc session của tab hiện tại
      let tabUser = null;
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const curRaw = sessionStorage.getItem('auth_user_current');
        if (curRaw) {
          const p = JSON.parse(curRaw);
          if (p?.role === 'intern' && !p.email?.includes('hr@') && !p.code?.startsWith('HR') && !p.code?.startsWith('AD')) {
            tabUser = p;
          }
        }
      }

      const isApplicantTab =
        tabUser &&
        ((tabUser.email || '').toLowerCase().includes('ungvien') ||
          tabUser.code === 'UV0001' ||
          tabUser.id === 7 ||
          tabUser.role === 'applicant' ||
          tabUser.status === 'pending' ||
          tabUser.status === 'rejected' ||
          tabUser.status === 'unsubmitted' ||
          tabUser.profile_status === 'pending' ||
          tabUser.profile_status === 'rejected');

      const isCandidateContext =
        !isOnboarded &&
        (isApplicantTab ||
          lastInternRole === 'applicant' ||
          path === '/intern/upload' ||
          (!localStorage.getItem('auth_user_intern') && Boolean(localStorage.getItem('auth_user_applicant'))));

      if (isCandidateContext) {
        if (isApplicantTab) return tabUser;

        const sAppRaw = typeof window !== 'undefined' && window.sessionStorage ? sessionStorage.getItem('auth_user_applicant') : null;
        if (sAppRaw) {
          const parsed = JSON.parse(sAppRaw);
          if (parsed && typeof parsed === 'object') {
            if (parsed.full_name?.includes('Trần Thị Mai') || parsed.full_name?.includes('HR') || parsed.code?.startsWith('HR')) {
              parsed.full_name = 'Nguyễn Thu Hà';
              parsed.code = 'UV0001';
              parsed.email = 'ungvien@ictu.edu.vn';
            }
            return parsed;
          }
        }

        const appRaw = localStorage.getItem('auth_user_applicant');
        if (appRaw) {
          const parsed = JSON.parse(appRaw);
          if (parsed && typeof parsed === 'object') {
            if (parsed.full_name?.includes('Trần Thị Mai') || parsed.full_name?.includes('HR') || parsed.code?.startsWith('HR')) {
              parsed.full_name = 'Nguyễn Thu Hà';
              parsed.code = 'UV0001';
              parsed.email = 'ungvien@ictu.edu.vn';
            }
            return parsed;
          }
        }
        return {
          id: 7,
          full_name: 'Nguyễn Thu Hà',
          code: 'UV0001',
          email: 'ungvien@ictu.edu.vn',
          role: 'intern',
          status: 'pending',
          university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
          major: 'Công nghệ thông tin',
        };
      }

      // TTS chính thức: Bảo toàn tài khoản TTS riêng của tab đó (TTS 1, 2, 3, 4)
      if (tabUser && !isApplicantTab) {
        return tabUser;
      }

      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sInternRaw = sessionStorage.getItem('auth_user_intern');
        if (sInternRaw) {
          const parsed = JSON.parse(sInternRaw);
          if (parsed && typeof parsed === 'object' && !parsed.email?.includes('ungvien') && parsed.role === 'intern') {
            return parsed;
          }
        }
      }

      const internRaw = localStorage.getItem('auth_user_intern');
      if (internRaw) {
        const parsed = JSON.parse(internRaw);
        if (parsed && typeof parsed === 'object' && !parsed.email?.includes('ungvien') && parsed.role === 'intern') {
          return parsed;
        }
      }

      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.role === 'intern' && !u.email?.includes('hr@') && !u.code?.startsWith('HR') && !u.code?.startsWith('AD')) {
          return u;
        }
      }

      const appRaw = localStorage.getItem('auth_user_applicant');
      if (appRaw) return JSON.parse(appRaw);
      return {
        id: 5,
        full_name: 'Nguyễn Văn An',
        code: 'TTS0001',
        email: 'intern@ictu.edu.vn',
        role: 'intern',
        status: 'active',
        university: 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)',
        major: 'Công nghệ thông tin',
      };
    }

    // 5. Mặc định
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const curRaw = sessionStorage.getItem('auth_user_current');
      if (curRaw) return JSON.parse(curRaw);
    }
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

