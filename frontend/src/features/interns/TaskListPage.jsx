/**
 * TaskListPage.jsx
 * Route: /intern/tasks
 *
 * US 16: "Là thực tập sinh, tôi muốn cập nhật tiến độ công việc để mentor theo dõi."
 *
 * Task 1 (task này):
 *   - Giao diện tĩnh: bảng danh sách công việc được giao với MOCK data.
 *   - Cột: Tên công việc, Mô tả ngắn, Hạn chót, Trạng thái (badge màu).
 *   - Mỗi dòng có nút "Xem chi tiết" dẫn tới TaskDetailPage.
 *
 * Task 2 (TODO):
 *   - Thay MOCK_TASKS bằng state + useEffect gọi GET /api/intern/tasks.
 *   - Trạng thái lọc theo query param.
 *
 * Trạng thái công việc (theo backend tasks.py):
 *   "todo"     → Chưa bắt đầu
 *   "doing"    → Đang thực hiện
 *   "done"     → Hoàn thành
 *   "canceled" → Đã huỷ
 *
 * TODO (task 2): Xác nhận lại với nhóm backend về danh sách trạng thái
 *   nếu có thay đổi enum trong TaskUpdateRequest.
 */

import { Link } from 'react-router-dom'
import './TaskListPage.css'

/* ──────────────────────────────────────────────────────────────────────────────
   MOCK DATA
   Cấu trúc khớp theo backend GET /api/intern/tasks:
     id            int
     title         str
     description   str | null
     deadline      str (ISO date)
     status        "todo" | "doing" | "done" | "canceled"
     mentor_name   str

   TODO (task 2): Xóa mảng này, thay bằng state + fetch thật.
   ─────────────────────────────────────────────────────────────────────────── */
const MOCK_TASKS = [
  {
    id: 1,
    title: 'Nghiên cứu công nghệ React và Vite',
    description: 'Đọc tài liệu chính thức, thực hành tạo project mẫu.',
    deadline: '2026-10-10',
    status: 'doing',
    mentor_name: 'Nguyễn Văn Bình',
  },
  {
    id: 2,
    title: 'Viết báo cáo tuần đầu tiên',
    description: 'Tóm tắt những gì đã học trong tuần 1.',
    deadline: '2026-10-07',
    status: 'done',
    mentor_name: 'Nguyễn Văn Bình',
  },
  {
    id: 3,
    title: 'Thiết kế sơ đồ cơ sở dữ liệu module hồ sơ',
    description: 'Tham khảo spec và vẽ ERD cho module intern_profiles.',
    deadline: '2026-10-15',
    status: 'todo',
    mentor_name: 'Trần Thị Lan',
  },
  {
    id: 4,
    title: 'Review code Pull Request #58',
    description: 'Review và comment theo checklist nhóm.',
    deadline: '2026-10-05',
    status: 'canceled',
    mentor_name: 'Nguyễn Văn Bình',
  },
]

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────────────────────── */
const STATUS_META = {
  todo:     { label: 'Chưa bắt đầu', tone: 'todo'     },
  doing:    { label: 'Đang thực hiện', tone: 'doing'   },
  done:     { label: 'Hoàn thành',    tone: 'done'     },
  canceled: { label: 'Đã huỷ',        tone: 'canceled' },
}

function formatDeadline(isoDate) {
  if (!isoDate) return '—'
  const d = new Date(isoDate)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(isoDate, status) {
  if (!isoDate || status === 'done' || status === 'canceled') return false
  return new Date(isoDate) < new Date()
}

/* ──────────────────────────────────────────────────────────────────────────────
   Component
   ─────────────────────────────────────────────────────────────────────────── */
export default function TaskListPage() {
  const tasks = MOCK_TASKS // TODO (task 2): replace with API data

  const counts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="task-list-page">

      {/* ── HEADER ── */}
      <header className="task-list__header">
        <div>
          <nav className="task-list__crumb" aria-label="Breadcrumb">
            <span>Thực tập sinh</span>
            <span aria-hidden="true">/</span>
            <span>Công việc của tôi</span>
          </nav>
          <h1>Công việc của tôi</h1>
          <p className="task-list__lead">
            Danh sách công việc được mentor giao. Nhấn &quot;Xem chi tiết&quot; để cập nhật tiến độ.
          </p>
        </div>
      </header>

      {/* ── SUMMARY BADGES ── */}
      <section className="task-list__summary" aria-label="Tổng quan công việc">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className={`task-summary-card task-summary-card--${meta.tone}`}>
            <span className="task-summary-card__count">{counts[key] ?? 0}</span>
            <span className="task-summary-card__label">{meta.label}</span>
          </div>
        ))}
      </section>

      {/* ── TABLE ── */}
      <section className="task-list__panel" aria-label="Danh sách công việc">
        {tasks.length === 0 ? (
          <div className="task-list__empty">
            <span className="task-list__empty-icon">📋</span>
            <p>Chưa có công việc nào được giao.</p>
          </div>
        ) : (
          <div className="task-table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Tên công việc</th>
                  <th className="task-table__col--mentor">Mentor giao</th>
                  <th className="task-table__col--deadline">Hạn chót</th>
                  <th className="task-table__col--status">Trạng thái</th>
                  <th className="task-table__col--action">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const meta = STATUS_META[task.status] ?? { label: task.status, tone: 'todo' }
                  const overdue = isOverdue(task.deadline, task.status)
                  return (
                    <tr key={task.id} className="task-table__row">
                      <td>
                        <p className="task-table__title">{task.title}</p>
                        {task.description && (
                          <p className="task-table__desc">{task.description}</p>
                        )}
                      </td>
                      <td className="task-table__mentor">{task.mentor_name}</td>
                      <td className={`task-table__deadline${overdue ? ' task-table__deadline--overdue' : ''}`}>
                        {formatDeadline(task.deadline)}
                        {overdue && <span className="task-table__overdue-badge">Quá hạn</span>}
                      </td>
                      <td>
                        <span className={`task-status-badge task-status-badge--${meta.tone}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/intern/tasks/${task.id}`}
                          className="task-detail-btn"
                          id={`task-detail-btn-${task.id}`}
                          aria-label={`Xem chi tiết công việc: ${task.title}`}
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
