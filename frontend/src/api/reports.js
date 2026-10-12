/**
 * src/api/reports.js
 * API gọi các endpoint báo cáo và thống kê phân tích của phân hệ HR.
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Tuân thủ quy tắc docs/folder-structure.md §3:
 * "Gọi API → src/api/, không fetch rải trong mọi component/feature."
 */

import apiFetch from './client';

/**
 * Lấy thống kê số lượng và tỷ lệ thực tập sinh theo trường và ngành (SCRUM-177).
 * Route: GET /api/hr/analytics/sources
 *
 * @param {number|string|null} [programId=null] - ID đợt thực tập (tùy chọn)
 * @param {string|null} [status=null] - Lọc theo trạng thái hồ sơ (tùy chọn)
 * @returns {Promise<{ ok: boolean, status: number, data: { total_interns: number, by_university: Array, by_major: Array } }>}
 */
export async function getCandidateSourceStats(programId = null, status = null) {
  const qs = new URLSearchParams();
  if (programId && programId !== 'all') {
    qs.set('program_id', String(programId));
  }
  if (status && status.trim()) {
    qs.set('status', status.trim());
  }
  const query = qs.toString();
  return apiFetch(`/api/hr/analytics/sources${query ? `?${query}` : ''}`, { method: 'GET' });
}
