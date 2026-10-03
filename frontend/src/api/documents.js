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
 *   của multipart upload.
 *
 * Trạng thái tích hợp:
 *   ✅ uploadDocument → POST /api/intern/documents/upload (đã có BE)
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/* ─────────────────────────────────────────────
   uploadDocument
───────────────────────────────────────────── */

/**
 * Upload file CV hoặc đơn xin thực tập (TTS tự nộp).
 *
 * ✅ API thật: POST /api/intern/documents/upload?doc_type=cv|application
 *    (role: intern — backend/app/api/routes/documents.py)
 *
 * Response (DocumentResponse):
 *   { id, intern_id, doc_type, file_name, file_url, status, uploaded_at, reviewed_at, reviewer_note }
 *
 * Lưu ý: KHÔNG dùng apiFetch vì upload là multipart/form-data.
 *   Browser tự set Content-Type với đúng boundary khi dùng FormData.
 *
 * @param {File}   file     - File object từ input[type="file"].
 * @param {string} docType  - 'cv' hoặc 'application'.
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
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
}
