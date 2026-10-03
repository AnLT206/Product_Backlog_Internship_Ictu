/**
 * src/api/tasks.js
 * Tất cả lời gọi API liên quan đến công việc (tasks) của thực tập sinh.
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 *
 * Endpoints backend (backend/app/api/routes/tasks.py):
 *   GET  /api/intern/tasks            — Danh sách công việc (intern role)
 *   PATCH /api/intern/tasks/:id       — Cập nhật trạng thái (intern role)
 *
 * Trạng thái hợp lệ (theo backend TaskUpdateRequest):
 *   "todo" | "doing" | "done" | "canceled"
 *
 * TODO (task 2): Bỏ comment import và khối fetch thật, xóa khối MOCK,
 *   khi backend endpoint ổn định và database có dữ liệu thật.
 */

import apiFetch from './client'

/* ─────────────────────────────────────────────
   MOCK DATA dùng chung cho cả getTasks và getTask
   (giả lập dữ liệu backend trả về)

   TODO: Xóa toàn bộ MOCK_TASKS khi chuyển sang API thật.
───────────────────────────────────────────── */
const MOCK_TASKS = [
  {
    id: 1,
    title: 'Nghiên cứu công nghệ React và Vite',
    description:
      'Đọc tài liệu chính thức tại reactjs.org và vitejs.dev. Thực hành tạo project mẫu với Vite, hiểu rõ cấu trúc thư mục, cách import CSS module và cách cấu hình biến môi trường VITE_*.',
    deadline: '2026-10-10',
    status: 'doing',
    mentor_name: 'Nguyễn Văn Bình',
    mentor_email: 'binh.nv@ictu.edu.vn',
    program_name: 'Kỳ thực tập Thu 2026',
    created_at: '2026-09-28',
    notes: 'Ưu tiên hoàn thành phần routing và state management trước cuối tuần.',
  },
  {
    id: 2,
    title: 'Viết báo cáo tuần đầu tiên',
    description:
      'Tóm tắt những gì đã học và làm được trong tuần 1. Bao gồm: công cụ đã tiếp cận, khó khăn gặp phải và kế hoạch tuần tiếp theo.',
    deadline: '2026-10-07',
    status: 'done',
    mentor_name: 'Nguyễn Văn Bình',
    mentor_email: 'binh.nv@ictu.edu.vn',
    program_name: 'Kỳ thực tập Thu 2026',
    created_at: '2026-09-28',
    notes: '',
  },
  {
    id: 3,
    title: 'Thiết kế sơ đồ cơ sở dữ liệu module hồ sơ',
    description:
      'Tham khảo spec §4.2 và vẽ ERD cho module intern_profiles. Sử dụng draw.io hoặc dbdiagram.io, export ra PNG và PDF.',
    deadline: '2026-10-15',
    status: 'todo',
    mentor_name: 'Trần Thị Lan',
    mentor_email: 'lan.tt@ictu.edu.vn',
    program_name: 'Kỳ thực tập Thu 2026',
    created_at: '2026-09-30',
    notes: 'Tham khảo thêm bảng users và intern_profiles trong database/schema.sql.',
  },
  {
    id: 4,
    title: 'Review code Pull Request #58',
    description:
      'Review và comment theo checklist nhóm. Chú ý convention đặt tên hàm và kiểm tra edge case.',
    deadline: '2026-10-05',
    status: 'canceled',
    mentor_name: 'Nguyễn Văn Bình',
    mentor_email: 'binh.nv@ictu.edu.vn',
    program_name: 'Kỳ thực tập Thu 2026',
    created_at: '2026-09-29',
    notes: 'PR đã được đóng, không cần review nữa.',
  },
]

/* ─────────────────────────────────────────────
   getTasks
───────────────────────────────────────────── */

/**
 * Lấy danh sách công việc được giao cho thực tập sinh đang đăng nhập.
 *
 * @param {{ status?: string }} [params] - Lọc theo trạng thái (tuỳ chọn).
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *   Khi ok=true, data.items chứa mảng công việc, data.total là tổng số.
 *   Khi ok=false, data.detail chứa thông báo lỗi.
 *
 * @example
 * import { getTasks } from '../api/tasks';
 *
 * const { ok, data } = await getTasks();
 * if (ok) {
 *   // data.items — mảng TaskResponse
 * }
 */
export async function getTasks({ status } = {}) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 400))

  let items = MOCK_TASKS
  if (status) {
    items = MOCK_TASKS.filter((t) => t.status === status)
  }

  return {
    ok: true,
    status: 200,
    data: { items, total: items.length },
  }
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có GET /api/intern/tasks (role: intern)
  //       apiFetch tự gắn Authorization: Bearer <token> từ localStorage
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const qs = params.toString()
  return apiFetch(`/api/intern/tasks${qs ? `?${qs}` : ''}`, { method: 'GET' })
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   getTask
───────────────────────────────────────────── */

/**
 * Lấy chi tiết một công việc theo ID.
 *
 * @param {number|string} taskId - ID công việc.
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *   Khi ok=true, data là TaskResponse.
 *   Khi ok=false (404), data.detail = 'Không tìm thấy công việc.'
 *
 * @example
 * const { ok, data } = await getTask(1);
 * if (ok) {
 *   // data.title, data.status, ...
 * }
 */
export async function getTask(taskId) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 300))

  const task = MOCK_TASKS.find((t) => t.id === Number(taskId))
  if (!task) {
    return {
      ok: false,
      status: 404,
      data: { detail: 'Không tìm thấy công việc.' },
    }
  }

  return { ok: true, status: 200, data: task }
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có GET /api/intern/tasks/:id (role: intern)
  return apiFetch(`/api/intern/tasks/${taskId}`, { method: 'GET' })
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   updateTaskProgress
───────────────────────────────────────────── */

/**
 * Cập nhật trạng thái tiến độ công việc (intern tự cập nhật).
 *
 * Backend endpoint: PATCH /api/intern/tasks/:id (role: intern)
 * Schema body: { status: "todo" | "doing" | "done" | "canceled" }
 *
 * @param {number|string} taskId - ID công việc.
 * @param {"todo"|"doing"|"done"|"canceled"} newStatus - Trạng thái mới.
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *   Khi ok=true, data là TaskResponse đã cập nhật.
 *   Khi ok=false, data.detail chứa thông báo lỗi từ server.
 *
 * @example
 * import { updateTaskProgress } from '../api/tasks';
 *
 * const { ok, status, data } = await updateTaskProgress(1, 'done');
 * if (ok) {
 *   // data.status === 'done'
 * } else {
 *   // data.detail — thông báo lỗi
 * }
 */
export async function updateTaskProgress(taskId, newStatus) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 500))

  // Mô phỏng 404 nếu ID không tồn tại
  const task = MOCK_TASKS.find((t) => t.id === Number(taskId))
  if (!task) {
    return {
      ok: false,
      status: 404,
      data: { detail: 'Không tìm thấy công việc.' },
    }
  }

  // Mô phỏng 422 nếu status không hợp lệ
  const VALID = ['todo', 'doing', 'done', 'canceled']
  if (!VALID.includes(newStatus)) {
    return {
      ok: false,
      status: 422,
      data: { detail: `Trạng thái không hợp lệ: "${newStatus}". Chọn: ${VALID.join(', ')}.` },
    }
  }

  // Mô phỏng cập nhật thành công
  task.status = newStatus
  return {
    ok: true,
    status: 200,
    data: { ...task },
  }
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có PATCH /api/intern/tasks/:id (role: intern)
  //       apiFetch tự gắn Authorization: Bearer <token> từ localStorage
  return apiFetch(`/api/intern/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  })
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   buildTaskToast
   Helper tạo thông báo toast từ kết quả API.
   (Pattern tương tự buildToast trong interns.js)
───────────────────────────────────────────── */

/**
 * Tạo nội dung toast từ kết quả gọi updateTaskProgress().
 *
 * @param {boolean} ok        - API ok hay không.
 * @param {number}  status    - HTTP status code.
 * @param {object}  data      - Response body.
 * @returns {{ type: 'success'|'error', message: string }}
 *
 * @example
 * const { ok, status, data } = await updateTaskProgress(id, newStatus)
 * setToast(buildTaskToast(ok, status, data))
 */
export function buildTaskToast(ok, status, data) {
  if (ok) {
    return { type: 'success', message: 'Cập nhật tiến độ thành công!' }
  }
  if (status === 404) {
    return { type: 'error', message: 'Không tìm thấy công việc.' }
  }
  if (status === 422) {
    return { type: 'error', message: data?.detail ?? 'Dữ liệu không hợp lệ.' }
  }
  if (status === 403) {
    return { type: 'error', message: 'Bạn không có quyền cập nhật công việc này.' }
  }
  return {
    type: 'error',
    message: data?.detail ?? `Lỗi máy chủ (HTTP ${status}). Vui lòng thử lại.`,
  }
}

// Ensure apiFetch import is used (suppresses lint unused-var when MOCK active).
// This line is intentionally a no-op; remove when switching to real API calls.
void apiFetch
