/**
 * src/api/mentors.js
 * Tất cả lời gọi API liên quan đến domain mentor.
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 *
 * Cả hai endpoint bên dưới ĐÃ CÓ THẬT ở backend:
 *   GET  /api/departments    — backend/app/api/routes/departments.py
 *   POST /api/hr/mentors     — backend/app/api/routes/mentors.py
 * → Gọi thẳng apiFetch, KHÔNG viết mock.
 */

import apiFetch from './client';

/* ─────────────────────────────────────────────
   getDepartments
───────────────────────────────────────────── */

/**
 * Lấy danh sách phòng ban.
 *
 * Endpoint đã có thật, gọi trực tiếp, không cần mock.
 * Route: GET /api/departments
 * (backend/app/api/routes/departments.py)
 *
 * Response shape (DepartmentResponse[]):
 *   [{ id: number, name: string, description: string | null }]
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { getDepartments } from '../api/mentors';
 *
 * const { ok, data } = await getDepartments();
 * if (ok) {
 *   // data — mảng [{ id, name, description }]
 * }
 */
export async function getDepartments() {
  return apiFetch('/api/departments', { method: 'GET' });
}

/* ─────────────────────────────────────────────
   createMentor
───────────────────────────────────────────── */

/**
 * Tạo mới một mentor (HR / Admin only).
 *
 * Endpoint đã có thật, gọi trực tiếp, không cần mock.
 * Route: POST /api/hr/mentors
 * (backend/app/api/routes/mentors.py)
 *
 * Request body (MentorCreateRequest — bắt buộc: full_name, email, password):
 *   full_name     {string}          min 1, max 100 ký tự
 *   email         {string}          định dạng email hợp lệ
 *   password      {string}          min 6, max 128 ký tự
 *   department_id {number|null}     ID phòng ban (từ getDepartments())
 *
 * Response shape (MentorResponse):
 *   { id, email, full_name, role, status, phone_number, dob, position, department_id }
 *
 * HTTP status:
 *   201 → tạo thành công
 *   409 → email đã tồn tại
 *   422 → dữ liệu không hợp lệ (validate fail phía backend)
 *
 * @param {{
 *   full_name:     string,
 *   email:         string,
 *   password:      string,
 *   department_id?: number | null,
 * }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { createMentor } from '../api/mentors';
 *
 * const { ok, status, data } = await createMentor({
 *   full_name:     'Nguyễn Văn A',
 *   email:         'a@ictu.edu.vn',
 *   password:      'mentor123',
 *   department_id: 2,
 * });
 */
export async function createMentor(body) {
  return apiFetch('/api/hr/mentors', {
    method: 'POST',
    body:   JSON.stringify(body),
  });
}
