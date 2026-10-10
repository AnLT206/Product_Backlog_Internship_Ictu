
/**
 * src/api/interns.js
 * Tất cả lời gọi API liên quan đến thực tập sinh (intern).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Tuân thủ quy tắc docs/folder-structure.md §3:
 * "Gọi API → src/api/, không fetch rải trong mọi component/feature."
 */

import apiFetch, { getTokenForRole, acquireTokenForRole } from './client';

/**
 * Lấy danh sách thực tập sinh với bộ lọc tuỳ chọn (phân trang, ngành, trường, trạng thái, từ khóa).
 * Route: GET /api/hr/interns
 *
 * @param {{
 *   q?:          string,
 *   university?: string,
 *   major?:      string,
 *   status?:     string,
 *   page?:       number,
 *   page_size?:  number,
 * }} [params={}]
 * @returns {Promise<{ ok: boolean, status: number, data: { items: Array, total: number, page: number, total_pages: number } }>}
 */
export async function getInterns(params = {}) {
  const query = new URLSearchParams();
  if (params.q?.trim())          query.set('q', params.q.trim());
  if (params.university?.trim()) query.set('university', params.university.trim());
  if (params.major?.trim())      query.set('major', params.major.trim());
  if (params.status?.trim())     query.set('status', params.status.trim());
  if (params.page)               query.set('page', String(params.page));
  if (params.page_size)          query.set('page_size', String(params.page_size));

  const qs = query.toString();
  return apiFetch(`/api/hr/interns${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/**
 * Lấy danh sách thực tập sinh đang active (dùng cho phân công mentor).
 * Route: GET /api/hr/interns?status=active&page_size=100
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getActiveInterns() {
  return apiFetch('/api/hr/interns?status=active&page_size=100', { method: 'GET' });
}

/**
 * Lấy danh sách trường và ngành hiện có để hiển thị dropdown bộ lọc.
 * Route: GET /api/hr/interns/filter-options
 *
 * @returns {Promise<{ ok: boolean, status: number, data: { universities: string[], majors: string[], statuses: string[] } }>}
 */
export async function getFilterOptions() {
  return apiFetch('/api/hr/interns/filter-options', { method: 'GET' });
}

/**
 * Lấy thông tin chi tiết của 1 thực tập sinh theo ID.
 * Route: GET /api/hr/interns/{id}
 *
 * @param {number|string} internId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getInternById(internId) {
  return apiFetch(`/api/hr/interns/${internId}`, { method: 'GET' });
}

/**
 * Thêm mới hồ sơ thực tập sinh (HR / admin nhập hộ).
 * Route: POST /api/hr/interns
 *
 * @param {object} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createIntern(body) {
  return apiFetch('/api/hr/interns', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Cập nhật thông tin hồ sơ thực tập sinh.
 * Route: PUT /api/hr/interns/{id}
 *
 * @param {number|string} internId
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateIntern(internId, payload) {
  return apiFetch(`/api/hr/interns/${internId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Duyệt hồ sơ thực tập sinh (chuyển sang active và gửi email thông báo).
 * Route: POST /api/hr/interns/{id}/approve
 *
 * @param {number|string} internId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function approveIntern(internId) {
  return apiFetch(`/api/hr/interns/${internId}/approve`, { method: 'POST' });
}

/**
 * Từ chối hồ sơ thực tập sinh (kèm ghi chú lý do).
 * Route: POST /api/hr/interns/{id}/reject
 *
 * @param {number|string} internId
 * @param {string} [note]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function rejectIntern(internId, note = '') {
  return apiFetch(`/api/hr/interns/${internId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note: note || undefined }),
  });
}

/**
 * Cập nhật trạng thái hồ sơ TTS ('approved' | 'rejected' | 'inactive').
 * Route: PATCH /api/hr/interns/{id}/status
 *
 * @param {number|string} internId
 * @param {string} status
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateInternStatus(internId, status) {
  return apiFetch(`/api/hr/interns/${internId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * HR tải lên CV cho ứng viên / thực tập sinh.
 * Route: POST /api/hr/interns/{intern_id}/cv
 *
 * @param {number|string} internId
 * @param {File}          file
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function uploadInternCv(internId, file) {
  let token = getTokenForRole('hr');
  if (!token) token = await acquireTokenForRole('hr');
  if (!token) token = localStorage.getItem('access_token') || '';
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/hr/interns/${internId}/cv`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Phân tích kết quả API và trả về thông báo toast tương ứng.
 *
 * @param {boolean} ok
 * @param {number}  status
 * @param {object}  data
 * @param {string}  [successMessage='Thao tác thành công!']
 * @returns {{ type: 'success'|'error', message: string }}
 */
export function buildToast(ok, status, data, successMessage = 'Thao tác thành công!') {
  if (ok) {
    return { type: 'success', message: successMessage };
  }

  if (status === 404) {
    return {
      type: 'error',
      message: data?.detail ?? 'Không tìm thấy thông tin thực tập sinh.',
    };
  }

  if (status === 409) {
    return {
      type: 'error',
      message: data?.detail ?? 'Dữ liệu bị trùng lặp hoặc xung đột.',
    };
  }

  if (status === 422) {
    const detail = data?.detail;
    if (Array.isArray(detail)) {
      const msgs = detail.map((e) => e.msg).join('; ');
      return { type: 'error', message: msgs || 'Dữ liệu không hợp lệ.' };
    }
    return { type: 'error', message: detail ?? 'Dữ liệu không hợp lệ.' };
  }

  return {
    type: 'error',
    message: data?.detail ?? 'Đã xảy ra lỗi, vui lòng thử lại.',
  };
}
