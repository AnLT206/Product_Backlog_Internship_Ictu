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

/* ─────────────────────────────────────────────
   getPermissionMatrix
───────────────────────────────────────────── */

/**
 * Lấy ma trận phân quyền hiện tại.
 *
 * TODO: GET /api/admin/permissions chưa tồn tại ở backend (chờ API thật).
 *       Hiện tại hàm MOCK trả về DEFAULT_MATRIX từ constants/permissions.js —
 *       danh sách quyền chỉ định nghĩa MỘT LẦN duy nhất ở đó.
 *       Khi BE sẵn sàng: xóa khối MOCK, bỏ comment fetch thật bên dưới.
 *       Không cần đổi tên hàm hay shape trả về — component gọi hàm này
 *       sẽ không phải sửa 1 dòng nào.
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   status: number,
 *   data: {
 *     roles: { key: string, label: string }[],
 *     modules: { key: string, label: string, group: string }[],
 *     matrix: Record<string, Record<string, boolean>>
 *   }
 * }>}
 *
 * @example
 * import { getPermissionMatrix } from '../api/admin';
 *
 * const { ok, data } = await getPermissionMatrix();
 * if (ok) {
 *   // data.roles, data.modules, data.matrix
 * }
 */
export async function getPermissionMatrix() {
  return apiFetch('/api/admin/permissions', { method: 'GET' });
}

/* ─────────────────────────────────────────────
   updatePermissionMatrix
───────────────────────────────────────────── */

/**
 * Lưu ma trận phân quyền sau khi admin chỉnh sửa.
 * Route: PUT /api/admin/permissions
 *
 * @param {Record<string, Record<string, boolean>>} matrix
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updatePermissionMatrix(matrix) {
  return apiFetch('/api/admin/permissions', {
    method: 'PUT',
    body: JSON.stringify({ matrix }),
  });
}

/* ─────────────────────────────────────────────
   getSystemLogs
───────────────────────────────────────────── */

/**
 * Lấy danh sách nhật ký hoạt động hệ thống (admin only).
 *
 * Endpoint đã có thật, gọi trực tiếp, không cần mock.
 * Route: GET /api/admin/system-logs
 * (backend/app/api/routes/admin.py — đã merge PR us-42-system-logs-get-api)
 *
 * Query params hỗ trợ (tên lấy CHÍNH XÁC từ backend route):
 *   limit    {number}  1–200, default 50
 *   offset   {number}  >= 0,  default 0
 *   action   {'CREATE'|'UPDATE'|'DELETE'|undefined}
 *   user_id  {number|undefined}  phải là integer >= 1
 *
 * Response shape (SystemLogListResponse):
 *   { items: SystemLogResponse[], total: number, limit: number, offset: number }
 *   (KHÔNG có total_pages / has_next — FE tự tính từ total và limit)
 *
 * @param {{
 *   limit?:   number,
 *   offset?:  number,
 *   action?:  'CREATE'|'UPDATE'|'DELETE',
 *   user_id?: number,
 * }} [params]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { getSystemLogs } from '../api/admin';
 *
 * const { ok, status, data } = await getSystemLogs({ limit: 20, offset: 0 });
 * if (ok) {
 *   // data.items  — mảng log
 *   // data.total  — tổng bản ghi (dùng để tính số trang: Math.ceil(total / limit))
 *   // data.limit  — giá trị limit đã dùng
 *   // data.offset — giá trị offset đã dùng
 * }
 */
export async function getSystemLogs(params = {}) {
  // Xây dựng query string — chỉ đưa param vào URL nếu có giá trị thật
  const qs = new URLSearchParams();
  if (params.limit  != null) qs.set('limit',   String(params.limit));
  if (params.offset != null) qs.set('offset',  String(params.offset));
  if (params.action)         qs.set('action',  params.action);
  if (params.user_id != null) qs.set('user_id', String(params.user_id));

  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/admin/system-logs${query}`, { method: 'GET' });
}
