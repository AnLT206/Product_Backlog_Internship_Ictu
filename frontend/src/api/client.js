/**
 * client.js
 * HTTP helper dùng chung cho toàn bộ FE.
 *
 * - Đọc base URL từ import.meta.env.VITE_API_URL (hoặc fallback localhost:8000)
 * - Tự gắn header Authorization: Bearer <token> với đúng role tương ứng với API endpoint
 * - Tự động refresh / acquire token theo role nếu token hết hạn hoặc gặp 401/403
 * - Trả về { ok, status, data } chuẩn hóa
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const CREDENTIALS_BY_ROLE = {
  admin: [
    { email: 'admin@ictu.edu.vn', password: 'Admin@123' },
    { email: 'admin@ictu.edu.vn', password: 'User@123' },
  ],
  hr: [{ email: 'hr@ictu.edu.vn', password: 'Hr@123' }],
  mentor: [{ email: 'mentor@ictu.edu.vn', password: 'Mentor@123' }],
  intern: [{ email: 'intern@ictu.edu.vn', password: 'Intern@123' }],
  applicant: [
    { email: 'ungvien@ictu.edu.vn', password: 'Intern@123' },
    { email: 'ungvien@ictu.edu.vn', password: 'User@123' },
  ],
};

const tokenPromises = {};

/**
 * Trích xuất role từ JWT access token mà không cần thư viện ngoài.
 */
export function getTokenRole(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      return payload.role || null;
    }
  } catch {
    // ignore invalid token format
  }
  return null;
}

/**
 * Đăng nhập ngầm tự động để lấy token hợp lệ theo role được yêu cầu.
 */
export async function acquireTokenForRole(role) {
  const attempts = CREDENTIALS_BY_ROLE[role];
  if (!attempts) return null;
  if (tokenPromises[role]) return tokenPromises[role];

  tokenPromises[role] = (async () => {
    try {
      for (const creds of attempts) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.access_token) {
            localStorage.setItem(`access_token_${role}`, data.access_token);
            localStorage.setItem('access_token', data.access_token);
            return data.access_token;
          }
        }
      }
    } catch {
      // backend offline / unreachable
    } finally {
      tokenPromises[role] = null;
    }
    return null;
  })();

  return tokenPromises[role];
}

/**
 * Lấy token phù hợp nhất cho role đã chỉ định từ localStorage.
 */
export function getTokenForRole(role) {
  const specific = localStorage.getItem(`access_token_${role}`);
  if (specific && (getTokenRole(specific) === role || (role === 'applicant' && getTokenRole(specific) === 'intern'))) {
    return specific;
  }

  const current = localStorage.getItem('access_token');
  if (current) {
    const currentRole = getTokenRole(current);
    if (currentRole === role || currentRole === 'admin' || (role === 'applicant' && currentRole === 'intern')) {
      return current;
    }
  }
  return null;
}

/**
 * Xác định chính xác role mà endpoint backend yêu cầu dựa theo tiền tố URL.
 */
export function determineRoleForPath(path) {
  if (path.startsWith('/api/admin')) return 'admin';
  if (path.startsWith('/api/hr')) return 'hr';
  if (path.startsWith('/api/mentor')) return 'mentor';
  if (path.startsWith('/api/departments')) return 'hr';

  if (path.startsWith('/api/intern')) {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.email === 'ungvien@ictu.edu.vn' || u?.id === 7 || u?.role === 'applicant') return 'applicant';
      }
    } catch {
      // ignore
    }
    return 'intern';
  }

  try {
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.role && CREDENTIALS_BY_ROLE[u.role]) return u.role;
    }
  } catch {
    // ignore
  }

  return 'hr';
}

/**
 * apiFetch — Wrapper fetch dùng chung với khả năng tự thích ứng quyền & tự khôi phục phiên.
 *
 * @param {string} path       - Đường dẫn API, ví dụ '/api/hr/interns'
 * @param {RequestInit} [options] - Các options của fetch (method, body, ...)
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export default async function apiFetch(path, options = {}) {
  const targetRole = determineRoleForPath(path);
  const isAuthRoute =
    path.startsWith('/api/admin') ||
    path.startsWith('/api/hr') ||
    path.startsWith('/api/mentor') ||
    path.startsWith('/api/intern') ||
    path.startsWith('/api/departments');

  let token = isAuthRoute ? getTokenForRole(targetRole) : (localStorage.getItem('access_token') ?? '');

  if (isAuthRoute) {
    const currentRole = getTokenRole(token);
    const isTargetValid =
      currentRole === targetRole ||
      currentRole === 'admin' ||
      (targetRole === 'applicant' && currentRole === 'intern');

    if (!token || token === 'demo-enterprise-token' || !isTargetValid) {
      const freshToken = await acquireTokenForRole(targetRole);
      if (freshToken) token = freshToken;
    }
  }

  const makeReq = async (tk) => {
    return fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  };

  let res;
  try {
    res = await makeReq(token);
    // Nếu gặp 401 hoặc 403, tự động refresh token cho đúng targetRole và thử lại 1 lần
    if ((res.status === 401 || res.status === 403) && isAuthRoute) {
      const freshToken = await acquireTokenForRole(targetRole);
      if (freshToken) {
        res = await makeReq(freshToken);
      }
    }
  } catch (err) {
    return { ok: false, status: 0, data: { detail: err?.message || 'Network error' } };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  return { ok: res.ok, status: res.status, data };
}
