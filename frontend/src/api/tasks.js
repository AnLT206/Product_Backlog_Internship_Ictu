/**
 * src/api/tasks.js
 * Tất cả lời gọi API liên quan đến công việc (tasks) — Mentor và Intern.
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 *
 * KHÔNG dùng mock data — toàn bộ gọi backend thật
 * (backend/app/api/routes/tasks.py):
 *
 *   Mentor (role: mentor, admin)
 *     GET   /api/mentor/tasks             — Danh sách công việc đã giao
 *     POST  /api/mentor/tasks             — Tạo công việc mới (201)
 *
 *   Intern (role: intern, admin)
 *     GET   /api/intern/tasks             — Danh sách công việc được giao
 *     PATCH /api/intern/tasks/{task_id}   — Cập nhật status / progress
 *
 * Backend KHÔNG có GET /api/intern/tasks/{task_id} → getInternTask() lấy
 * từ GET /api/intern/tasks rồi tìm theo id (dữ liệu vẫn là dữ liệu thật).
 *
 * TaskResponse (schemas/task.py):
 *   { id, mentor_id, intern_id, title, description, status, progress,
 *     due_at, created_at, updated_at, mentor_name, intern_name }
 *
 * Trạng thái hợp lệ: "todo" | "doing" | "done" | "canceled"
 */

import apiFetch from './client'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function buildQuery(params) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value))
    }
  })
  const query = qs.toString()
  return query ? `?${query}` : ''
}

/** Lấy chuỗi lỗi từ response FastAPI (detail string hoặc mảng lỗi 422). */
function extractDetail(data) {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const msg = detail.map((d) => d?.msg).filter(Boolean).join(' ')
    return msg || null
  }
  return null
}

/**
 * Thông báo lỗi chuẩn cho các API Task theo HTTP status.
 * Ưu tiên message backend trả về (detail) nếu có.
 *
 * @param {number} status
 * @param {object} data
 * @param {string} [fallback]
 * @returns {string}
 */
export function taskErrorMessage(status, data, fallback) {
  const detail = extractDetail(data)
  switch (status) {
    case 401:
      return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
    case 403:
      return detail ?? 'Bạn không có quyền thực hiện thao tác này.'
    case 404:
      return detail ?? 'Không tìm thấy công việc hoặc thực tập sinh.'
    case 400:
    case 422:
      return detail ?? 'Dữ liệu gửi lên không hợp lệ.'
    default:
      if (status >= 500) return 'Lỗi máy chủ. Vui lòng thử lại sau.'
      return detail ?? fallback ?? `Đã có lỗi xảy ra (HTTP ${status}).`
  }
}

/** Kết quả chuẩn khi không kết nối được máy chủ (apiFetch throw). */
export const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Vui lòng thử lại.'

/* ═════════════════════════════════════════════
   INTERN
═════════════════════════════════════════════ */

/**
 * Lấy danh sách công việc được giao cho thực tập sinh đang đăng nhập.
 * Route: GET /api/intern/tasks  (status filter tuỳ chọn)
 *
 * @param {{ status?: string }} [params]
 * @returns {Promise<{ ok: boolean, status: number, data: { items: object[], total: number } }>}
 */
export async function getInternTasks({ status } = {}) {
  return apiFetch(`/api/intern/tasks${buildQuery({ status })}`, { method: 'GET' })
}

/**
 * Lấy chi tiết một công việc của thực tập sinh.
 *
 * Backend chưa có GET /api/intern/tasks/{id} → gọi GET /api/intern/tasks
 * (API thật) rồi tìm theo id. Trả 404 nếu task không thuộc intern hiện tại.
 *
 * @param {number|string} taskId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getInternTask(taskId) {
  const res = await getInternTasks()
  if (!res.ok) return res

  const task = (res.data?.items ?? []).find((t) => String(t.id) === String(taskId))
  if (!task) {
    return { ok: false, status: 404, data: { detail: 'Không tìm thấy công việc.' } }
  }
  return { ok: true, status: 200, data: task }
}

/**
 * Thực tập sinh cập nhật trạng thái và/hoặc tiến độ công việc.
 * Route: PATCH /api/intern/tasks/{task_id}
 *
 * Body (TaskUpdateRequest) — chỉ gửi trường thay đổi:
 *   status?   "todo" | "doing" | "done" | "canceled"
 *   progress? number 0-100
 *
 * @param {number|string} taskId
 * @param {{ status?: string, progress?: number }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateInternTask(taskId, payload) {
  return apiFetch(`/api/intern/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Tạo nội dung toast từ kết quả gọi updateInternTask().
 *
 * @param {boolean} ok
 * @param {number}  status
 * @param {object}  data
 * @returns {{ type: 'success'|'error', message: string }}
 */
export function buildTaskToast(ok, status, data) {
  if (ok) {
    return { type: 'success', message: 'Cập nhật tiến độ thành công!' }
  }
  return {
    type: 'error',
    message: taskErrorMessage(status, data, 'Cập nhật tiến độ thất bại.'),
  }
}

/* ═════════════════════════════════════════════
   MENTOR
═════════════════════════════════════════════ */

/**
 * Mentor lấy danh sách công việc mình đã giao.
 * Route: GET /api/mentor/tasks
 * Query (tuỳ chọn, backend hỗ trợ): intern_id, status
 *
 * @param {{ intern_id?: number, status?: string }} [params]
 * @returns {Promise<{ ok: boolean, status: number, data: { items: object[], total: number } }>}
 */
export async function getMentorTasks({ intern_id, status } = {}) {
  return apiFetch(`/api/mentor/tasks${buildQuery({ intern_id, status })}`, { method: 'GET' })
}

/**
 * Mentor tạo công việc mới và gán cho thực tập sinh.
 * Route: POST /api/mentor/tasks  → 201 Created, trả TaskResponse
 *
 * Request body (TaskCreateRequest):
 *   intern_id    number           (bắt buộc)
 *   title        string 1-255     (bắt buộc)
 *   description  string | null
 *   due_at       string | null    ISO datetime, VD "2026-10-20T17:00:00"
 *   status       "todo"
 *   progress     0
 *
 * Lỗi: 403 intern không thuộc quyền Mentor · 404 intern không tồn tại · 422 dữ liệu sai
 *
 * @param {{ intern_id: number, title: string, description?: string|null,
 *           due_at?: string|null, status?: string, progress?: number }} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createMentorTask(payload) {
  return apiFetch('/api/mentor/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
