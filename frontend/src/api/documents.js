/**
 * src/api/documents.js
 * Tất cả lời gọi API liên quan đến tài liệu (upload CV, đơn xin TT, hợp đồng...).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 *
 * Lưu ý kỹ thuật — multipart/form-data:
 *   apiFetch mặc định set "Content-Type: application/json".
 *   Upload file cần "multipart/form-data" (với boundary browser tự tạo).
 *   → KHÔNG set Content-Type thủ công, để browser tự set từ FormData.
 *   → Dùng token từ localStorage giống apiFetch, nhưng gọi fetch trực tiếp
 *     (không qua apiFetch) vì cần bỏ Content-Type header.
 *   Đây KHÔNG phải vi phạm quy ước — đây là ngoại lệ kỹ thuật bắt buộc
 *   của multipart upload, đã ghi rõ TODO để đồng đội biết.
 */

// TODO: Bỏ comment import bên dưới và xóa toàn bộ khối MOCK khi BE có endpoint thật
// import apiFetch from './client';
// const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/* ─────────────────────────────────────────────
   uploadDocument
───────────────────────────────────────────── */

/**
 * Upload file CV hoặc đơn xin thực tập (TTS tự nộp).
 *
 * TODO: POST /api/intern/documents/upload chưa tồn tại ở backend (chờ API thật).
 *       Hiện tại hàm MOCK trả về URL giả lập để FE test độc lập.
 *       Khi BE sẵn sàng:
 *         1. Xóa toàn bộ khối MOCK bên dưới.
 *         2. Bỏ comment khối fetch thật bên dưới.
 *         3. Xác nhận với BE field nào trong response chứa URL xem/tải
 *            (hiện giả định là data.file_url — cập nhật nếu BE dùng tên khác).
 *       Không cần đổi tên hàm hay shape trả về — component gọi hàm này
 *       sẽ không phải sửa 1 dòng nào khi chuyển từ MOCK sang API thật.
 *
 * Lưu ý: KHÔNG dùng apiFetch vì upload là multipart/form-data — xem comment
 * đầu file để hiểu lý do.
 *
 * @param {File}   file     - File object từ input[type="file"].
 * @param {string} docType  - 'cv' hoặc 'application'.
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *   Khi ok=true, data.file_url chứa URL truy cập file.
 *   Khi ok=false, data.detail chứa thông báo lỗi.
 *
 * @example
 * import { uploadDocument } from '../api/documents';
 *
 * const { ok, status, data } = await uploadDocument(file, 'cv');
 * if (ok) {
 *   // data.file_url — URL xem/tải file
 *   // data.file_name — tên file gốc
 * }
 */
export async function uploadDocument(file, docType = 'cv') {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 800));

  // Mô phỏng 422 nếu file không có tên (để test lỗi)
  if (!file?.name) {
    return {
      ok: false,
      status: 422,
      data: { detail: 'Thiếu tên file.' },
    };
  }

  // Mô phỏng 422 nếu file lớn hơn 5MB (validate phía FE đã chặn trước,
  // nhưng MOCK vẫn mô phỏng để test flow)
  if (file.size > 5 * 1024 * 1024) {
    return {
      ok: false,
      status: 422,
      data: { detail: 'File vượt quá 5MB.' },
    };
  }

  // Mô phỏng thành công 201 — trả về URL giả lập
  // TODO: Khi BE thật, data.file_url sẽ là URL thật từ server.
  //       Xác nhận tên field với BE (có thể là file_url, url, path, ...).
  const mockId = Math.floor(Math.random() * 100000);
  return {
    ok: true,
    status: 201,
    data: {
      id: mockId,
      file_name: file.name,
      doc_type: docType,
      status: 'pending',
      // URL giả lập — thay bằng URL thật từ response BE
      file_url: `http://localhost:8000/uploads/intern_docs/${mockId}_${docType}_${file.name}`,
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có POST /api/intern/documents/upload
  //       (role: intern — apiFetch tự gắn Authorization header)
  //       Không dùng apiFetch vì multipart cần browser tự set Content-Type.
  const token = localStorage.getItem('access_token') ?? '';
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(
    `${BASE_URL}/api/intern/documents/upload?doc_type=${encodeURIComponent(docType)}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { ok: res.ok, status: res.status, data };
  ─────────────────────────────────────────────────────────────────────── */
}
