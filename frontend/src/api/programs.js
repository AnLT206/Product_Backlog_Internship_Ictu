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
