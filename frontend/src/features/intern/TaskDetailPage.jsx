/**
 * TaskDetailPage.jsx
 * Route: /intern/tasks/:id
 *
 * US 16: "Là thực tập sinh, tôi muốn cập nhật tiến độ công việc để mentor theo dõi."
 *
 * Task 1: Giao diện tĩnh, state cục bộ.
 * Task 2 (task này):
 *   - Gọi getTask(id) khi mở trang để lấy dữ liệu thật.
 *   - Khi bấm "Cập nhật", gọi updateTaskProgress(id, status).
 *   - Thành công: navigate về /intern/tasks (danh sách tự refresh khi load lại).
 *   - Lỗi: hiện toast lỗi, không điều hướng.
 *
 * Trạng thái công việc (theo backend tasks.py):
 *   "todo"     → Chưa bắt đầu
 *   "doing"    → Đang thực hiện
 *   "done"     → Hoàn thành
 *   "canceled" → Đã huỷ
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buildTaskToast, getInternTask, updateInternTask } from '../../api/tasks'
import './TaskDetailPage.css'

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
  const { id }   = useParams()
  const navigate = useNavigate()

  // ── Tất cả useState phải khai báo TRƯỚC mọi useEffect ──
  const [task, setTask]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('todo')
  const [updating, setUpdating]           = useState(false)
  const [toast, setToast]                 = useState(null)   // { type, message }

  // ── Fetch task khi mở trang ──
  useEffect(() => {
    async function loadTask() {
      setLoading(true)
      setFetchError(null)
      const { ok, data } = await getInternTask(id)
      if (ok) {
        setTask(data)
        setSelectedStatus(data.status)   // sync dropdown với dữ liệu thật
      } else {
        setFetchError(data?.detail ?? 'Không thể tải thông tin công việc.')
      }
      setLoading(false)
    }
    void loadTask()
  }, [id])

  // ── Handler cập nhật tiến độ ──
  function clearToast() { setToast(null) }

  async function handleUpdate() {
    if (updating) return
    setUpdating(true)
    setToast(null)

    const { ok, status, data } = await updateInternTask(id, { status: selectedStatus })
    const toastMsg = buildTaskToast(ok, status, data)

    if (ok) {
      // Thành công: navigate về danh sách → TaskListPage gọi lại getTasks() tươi
      // Truyền toast qua location.state để TaskListPage hiển thị
      navigate('/intern/tasks', { state: { toast: toastMsg } })
      // Không setUpdating(false) vì component sẽ unmount
    } else {
      // Lỗi: hiện toast tại chỗ, không điều hướng
      setToast(toastMsg)
      setUpdating(false)
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="task-detail-page">
        <div className="task-detail__loading" role="status" aria-live="polite">
          <span className="task-detail__spinner" aria-hidden="true" />
          <span>Đang tải thông tin công việc…</span>
        </div>
      </div>
    )
  }

  /* ── Fetch error / not found ── */
  if (fetchError || !task) {
    return (
      <div className="task-detail-page">
        <div className="task-detail__not-found">
          <span className="task-detail__not-found-icon" aria-hidden="true">🔍</span>
          <p>{fetchError ?? `Không tìm thấy công việc #${id}.`}</p>
          <Link to="/intern/tasks" className="task-detail__back-link">
            ← Về danh sách công việc
          </Link>
        </div>
      </div>
    )
  }

  const currentMeta  = STATUS_META[task.status]    ?? STATUS_META.todo
  const selectedMeta = STATUS_META[selectedStatus] ?? STATUS_META.todo
  const isDirty      = selectedStatus !== task.status

  return (
    <div className="task-detail-page">

      {/* ── BREADCRUMB ── */}
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
          <span className="task-detail__meta-text">Hạn chót: {formatDate(task.due_at)}</span>
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
              <span className="task-detail__field-value">{formatDate(task.due_at)}</span>
            </div>
            <div className="task-detail__field">
              <span className="task-detail__field-label">Thực tập sinh</span>
              <span className="task-detail__field-value">{task.intern_name ?? '—'}</span>
            </div>
          </div>

          <div className="task-detail__field">
            <span className="task-detail__field-label">Mentor phụ trách</span>
            <div className="task-detail__mentor">
              <span className="task-detail__mentor-avatar" aria-hidden="true">
                {task.mentor_name ? task.mentor_name.charAt(0) : 'M'}
              </span>
              <div>
                <p className="task-detail__mentor-name">{task.mentor_name ?? '—'}</p>
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

          {/* Dropdown */}
          <div className="task-detail__field">
            <label className="task-detail__field-label" htmlFor="task-status-select">
              Trạng thái mới
            </label>
            <div className="task-detail__select-wrap">
              <select
                id="task-status-select"
                className="task-detail__select"
                value={selectedStatus}
                disabled={updating}
                onChange={(e) => { setSelectedStatus(e.target.value); clearToast() }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview badge */}
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
            className={`task-detail__btn-update${(!isDirty || updating) ? ' task-detail__btn-update--disabled' : ''}`}
            onClick={handleUpdate}
            disabled={!isDirty || updating}
            aria-disabled={!isDirty || updating}
          >
            {updating ? (
              <>
                <span className="task-detail__spinner task-detail__spinner--inline" aria-hidden="true" />
                Đang cập nhật…
              </>
            ) : (
              'Cập nhật tiến độ'
            )}
          </button>

          {/* Toast lỗi */}
          {toast && (
            <div
              className={`task-detail__toast task-detail__toast--${toast.type}`}
              role="alert"
            >
              {toast.type === 'error' ? '✗' : '✓'} {toast.message}
            </div>
          )}
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer className="task-detail__footer">
        <Link to="/intern/tasks" className="task-detail__back-link">
          ← Về danh sách công việc
        </Link>
      </footer>

    </div>
  )
}
