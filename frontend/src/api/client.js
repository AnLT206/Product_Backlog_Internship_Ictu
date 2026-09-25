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

/**
 * apiFetch — Wrapper fetch dùng chung.
 *
 * @param {string} path       - Đường dẫn API, ví dụ '/api/hr/interns/42'
 * @param {RequestInit} [options] - Các options của fetch (method, body, ...)
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import apiFetch from './client';
 *
 * const { ok, status, data } = await apiFetch('/api/hr/interns/42', {
 *   method: 'PUT',
 *   body: JSON.stringify(payload),
 * });
 */
export default async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token') ?? '';

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  return { ok: res.ok, status: res.status, data };
}
