/**
 * TaskDetailPage.jsx
 * Route: /intern/tasks/:id
 *
 * US 16: "Là thực tập sinh, tôi muốn cập nhật tiến độ công việc để mentor theo dõi."
 *
 * Task 1 (task này):
 *   - Giao diện tĩnh: hiển thị thông tin chi tiết công việc.
 *   - Dropdown chọn trạng thái tiến độ — đổi giá trị trong state cục bộ.
 *   - CHƯA gọi API (task 2 sẽ tích hợp PATCH /api/intern/tasks/:id).
 *
 * Task 2 (TODO):
 *   - Gọi GET /api/intern/tasks/:id để lấy dữ liệu thật thay MOCK_TASK.
 *   - Gọi PATCH /api/intern/tasks/:id khi bấm "Cập nhật".
 *   - Xử lý toast thành công / lỗi.
 *
 * Trạng thái công việc (theo backend tasks.py):
 *   "todo"     → Chưa bắt đầu
 *   "doing"    → Đang thực hiện
 *   "done"     → Hoàn thành
 *   "canceled" → Đã huỷ
 *
 * TODO (task 2): Xác nhận lại với nhóm backend nếu enum có thay đổi.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './TaskDetailPage.css'

/* ──────────────────────────────────────────────────────────────────────────────
   MOCK DATA — một công việc mẫu để UI test độc lập với backend.
   TODO (task 2): Xóa MOCK_TASKS, thay bằng fetch GET /api/intern/tasks/:id.
   ─────────────────────────────────────────────────────────────────────────── */
const MOCK_TASKS = {
  1: {
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
  2: {
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
  3: {
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
  4: {
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
}

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'todo',     label: 'Chưa bắt đầu' },
  { value: 'doing',    label: 'Đang thực hiện' },
  { value: 'done',     label: 'Hoàn thành' },
  { value: 'canceled', label: 'Đã huỷ' },
]

const STATUS_META = {
  todo:     { label: 'Chưa bắt đầu', tone: 'todo'     },
  doing:    { label: 'Đang thực hiện', tone: 'doing'   },
  done:     { label: 'Hoàn thành',    tone: 'done'     },
  canceled: { label: 'Đã huỷ',        tone: 'canceled' },
}

function formatDate(isoDate) {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/* ──────────────────────────────────────────────────────────────────────────────
   Component
   ─────────────────────────────────────────────────────────────────────────── */
export default function TaskDetailPage() {
  const { id } = useParams()

  // TODO (task 2): Thay bằng state loading + useEffect fetch GET /api/intern/tasks/:id
  const task = MOCK_TASKS[id] ?? null

  // Local state cho dropdown — chưa gọi API
  const [selectedStatus, setSelectedStatus] = useState(task?.status ?? 'todo')
  const [saved, setSaved] = useState(false)

  // TODO (task 2): Thay hàm này bằng lời gọi PATCH /api/intern/tasks/:id
  function handleUpdate() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!task) {
    return (
      <div className="task-detail-page">
        <div className="task-detail__not-found">
          <span className="task-detail__not-found-icon">🔍</span>
          <p>Không tìm thấy công việc #{id}.</p>
          <Link to="/intern/tasks" className="task-detail__back-link">
            ← Về danh sách công việc
          </Link>
        </div>
      </div>
    )
  }

  const currentMeta = STATUS_META[task.status] ?? STATUS_META.todo
  const selectedMeta = STATUS_META[selectedStatus] ?? STATUS_META.todo
  const isDirty = selectedStatus !== task.status

  return (
    <div className="task-detail-page">

      {/* ── BREADCRUMB + BACK ── */}
      <header className="task-detail__header">
        <nav className="task-detail__crumb" aria-label="Breadcrumb">
          <Link to="/intern/tasks" className="task-detail__crumb-link">Công việc của tôi</Link>
          <span aria-hidden="true">/</span>
          <span>Chi tiết</span>
        </nav>
        <h1 className="task-detail__title">{task.title}</h1>
        <div className="task-detail__meta-row">
          <span className={`task-status-badge task-status-badge--${currentMeta.tone}`}>
            {currentMeta.label}
          </span>
          <span className="task-detail__meta-sep">·</span>
          <span className="task-detail__meta-text">Hạn chót: {formatDate(task.deadline)}</span>
          <span className="task-detail__meta-sep">·</span>
          <span className="task-detail__meta-text">Giao ngày: {formatDate(task.created_at)}</span>
        </div>
      </header>

      <div className="task-detail__body">

        {/* ── LEFT: THÔNG TIN ── */}
        <section className="task-detail__card task-detail__card--info" aria-label="Thông tin công việc">
          <h2 className="task-detail__section-title">Thông tin công việc</h2>

          <div className="task-detail__field">
            <span className="task-detail__field-label">Tên công việc</span>
            <span className="task-detail__field-value">{task.title}</span>
          </div>

          <div className="task-detail__field">
            <span className="task-detail__field-label">Mô tả</span>
            <p className="task-detail__field-value task-detail__desc">{task.description || '—'}</p>
          </div>

          {task.notes && (
            <div className="task-detail__field">
              <span className="task-detail__field-label">Ghi chú của mentor</span>
              <p className="task-detail__field-value task-detail__notes">{task.notes}</p>
            </div>
          )}

          <div className="task-detail__info-grid">
            <div className="task-detail__field">
              <span className="task-detail__field-label">Hạn chót</span>
              <span className="task-detail__field-value">{formatDate(task.deadline)}</span>
            </div>
            <div className="task-detail__field">
              <span className="task-detail__field-label">Chương trình</span>
              <span className="task-detail__field-value">{task.program_name}</span>
            </div>
          </div>

          <div className="task-detail__field">
            <span className="task-detail__field-label">Mentor phụ trách</span>
            <div className="task-detail__mentor">
              <span className="task-detail__mentor-avatar" aria-hidden="true">
                {task.mentor_name.charAt(0)}
              </span>
              <div>
                <p className="task-detail__mentor-name">{task.mentor_name}</p>
                <p className="task-detail__mentor-email">{task.mentor_email}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── RIGHT: CẬP NHẬT TIẾN ĐỘ ── */}
        <section className="task-detail__card task-detail__card--update" aria-label="Cập nhật tiến độ">
          <h2 className="task-detail__section-title">Cập nhật tiến độ</h2>
          <p className="task-detail__update-desc">
            Chọn trạng thái phản ánh đúng tiến độ hiện tại của bạn.
          </p>

          {/* Trạng thái hiện tại */}
          <div className="task-detail__field">
            <span className="task-detail__field-label">Trạng thái hiện tại</span>
            <span className={`task-status-badge task-status-badge--${currentMeta.tone}`}>
              {currentMeta.label}
            </span>
          </div>

          {/* Dropdown chọn trạng thái mới */}
          <div className="task-detail__field">
            <label
              className="task-detail__field-label"
              htmlFor="task-status-select"
            >
              Trạng thái mới
            </label>
            <div className="task-detail__select-wrap">
              <select
                id="task-status-select"
                className="task-detail__select"
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setSaved(false) }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview badge trạng thái mới */}
            <div className="task-detail__preview-row">
              <span className="task-detail__preview-label">Xem trước:</span>
              <span className={`task-status-badge task-status-badge--${selectedMeta.tone}`}>
                {selectedMeta.label}
              </span>
            </div>
          </div>

          {/* Nút Cập nhật */}
          <button
            id="task-update-btn"
            type="button"
            className={`task-detail__btn-update${!isDirty ? ' task-detail__btn-update--disabled' : ''}`}
            onClick={handleUpdate}
            disabled={!isDirty}
            aria-disabled={!isDirty}
          >
            {/* TODO (task 2): Thêm loading spinner khi đang gọi API */}
            Cập nhật tiến độ
          </button>

          {/* Toast thành công (mock) */}
          {saved && (
            <div className="task-detail__toast task-detail__toast--success" role="alert">
              ✓ Cập nhật thành công! (TODO task 2: kết nối API thật)
            </div>
          )}

          {/* Ghi chú */}
          <p className="task-detail__api-note">
            {/* TODO (task 2): Xóa ghi chú này khi đã nối API */}
            <strong>Lưu ý phát triển:</strong> Chức năng này hiện chỉ là giao diện tĩnh.
            Task 2 sẽ tích hợp API <code>PATCH /api/intern/tasks/{'{id}'}</code>.
          </p>
        </section>

      </div>

      {/* ── FOOTER BACK ── */}
      <footer className="task-detail__footer">
        <Link to="/intern/tasks" className="task-detail__back-link">
          ← Về danh sách công việc
        </Link>
      </footer>

    </div>
  )
}
