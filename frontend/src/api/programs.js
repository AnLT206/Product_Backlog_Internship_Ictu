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

/* ─────────────────────────────────────────────
   getCompletionStats
───────────────────────────────────────────── */

/**
 * Lấy dữ liệu thống kê tỷ lệ hoàn thành chương trình thực tập và so sánh đợt trước.
 *
 * TODO: Backend hiện tại (backend/app/api/routes/programs.py & reports.py) chưa có
 *       endpoint thống kê tỷ lệ hoàn thành và so sánh đợt trước.
 *       Đề xuất backend bổ sung:
 *         GET /api/hr/programs/completion-stats (hoặc /api/hr/reports/completion-stats)
 *         Response body đề xuất:
 *         {
 *           summary: {
 *             total: number,
 *             completed: number,
 *             in_progress: number,
 *             not_completed: number,
 *             completion_rate: number
 *           },
 *           previous_period: {
 *             id: number,
 *             name: string,
 *             total: number,
 *             completed: number,
 *             completion_rate: number
 *           } | null,
 *           programs: Array<{
 *             id: number,
 *             name: string,
 *             department: string,
 *             total: number,
 *             completed: number,
 *             in_progress: number,
 *             not_completed: number,
 *           }>
 *         }
 *       Hiện tại hàm sử dụng pattern MOCK (mô phỏng delay 400ms) với cấu trúc dữ liệu chuẩn.
 *       Khi backend hoàn thiện endpoint: xóa/bỏ comment khối MOCK và gọi apiFetch thật bên dưới.
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   status: number,
 *   data: {
 *     summary: {
 *       total: number,
 *       completed: number,
 *       in_progress: number,
 *       not_completed: number,
 *       completion_rate: number
 *     },
 *     previous_period: {
 *       id: number,
 *       name: string,
 *       total: number,
 *       completed: number,
 *       completion_rate: number
 *     } | null,
 *     programs: Array<{
 *       id: number,
 *       name: string,
 *       department: string,
 *       total: number,
 *       completed: number,
 *       in_progress: number,
 *       not_completed: number
 *     }>
 *   }
 * }>}
 */
export async function getCompletionStats() {
  /* ── MOCK (xóa khi backend có API thật) ─────────────────────────────── */
  // Giả lập network delay
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
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khi BE sẵn sàng:
  // return apiFetch('/api/hr/programs/completion-stats', { method: 'GET' });
  */
}

