/**
 * src/api/admin.js
 * API quản trị (admin) — gọi BE thật.
 */

import apiFetch from './client';

/**
 * Tạo tài khoản nội bộ (HR / Mentor).
 * POST /api/admin/users
 *
 * @param {{ full_name: string, email: string, role: string, password: string }} body
 */
export async function createAccount(body) {
  return apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Danh sách người dùng theo vai trò từ DB.
 * GET /api/admin/users?role=hr|mentor|intern
 *
 * @param {{ role?: 'hr'|'mentor'|'intern' }} [params]
 */
export async function fetchUsers(params = {}) {
  const role = params.role || 'hr';
  const q = new URLSearchParams({ role });
  return apiFetch(`/api/admin/users?${q.toString()}`);
}

/**
 * Danh sách nhật ký hệ thống — GET /api/admin/system-logs
 *
 * @param {{ limit?: number, offset?: number, action?: 'CREATE'|'UPDATE'|'DELETE'|'' }} [params]
 */
export async function fetchSystemLogs(params = {}) {
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.action) q.set('action', params.action);

  const qs = q.toString();
  return apiFetch(`/api/admin/system-logs${qs ? `?${qs}` : ''}`);
}
