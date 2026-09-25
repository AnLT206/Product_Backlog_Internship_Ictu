/**
 * src/api/admin.js
 * Tất cả lời gọi API liên quan đến chức năng quản trị (admin).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

// TODO: Bỏ comment import bên dưới và xóa toàn bộ khối MOCK khi BE có endpoint thật
// import apiFetch from './client';

/* ─────────────────────────────────────────────
   createAccount
───────────────────────────────────────────── */

/**
 * Gọi API tạo tài khoản (admin).
 *
 * TODO: Endpoint POST /api/admin/users chưa tồn tại ở backend (chờ API thật).
 *       Hiện tại hàm này giả lập (mock) luồng thành công/lỗi để FE có thể test độc lập.
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *
 * @param {{ full_name: string, email: string, role: string, password: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { createAccount } from '../api/admin';
 *
 * const { ok, status, data } = await createAccount({
 *   full_name: 'Nguyễn Văn A',
 *   email: 'a@ictu.edu.vn',
 *   role: 'intern',
 *   password: 'secret123',
 * });
 */
export async function createAccount(body) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 600));

  // Mô phỏng 409 nếu email chứa "exists" (để test lỗi)
  if (body.email.toLowerCase().includes('exists')) {
    return {
      ok: false,
      status: 409,
      data: { detail: 'Email đã được sử dụng.' },
    };
  }

  // Mô phỏng thành công 201
  return {
    ok: true,
    status: 201,
    data: {
      id: Math.floor(Math.random() * 1000),
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      status: 'active',
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có POST /api/admin/users (role: admin only)
  //       apiFetch tự gắn Authorization: Bearer <token> từ localStorage
  return apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  ─────────────────────────────────────────────────────────────────────── */
}
