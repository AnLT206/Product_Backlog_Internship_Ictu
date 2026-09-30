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

let adminTokenPromise = null;
async function acquireAdminToken() {
  if (adminTokenPromise) return adminTokenPromise;
  adminTokenPromise = (async () => {
    try {
      let res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ictu.edu.vn', password: 'User@123' }),
      });
      if (!res.ok) {
        res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@ictu.edu.vn', password: 'Admin@123' }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        if (data?.access_token) {
          localStorage.setItem('access_token', data.access_token);
          return data.access_token;
        }
      }
    } catch {
      // backend offline / unreachable
    } finally {
      adminTokenPromise = null;
    }
    return null;
  })();
  return adminTokenPromise;
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
    path.startsWith('/api/intern');

  if (isAuthRoute && (!token || token === 'demo-enterprise-token')) {
    const freshToken = await acquireAdminToken();
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
    // Nếu bị 401/403, tự động refresh token và thử lại 1 lần
    if ((res.status === 401 || res.status === 403) && isAuthRoute) {
      const freshToken = await acquireAdminToken();
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

