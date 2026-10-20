/**
 * src/api/groups.js
 * Tất cả lời gọi API liên quan đến Nhóm thực tập (Internship Groups).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Tuân thủ folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

import apiFetch from './client';

/**
 * Lấy danh sách nhóm thực tập (hỗ trợ lọc theo department_id, program_id, status).
 * Route: GET /api/hr/internship-groups
 *
 * @param {{ department_id?: number|string, program_id?: number|string, status?: string }} [params={}]
 * @returns {Promise<{ ok: boolean, status: number, data: Array }>}
 */
export async function getInternshipGroups(params = {}) {
  const query = new URLSearchParams();
  if (params.department_id) query.set('department_id', String(params.department_id));
  if (params.program_id) query.set('program_id', String(params.program_id));
  if (params.leader_user_id) query.set('leader_user_id', String(params.leader_user_id));
  if (params.status) query.set('status', String(params.status));

  const qs = query.toString();
  return apiFetch(`/api/hr/internship-groups${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/**
 * Tạo mới nhóm thực tập.
 * Route: POST /api/hr/internship-groups
 *
 * @param {{
 *   name: string,
 *   code?: string,
 *   department_id?: number|null,
 *   program_id?: number|null,
 *   description?: string,
 *   max_members?: number
 * }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createInternshipGroup(payload) {
  return apiFetch('/api/hr/internship-groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Xem thông tin chi tiết một nhóm thực tập kèm danh sách thành viên.
 * Route: GET /api/hr/internship-groups/{groupId}
 *
 * @param {number|string} groupId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getInternshipGroupDetail(groupId) {
  return apiFetch(`/api/hr/internship-groups/${groupId}`, { method: 'GET' });
}

/**
 * Cập nhật thông tin nhóm thực tập.
 * Route: PUT /api/hr/internship-groups/{groupId}
 *
 * @param {number|string} groupId
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateInternshipGroup(groupId, payload) {
  return apiFetch(`/api/hr/internship-groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Gán thực tập sinh vào nhóm thực tập.
 * Route: POST /api/hr/internship-groups/assign-interns
 *
 * @param {{ group_id: number, intern_profile_ids?: number[], intern_ids?: number[], role?: string }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function assignInternsToGroup(payload) {
  return apiFetch('/api/hr/internship-groups/assign-interns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Gỡ thực tập sinh khỏi nhóm thực tập.
 * Route: DELETE /api/hr/internship-groups/{groupId}/interns/{internProfileId}
 *
 * @param {number|string} groupId
 * @param {number|string} internProfileId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function removeInternFromGroup(groupId, internProfileId) {
  return apiFetch(`/api/hr/internship-groups/${groupId}/interns/${internProfileId}`, {
    method: 'DELETE',
  });
}
