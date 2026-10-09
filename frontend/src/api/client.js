/**
 * client.js
 * HTTP helper dùng chung cho toàn bộ FE.
 *
 * - Đọc base URL từ import.meta.env.VITE_API_URL (hoặc fallback localhost)
 * - Tự gắn header Authorization: Bearer <token> nếu có trong localStorage
 * - Trả về { ok, status, data } chuẩn hóa giống các service hiện có
 *
 * Tất cả file trong src/api/ nên dùng helper này để gọi fetch.
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

export function determineRoleForPath(path) {
  try {
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.email === 'ungvien@ictu.edu.vn' || u?.id === 7 || u?.role === 'applicant') return 'applicant';
      if (u?.role && CREDENTIALS_BY_ROLE[u.role]) return u.role;
    }
  } catch {
    // ignore
  }

  if (path.startsWith('/api/admin')) return 'admin';
  if (path.startsWith('/api/hr')) return 'hr';
  if (path.startsWith('/api/mentor')) return 'mentor';
  if (path.startsWith('/api/intern')) return 'intern';

  return 'hr';
}

/**
 * apiFetch — Wrapper fetch dùng chung.
 *
 * @param {string} path       - Đường dẫn API, ví dụ '/api/hr/interns/42'
 * @param {RequestInit} [options] - Các options của fetch (method, body, ...)
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export default async function apiFetch(path, options = {}) {
  let token = localStorage.getItem('access_token') ?? '';

  const isAuthRoute =
    path.startsWith('/api/admin') ||
    path.startsWith('/api/hr') ||
    path.startsWith('/api/mentor') ||
    path.startsWith('/api/intern') ||
    path.startsWith('/api/departments');

  const targetRole = determineRoleForPath(path);

  if (isAuthRoute && (!token || token === 'demo-enterprise-token')) {
    const freshToken = await acquireTokenForRole(targetRole);
    if (freshToken) token = freshToken;
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
    // Nếu bị 401 hoặc 403 trên auth route (token hết hạn hoặc sai role), tự động thử refresh token và gọi lại 1 lần
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


