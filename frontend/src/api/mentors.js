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

/**
 * Lấy danh sách thực tập sinh đã phân công cho mentor (HR / Admin only).
 * Route: GET /api/hr/mentors/:mentorId/assigned-interns
 *
 * @param {number|string} mentorId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getAssignedInternsByMentor(mentorId) {
  return apiFetch(`/api/hr/mentors/${mentorId}/assigned-interns`, {
    method: 'GET',
  });
}

/**
 * Hủy phân công một thực tập sinh khỏi mentor (HR / Admin only).
 * Route: DELETE /api/hr/mentors/:mentorId/assigned-interns/:internId
 *
 * @param {number|string} mentorId
 * @param {number|string} internId
 * @param {number|string|null} [programId=null]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function unassignInternFromMentor(mentorId, internId, programId = null) {
  const qs = programId ? `?program_id=${programId}` : '';
  return apiFetch(`/api/hr/mentors/${mentorId}/assigned-interns/${internId}${qs}`, {
    method: 'DELETE',
  });
}

/**
 * Lấy tải công việc (Workload) của tất cả Mentor, có thể lọc theo Kỳ thực tập.
 * Route: GET /api/hr/mentors/workload?program_id=...
 *
 * @param {number|string|null} [programId=null]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getMentorWorkload(programId = null) {
  const qs = programId ? `?program_id=${programId}` : '';
  return apiFetch(`/api/hr/mentors/workload${qs}`, { method: 'GET' });
}

/**
 * Thống kê tổng hợp 4 chiều (Khối / Lớp / Khóa / Ban) và trạng thái gán Mentor.
 * Route: GET /api/hr/mentor-assignments/dimensions-summary
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getDimensionsSummary() {
  return apiFetch('/api/hr/mentor-assignments/dimensions-summary', {
    method: 'GET',
  });
}

/**
 * Lấy danh sách TTS và danh sách Mentor theo tiêu chí Khối/Lớp/Khóa/Ban (hỗ trợ N-N).
 * Route: GET /api/hr/mentor-assignments/by-dimension?dimension_type=...&dimension_value=...
 *
 * @param {string} dimensionType major | class | intake | department
 * @param {string} dimensionValue Tên tiêu chí
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getInternsByDimension(dimensionType, dimensionValue) {
  const params = new URLSearchParams({
    dimension_type: dimensionType,
    dimension_value: dimensionValue,
  });
  return apiFetch(`/api/hr/mentor-assignments/by-dimension?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * Phân công Mentor hàng loạt theo Khối/Lớp/Khóa/Ban (1-N & N-N).
 * Route: POST /api/hr/mentor-assignments/batch-by-dimension
 *
 * @param {{
 *   dimension_type: string,
 *   dimension_value: string,
 *   mentor_ids: number[],
 *   role_type?: 'primary'|'technical'|'co_mentor'|'advisor',
 *   assignment_mode?: 'append'|'replace',
 *   target_intern_ids?: number[]
 * }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function batchAssignByDimension(payload) {
  return apiFetch('/api/hr/mentor-assignments/batch-by-dimension', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Phân công ma trận nhiều Mentor cho nhiều TTS (N-N tự do).
 * Route: POST /api/hr/mentor-assignments/matrix
 *
 * @param {{
 *   mentor_ids: number[],
 *   intern_ids: number[],
 *   role_type?: 'primary'|'technical'|'co_mentor'|'advisor',
 *   assignment_mode?: 'append'|'replace'
 * }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function matrixAssignMentors(payload) {
  return apiFetch('/api/hr/mentor-assignments/matrix', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Hủy một vai trò Mentor khỏi TTS.
 * Route: DELETE /api/hr/mentor-assignments/role
 *
 * @param {{
 *   mentor_id: number,
 *   intern_id: number,
 *   role_type?: 'primary'|'technical'|'co_mentor'|'advisor'
 * }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function unassignMentorRole(payload) {
  return apiFetch('/api/hr/mentor-assignments/role', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

/**
 * Cập nhật / chỉnh sửa toàn bộ danh sách Mentor của một TTS.
 * Route: PUT /api/hr/mentor-assignments/intern/:internId
 *
 * @param {number|string} internId
 * @param {Array<{ mentor_id: number, role_type: string }>} mentors
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateInternMentors(internId, mentors) {
  return apiFetch(`/api/hr/mentor-assignments/intern/${internId}`, {
    method: 'PUT',
    body: JSON.stringify({ mentors }),
  });
}

/**
 * Chỉnh sửa vai trò của Mentor hoặc đổi sang Mentor khác.
 * Route: PUT /api/hr/mentor-assignments/role
 *
 * @param {{
 *   intern_id: number,
 *   old_mentor_id: number,
 *   old_role_type: string,
 *   new_mentor_id?: number,
 *   new_role_type?: string
 * }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateSingleMentorRole(payload) {
  return apiFetch('/api/hr/mentor-assignments/role', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
