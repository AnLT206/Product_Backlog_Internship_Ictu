/**
 * src/api/programs.js
 * Tất cả lời gọi API liên quan đến chương trình thực tập (programs).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 *
 * Trạng thái tích hợp:
 *   ✅ getPrograms   → GET  /api/hr/programs (đã có BE)
 *   ✅ createProgram → POST /api/hr/programs (đã có BE)
 */

import apiFetch from './client';

/* ─────────────────────────────────────────────
   getPrograms
───────────────────────────────────────────── */

/**
 * Lấy danh sách chương trình thực tập.
 *
 * ✅ API thật: GET /api/hr/programs (role: hr, admin)
 *
 * Response shape: { items: ProgramResponse[], total: number }
 * ProgramResponse: { id, name, description, start_date, end_date, status, created_at }
 *
 * @param {{ status?: 'open'|'closed'|'draft' }} [params]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getPrograms({ status } = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  const query = qs.toString();
  return apiFetch(`/api/hr/programs${query ? `?${query}` : ''}`, { method: 'GET' });
}

/* ─────────────────────────────────────────────
   createProgram
───────────────────────────────────────────── */

/**
 * Tạo chương trình thực tập mới.
 *
 * ✅ API thật: POST /api/hr/programs (role: hr, admin)
 *
 * Request body (ProgramCreateRequest):
 *   name        string    (bắt buộc)
 *   description string    (tùy chọn)
 *   start_date  string    ISO date YYYY-MM-DD (tùy chọn)
 *   end_date    string    ISO date YYYY-MM-DD (tùy chọn)
 *   status      string    'open' | 'closed' | 'draft' (tùy chọn, mặc định 'draft')
 *
 * @param {{ name: string, description?: string, start_date?: string,
 *            end_date?: string, status?: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createProgram(body) {
  return apiFetch('/api/hr/programs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
