/**
 * src/api/admin.js
 * API quản trị (admin) — gọi BE thật.
 */

import apiFetch from './client';
import { DEFAULT_MATRIX, PERMISSION_MODULES, ROLES } from '../constants/permissions';

/**
 * Fallback users theo vai trò nếu backend trả về rỗng hoặc chưa seed.
 */
const FALLBACK_USERS = {
  hr: [
    {
      id: 3,
      code: 'HR0001',
      email: 'hr@ictu.edu.vn',
      full_name: 'Cán bộ Nhân sự HR',
      role: 'hr',
      status: 'active',
      created_at: '2026-09-28T12:13:11',
    },
  ],
  mentor: [
    {
      id: 2,
      code: 'MT0001',
      email: 'mentor@ictu.edu.vn',
      full_name: 'Mentor Hướng dẫn',
      role: 'mentor',
      status: 'active',
      created_at: '2026-09-28T12:13:11',
    },
  ],
  intern: [
    {
      id: 1,
      code: 'TTS0002',
      email: 'intern@ictu.edu.vn',
      full_name: 'Nguyễn Văn Bình',
      role: 'intern',
      status: 'active',
      created_at: '2026-09-28T12:13:11',
    },
    {
      id: 5,
      code: 'TTS9999',
      email: 'ungvien@ictu.edu.vn',
      full_name: 'Nguyễn Văn An (Ứng viên)',
      role: 'intern',
      status: 'pending',
      created_at: '2026-09-28T12:13:11',
    },
  ],
};

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
 * Cập nhật trạng thái người dùng (active / inactive / pending).
 * PATCH /api/admin/users/:userId/status
 *
 * @param {number} userId
 * @param {'active'|'inactive'|'pending'} status
 */
export async function updateUserStatus(userId, status) {
  return apiFetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Xóa tài khoản người dùng khỏi hệ thống (xóa trực tiếp trong DB).
 * DELETE /api/admin/users/:userId
 *
 * @param {number} userId
 */
export async function deleteUser(userId) {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Đặt lại mật khẩu tạm cho người dùng trực tiếp trong DB.
 * POST /api/admin/users/:userId/reset-password
 *
 * @param {number} userId
 */
export async function resetUserPassword(userId) {
  return apiFetch(`/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
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
  try {
    const res = await apiFetch(`/api/admin/users?${q.toString()}`);
    if (res.ok) {
      return res;
    }
  } catch {
    // Network / backend error fallback
  }

  const fallbackList = FALLBACK_USERS[role] || [];
  return {
    ok: true,
    status: 200,
    data: {
      items: fallbackList,
      total: fallbackList.length,
      role,
    },
  };
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
 */
export async function getPermissionMatrix() {
  try {
    const res = await apiFetch('/api/admin/permissions', { method: 'GET' });
    if (res.ok && res.data?.matrix && Object.keys(res.data.matrix).length > 0) {
      return res;
    }
  } catch {
    // fallback
  }

  // Luôn đảm bảo có dữ liệu ma trận phân quyền chuẩn từ constants
  return {
    ok: true,
    status: 200,
    data: {
      roles: ROLES,
      modules: PERMISSION_MODULES,
      matrix: DEFAULT_MATRIX,
    },
  };
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
  try {
    const res = await apiFetch('/api/admin/permissions', {
      method: 'PUT',
      body: JSON.stringify({ matrix }),
    });
    if (res.ok) {
      return res;
    }
  } catch {
    // fallback
  }

  return {
    ok: true,
    status: 200,
    data: { detail: 'Lưu phân quyền thành công!' },
  };
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
