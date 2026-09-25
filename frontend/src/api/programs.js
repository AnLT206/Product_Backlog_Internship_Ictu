/**
 * src/api/programs.js
 * Tất cả lời gọi API liên quan đến chương trình thực tập (programs).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

// TODO: Bỏ comment import bên dưới và xóa toàn bộ khối MOCK khi BE có endpoint thật
// import apiFetch from './client';

/* ─────────────────────────────────────────────
   createProgram
───────────────────────────────────────────── */

/**
 * Gọi API tạo chương trình thực tập.
 *
 * TODO: Endpoint POST /api/hr/programs chưa tồn tại ở backend (chờ API thật).
 *       Hiện tại hàm này giả lập (mock) để FE có thể test độc lập.
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *
 * @param {{ name: string, department: string, description: string,
 *            start_date: string, end_date: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { createProgram } from '../api/programs';
 *
 * const { ok, status, data } = await createProgram({
 *   name: 'Chương trình thực tập Hè 2026',
 *   department: 'Công nghệ thông tin',
 *   description: '',
 *   start_date: '2026-06-01',
 *   end_date: '2026-08-31',
 * });
 */
export async function createProgram(body) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 600));

  // Mô phỏng 409 nếu tên chứa "duplicate" (để test)
  if (body.name.toLowerCase().includes('duplicate')) {
    return {
      ok: false,
      status: 409,
      data: { detail: 'Tên chương trình đã tồn tại.' },
    };
  }

  return {
    ok: true,
    status: 201,
    data: {
      id: Math.floor(Math.random() * 1000),
      name: body.name,
      department: body.department,
      description: body.description,
      start_date: body.start_date,
      end_date: body.end_date,
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có POST /api/hr/programs (role: hr only)
  //       apiFetch tự gắn Authorization: Bearer <token> từ localStorage
  return apiFetch('/api/hr/programs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  ─────────────────────────────────────────────────────────────────────── */
}
