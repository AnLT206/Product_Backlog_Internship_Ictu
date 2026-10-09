/**
 * src/api/documents.js
 * Tất cả lời gọi API liên quan đến tài liệu (upload CV, đơn xin TT, hợp đồng, duyệt hồ sơ...).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 * Tuân thủ quy tắc docs/folder-structure.md §3:
 * "Gọi API → src/api/, không fetch rải trong mọi component/feature."
 */

import apiFetch, { getTokenForRole, acquireTokenForRole } from './client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Upload file CV hoặc đơn xin thực tập (TTS tự nộp).
 * Route: POST /api/intern/documents/upload?doc_type={cv|application}
 *
 * @param {File}   file     - File object từ input[type="file"].
 * @param {string} docType  - 'cv' hoặc 'application'.
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function uploadDocument(file, docType = 'cv') {
  let token = getTokenForRole('applicant') || getTokenForRole('intern');
  if (!token) token = (await acquireTokenForRole('applicant')) || (await acquireTokenForRole('intern'));
  if (!token) token = localStorage.getItem('access_token') || '';

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
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * TTS / Ứng viên lấy danh sách tài liệu cá nhân đã nộp.
 * Route: GET /api/intern/documents
 *
 * @param {{ doc_type?: string }} [filters={}]
 * @returns {Promise<{ ok: boolean, status: number, data: object[] }>}
 */
export async function getMyDocuments(filters = {}) {
  const query = new URLSearchParams();
  if (filters.doc_type) query.set('doc_type', filters.doc_type);

  const qs = query.toString();
  return apiFetch(`/api/intern/documents${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

/**
 * HR upload hợp đồng thực tập cho ứng viên / thực tập sinh.
 * Route: POST /api/hr/interns/{intern_id}/contract
 *
 * @param {number|string} internId
 * @param {File}          file
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function uploadContract(internId, file) {
  let token = getTokenForRole('hr');
  if (!token) token = await acquireTokenForRole('hr');
  if (!token) token = localStorage.getItem('access_token') || '';

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/hr/interns/${internId}/contract`, {
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
 * Lấy danh sách tài liệu của một thực tập sinh (HR / admin).
 * Route: GET /api/hr/documents/intern/{intern_id}
 *
 * @param {number|string} internId
 * @param {{ status?: string, doc_type?: string }} [filters={}]
 * @returns {Promise<{ ok: boolean, status: number, data: object[] }>}
 */
export async function getInternDocuments(internId, filters = {}) {
  const query = new URLSearchParams();
  if (filters.status)   query.set('status', filters.status);
  if (filters.doc_type) query.set('doc_type', filters.doc_type);

  const qs = query.toString();
  return apiFetch(`/api/hr/documents/intern/${internId}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

/**
 * HR xét duyệt tài liệu của thực tập sinh (approve hoặc reject kèm ghi chú).
 * Route: POST /api/hr/documents/{document_id}/review
 *
 * @param {number|string} documentId
 * @param {{ status: 'approved'|'rejected', review_note?: string }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function reviewDocument(documentId, payload) {
  return apiFetch(`/api/hr/documents/${documentId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * TTS lấy hợp đồng thực tập cá nhân của mình.
 * Route: GET /api/intern/contract
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getContract() {
  return apiFetch('/api/intern/contract', { method: 'GET' });
}

/**
 * TTS xác nhận đồng ý hợp đồng thực tập.
 * Route: POST /api/intern/contract/confirm
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function confirmContract() {
  return apiFetch('/api/intern/contract/confirm', { method: 'POST' });
}

/**
 * Tạo URL tải về tài liệu trực tiếp từ API backend.
 *
 * @param {number|string} documentId
 * @returns {string}
 */
export function getDocumentDownloadUrl(documentId) {
  return `${BASE_URL}/api/documents/${documentId}/download`;
}

/**
 * Xem trước trực tiếp file tài liệu đã chọn từ máy (trước khi nộp).
 * Trích xuất text paragraphs từ file DOCX hoặc trả về thông tin file.
 * Route: POST /api/intern/documents/preview-file
 *
 * @param {File} file
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function previewDocumentFile(file) {
  let token = getTokenForRole('applicant') || getTokenForRole('intern');
  if (!token) token = (await acquireTokenForRole('applicant')) || (await acquireTokenForRole('intern'));
  if (!token) token = localStorage.getItem('access_token') || '';

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/intern/documents/preview-file`, {
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
 * Xem trước tài liệu đã lưu trên hệ thống không cần tải xuống.
 * Route: GET /api/documents/{document_id}/view?raw={boolean}
 *
 * @param {number|string} documentId
 * @param {{ raw?: boolean }} [options={}]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function viewDocument(documentId, options = {}) {
  const query = new URLSearchParams();
  if (options.raw) query.set('raw', 'true');
  const qs = query.toString();
  return apiFetch(`/api/documents/${documentId}/view${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

/**
 * Lấy URL xem trước tài liệu trực tiếp (có kèm token xác thực để nhúng iframe).
 *
 * @param {number|string} documentId
 * @returns {string}
 */
export function getDocumentViewUrl(documentId) {
  const token = getTokenForRole('hr') || getTokenForRole('mentor') || localStorage.getItem('access_token') || '';
  return `${BASE_URL}/api/documents/${documentId}/view${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

/**
 * Xóa tài liệu cá nhân đã nộp.
 * Route: DELETE /api/intern/documents/{document_id}
 *
 * @param {number|string} documentId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function deleteDocument(documentId) {
  return apiFetch(`/api/intern/documents/${documentId}`, {
    method: 'DELETE',
  });
}
