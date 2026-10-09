/**
 * src/api/mentors.js
 * Tất cả lời gọi API liên quan đến domain mentor.
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

import apiFetch from './client';

/**
 * Lấy danh sách phòng ban.
 * Route: GET /api/departments
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getDepartments() {
  return apiFetch('/api/departments', { method: 'GET' });
}

/**
 * Tạo mới một mentor (HR / Admin only).
 * Route: POST /api/hr/mentors
 *
 * @param {{
 *   full_name:     string,
 *   email:         string,
 *   password:      string,
 *   department_id?: number | null,
 * }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createMentor(body) {
  return apiFetch('/api/hr/mentors', {
    method: 'POST',
    body:   JSON.stringify(body),
  });
}

/**
 * Lấy danh sách tất cả mentor.
 * Route: GET /api/hr/mentors
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getMentors() {
  return apiFetch('/api/hr/mentors', { method: 'GET' });
}

/**
 * Phân công một hoặc nhiều thực tập sinh cho mentor (HR / Admin only).
 * Route: POST /api/hr/mentors/{mentor_id}/assign-interns
 *
 * @param {number|string} mentorId
 * @param {number[]} internIds
 * @param {number|null} [programId=null]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function assignInternsToMentor(mentorId, internIds, programId = null) {
  return apiFetch(`/api/hr/mentors/${mentorId}/assign-interns`, {
    method: 'POST',
    body:   JSON.stringify({ intern_ids: internIds, program_id: programId }),
  });
}

/**
 * Lấy danh sách thực tập sinh đang thuộc quyền hướng dẫn của Mentor đang đăng nhập.
 * Route: GET /api/mentor/assigned-interns
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getAssignedInterns() {
  return apiFetch('/api/mentor/assigned-interns', { method: 'GET' });
}

/**
 * Lấy danh sách thực tập sinh và trạng thái phân công cho mentor.
 * Route: GET /api/hr/mentors/:mentorId/interns
 *
 * @param {number|string} mentorId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getMentorInterns(mentorId) {
  return apiFetch(`/api/hr/mentors/${mentorId}/interns`, { method: 'GET' });
}

/**
 * Phân bổ thực tập sinh cho mentor.
 * Route: POST /api/hr/mentors/:mentorId/assign-interns
 *
 * @param {number|string} mentorId
 * @param {number[]} internIds
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function assignMentorInterns(mentorId, internIds) {
  return apiFetch(`/api/hr/mentors/${mentorId}/assign-interns`, {
    method: 'POST',
    body: JSON.stringify({ intern_ids: internIds }),
  });
}

/**
 * Phân công Mentor cho danh sách Thực tập sinh (Batch Assignment).
 * Route: POST /api/hr/assign-mentor
 *
 * @param {{ mentor_id: number|string, intern_ids: number[] }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function assignMentor({ mentor_id, intern_ids }) {
  return apiFetch('/api/hr/assign-mentor', {
    method: 'POST',
    body: JSON.stringify({ mentor_id, intern_ids }),
  });
}
