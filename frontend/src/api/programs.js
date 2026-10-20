/**
 * src/api/programs.js
 * Tất cả lời gọi API liên quan đến chương trình thực tập (programs).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

import apiFetch from './client';

/**
 * Lấy danh sách chương trình thực tập.
 * Route: GET /api/hr/programs
 *
 * @param {boolean|{ status?: string, includeDeleted?: boolean }} [params=false]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getPrograms(params = false) {
  const qs = new URLSearchParams();
  if (typeof params === 'boolean') {
    if (params) qs.set('include_deleted', 'true');
  } else if (params && typeof params === 'object') {
    if (params.status) qs.set('status', params.status);
    if (params.includeDeleted || params.include_deleted) qs.set('include_deleted', 'true');
  }
  const query = qs.toString();
  return apiFetch(`/api/hr/programs${query ? `?${query}` : ''}`, { method: 'GET' });
}

/**
 * Gọi API tạo chương trình thực tập.
 * Route: POST /api/hr/programs
 *
 * @param {{ name: string, department?: string, description?: string,
 *            start_date?: string, end_date?: string, max_interns?: number, status?: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createProgram(body) {
  return apiFetch('/api/hr/programs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

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

/**
 * Gán thực tập sinh vào kỳ thực tập và nhóm chuyên môn (HR / Admin only).
 * Route: POST /api/hr/programs/:id/assign
 *
 * @param {number|string} programId
 * @param {{ intern_ids: number[], mentor_id?: number|null }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function assignInternsToProgram(programId, body) {
  return apiFetch(`/api/hr/programs/${programId}/assign`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Lấy danh sách thành viên (TTS & Mentor) của một kỳ thực tập.
 * Route: GET /api/hr/programs/:id/members
 *
 * @param {number|string} programId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getProgramMembers(programId) {
  return apiFetch(`/api/hr/programs/${programId}/members`, {
    method: 'GET',
  });
}

/**
 * Cập nhật Mentor hoặc trạng thái cho một TTS trong kỳ thực tập.
 * Route: PUT /api/hr/programs/:id/members/:internId
 *
 * @param {number|string} programId
 * @param {number|string} internId
 * @param {{ mentor_id?: number|null, status?: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateProgramMember(programId, internId, body) {
  return apiFetch(`/api/hr/programs/${programId}/members/${internId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Xóa một TTS khỏi kỳ thực tập.
 * Route: DELETE /api/hr/programs/:id/members/:internId
 *
 * @param {number|string} programId
 * @param {number|string} internId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function removeProgramMember(programId, internId) {
  return apiFetch(`/api/hr/programs/${programId}/members/${internId}`, {
    method: 'DELETE',
  });
}

/**
 * Lấy dữ liệu thống kê tỷ lệ hoàn thành chương trình thực tập và so sánh đợt trước.
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getCompletionStats() {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    ok: true,
    status: 200,
    data: {
      summary: {
        total: 124,
        completed: 87,
        in_progress: 29,
        not_completed: 8,
        completion_rate: 70,
      },
      previous_period: {
        id: 2,
        name: 'Kỳ thực tập Thu 2025',
        total: 110,
        completed: 72,
        completion_rate: 65,
      },
      programs: [
        {
          id: 1,
          name: 'Kỳ thực tập Hè 2026',
          department: 'Công nghệ Thông tin',
          total: 40,
          completed: 32,
          in_progress: 7,
          not_completed: 1,
        },
        {
          id: 2,
          name: 'Kỳ thực tập Thu 2025',
          department: 'Khoa học Dữ liệu',
          total: 28,
          completed: 25,
          in_progress: 3,
          not_completed: 0,
        },
        {
          id: 3,
          name: 'Kỳ thực tập Xuân 2025',
          department: 'Kỹ thuật Phần mềm',
          total: 35,
          completed: 22,
          in_progress: 10,
          not_completed: 3,
        },
        {
          id: 4,
          name: 'Kỳ thực tập Hè 2025',
          department: 'Trí tuệ Nhân tạo',
          total: 21,
          completed: 8,
          in_progress: 9,
          not_completed: 4,
        },
      ],
    },
  };
}

/**
 * Gỡ hoàn toàn một thực tập sinh khỏi kỳ thực tập (HR / Admin only).
 * Route: DELETE /api/hr/programs/:programId/interns/:internId
 *
 * @param {number|string} programId
 * @param {number|string} internId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function removeInternFromProgram(programId, internId) {
  return apiFetch(`/api/hr/programs/${programId}/interns/${internId}`, {
    method: 'DELETE',
  });
}

/**
 * Lấy danh sách lịch làm việc / ca làm việc theo kỳ thực tập.
 * Route: GET /api/hr/work-schedules?program_id=:programId
 */
export async function getProgramWorkSchedules(programId) {
  const qs = programId ? `?program_id=${programId}` : '';
  return apiFetch(`/api/hr/work-schedules${qs}`, { method: 'GET' });
}

/**
 * Tạo mới phiên / ca làm việc hằng tuần cho kỳ thực tập.
 * Route: POST /api/hr/work-schedules
 */
export async function createWorkSchedule(body) {
  return apiFetch('/api/hr/work-schedules', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Cập nhật phiên / ca làm việc.
 * Route: PUT /api/hr/work-schedules/:id
 */
export async function updateWorkSchedule(id, body) {
  return apiFetch(`/api/hr/work-schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Xóa phiên / ca làm việc.
 * Route: DELETE /api/hr/work-schedules/:id
 */
export async function deleteWorkSchedule(id) {
  return apiFetch(`/api/hr/work-schedules/${id}`, {
    method: 'DELETE',
  });
}

