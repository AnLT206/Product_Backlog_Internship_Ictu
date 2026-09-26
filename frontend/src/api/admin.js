/**
 * src/api/admin.js
 * Tất cả lời gọi API liên quan đến chức năng quản trị (admin).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

import apiFetch from './client';

/* ─────────────────────────────────────────────
   createAccount
───────────────────────────────────────────── */

/**
 * Gọi API tạo tài khoản (admin).
 *
 * TODO: Endpoint POST /api/admin/users chưa tồn tại ở backend (chờ API thật).
 *       Hiện tại hàm này giả lập (mock) luồng thành công/lỗi để FE có thể test độc lập.
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *
 * @param {{ full_name: string, email: string, role: string, password: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { createAccount } from '../api/admin';
 *
 * const { ok, status, data } = await createAccount({
 *   full_name: 'Nguyễn Văn A',
 *   email: 'a@ictu.edu.vn',
 *   role: 'intern',
 *   password: 'secret123',
 * });
 */
export async function createAccount(body) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 600));

  // Mô phỏng 409 nếu email chứa "exists" (để test lỗi)
  if (body.email.toLowerCase().includes('exists')) {
    return {
      ok: false,
      status: 409,
      data: { detail: 'Email đã được sử dụng.' },
    };
  }

  // Mô phỏng thành công 201
  return {
    ok: true,
    status: 201,
    data: {
      id: Math.floor(Math.random() * 1000),
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      status: 'active',
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có POST /api/admin/users (role: admin only)
  //       apiFetch tự gắn Authorization: Bearer <token> từ localStorage
  return apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  ─────────────────────────────────────────────────────────────────────── */
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
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Import dữ liệu tĩnh từ constants — KHÔNG hardcode lại danh sách ở đây
  const { ROLES, PERMISSION_MODULES, DEFAULT_MATRIX } = await import('../constants/permissions.js');

  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 400));

  // Trả về dữ liệu dựng từ constants (mock)
  return {
    ok: true,
    status: 200,
    data: {
      roles:   ROLES,
      modules: PERMISSION_MODULES,
      matrix:  DEFAULT_MATRIX,
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có GET /api/admin/permissions (role: admin only)
  //       Response shape mong đợi:
  //       { roles: [...], modules: [...], matrix: { admin: {...}, hr: {...}, ... } }
  //       apiFetch tự gắn Authorization: Bearer <token> từ localStorage
  return apiFetch('/api/admin/permissions', { method: 'GET' });
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   updatePermissionMatrix
───────────────────────────────────────────── */

/**
 * Lưu ma trận phân quyền sau khi admin chỉnh sửa.
 *
 * TODO: PUT /api/admin/permissions chưa tồn tại ở backend (chờ API thật).
 *       Khi BE sẵn sàng: xóa khối MOCK, bỏ comment fetch thật bên dưới.
 *       Không cần đổi tên hàm hay shape trả về.
 *
 * @param {Record<string, Record<string, boolean>>} matrix
 *   Object dạng { admin: { auth_login: true, ... }, hr: { ... }, ... }
 *   (cùng shape với data.matrix từ getPermissionMatrix — giữ nhất quán)
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { updatePermissionMatrix } from '../api/admin';
 *
 * const { ok, status, data } = await updatePermissionMatrix(localMatrix);
 */
export async function updatePermissionMatrix(matrix) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 700));

  // Mô phỏng thành công 200 — echo lại matrix vừa lưu (giả lập)
  return {
    ok: true,
    status: 200,
    data: { detail: 'Lưu phân quyền thành công.', matrix },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có PUT /api/admin/permissions (role: admin only)
  //       Body: matrix (JSON) — apiFetch tự gắn Authorization header
  return apiFetch('/api/admin/permissions', {
    method: 'PUT',
    body: JSON.stringify({ matrix }),
  });
  ─────────────────────────────────────────────────────────────────────── */
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
