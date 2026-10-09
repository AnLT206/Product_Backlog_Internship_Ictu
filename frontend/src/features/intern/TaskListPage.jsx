/**
 * TaskListPage.jsx
 * Route: /intern/tasks
 *
 * US 16: "Là thực tập sinh, tôi muốn cập nhật tiến độ công việc để mentor theo dõi."
 *
 * Task 1: Giao diện tĩnh với MOCK data.
 * Task 2 (task này): Gọi getInternTasks() từ src/api/tasks.js khi mở trang.
 *   - Hiển thị trạng thái loading rõ ràng.
 *   - Thay MOCK bằng dữ liệu API thật (GET /api/intern/tasks).
 *
 * Trạng thái công việc (theo backend tasks.py):
 *   "todo"     → Chưa bắt đầu
 *   "doing"    → Đang thực hiện
 *   "done"     → Hoàn thành
 *   "canceled" → Đã huỷ
 */

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getInternTasks } from '../../api/tasks'
import './TaskListPage.css'

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
  const location = useLocation()

  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Khởi tạo toast từ navigate state (nếu có) — dùng lazy initializer tránh setState trong effect
  const [toast, setToast] = useState(
    () => location.state?.toast ?? null
  )

  // Tự ẩn toast sau 4 giây
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    async function loadTasks() {
      setLoading(true)
      setError(null)
      const { ok, data } = await getInternTasks()
      if (ok) {
        setTasks(data.items ?? [])
      } else {
        setError(data?.detail ?? 'Không thể tải danh sách công việc.')
      }
      setLoading(false)
    }
    void loadTasks()
  }, [])

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

      {/* ── TOAST từ cập nhật thành công ── */}
      {toast && (
        <div
          className={`task-list__toast task-list__toast--${toast.type}`}
          role="alert"
        >
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}

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

        {/* Loading */}
        {loading && (
          <div className="task-list__loading" role="status" aria-live="polite">
            <span className="task-list__spinner" aria-hidden="true" />
            <span>Đang tải danh sách công việc…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="task-list__error" role="alert">
            <span className="task-list__error-icon" aria-hidden="true">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && tasks.length === 0 && (
          <div className="task-list__empty">
            <span className="task-list__empty-icon" aria-hidden="true">📋</span>
            <p>Chưa có công việc nào được giao.</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && tasks.length > 0 && (
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
                  const overdue = isOverdue(task.due_at, task.status)
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
                        {formatDeadline(task.due_at)}
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
