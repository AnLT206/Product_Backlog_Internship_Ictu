/**
 * src/api/programs.js
 * Tất cả lời gọi API liên quan đến chương trình thực tập (programs).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

import apiFetch from './client';

/* ─────────────────────────────────────────────
   getPrograms
───────────────────────────────────────────── */

/**
 * Lấy danh sách kỳ thực tập.
 * Route: GET /api/hr/programs
 *
 * @param {boolean} [includeDeleted=false]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getPrograms(includeDeleted = false) {
  return apiFetch(`/api/hr/programs?include_deleted=${includeDeleted}`, {
    method: 'GET',
  });
}

/* ─────────────────────────────────────────────
   createProgram
───────────────────────────────────────────── */

/**
 * Gọi API tạo chương trình thực tập.
 * Route: POST /api/hr/programs
 *
 * @param {{ name: string, department: string, description: string,
 *            start_date: string, end_date: string, max_interns?: number }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createProgram(body) {
  return apiFetch('/api/hr/programs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/* ─────────────────────────────────────────────
   updateProgram
───────────────────────────────────────────── */

/**
 * Cập nhật thông tin chương trình thực tập (bao gồm ngày bắt đầu & kết thúc).
 * Route: PUT /api/hr/programs/:id
 *
 * @param {number|string} id
 * @param {{ name?: string, department?: string, description?: string,
 *            start_date?: string, end_date?: string, max_interns?: number, status?: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateProgram(id, body) {
  return apiFetch(`/api/hr/programs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Lấy chi tiết một chương trình thực tập theo ID.
 * Route: GET /api/hr/programs/:id
 *
 * @param {number|string} id
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getProgramById(id) {
  return apiFetch(`/api/hr/programs/${id}`, {
    method: 'GET',
  });
}

/**
 * Xóa mềm kỳ thực tập.
 * Route: DELETE /api/hr/programs/:id
 *
 * @param {number|string} id
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function deleteProgram(id) {
  return apiFetch(`/api/hr/programs/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Đóng kỳ thực tập.
 * Route: PATCH /api/hr/programs/:id/close
 *
 * @param {number|string} id
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function closeProgram(id) {
  return apiFetch(`/api/hr/programs/${id}/close`, {
    method: 'PATCH',
  });
}

/**
 * Mở lại kỳ thực tập.
 * Route: PATCH /api/hr/programs/:id/open
 *
 * @param {number|string} id
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function openProgram(id) {
  return apiFetch(`/api/hr/programs/${id}/open`, {
    method: 'PATCH',
  });
}


