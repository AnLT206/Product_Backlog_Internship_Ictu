/**
 * MentorTasksPage.jsx
 * Route: /mentor/tasks
 *
 * Danh sách nhiệm vụ Mentor đã giao — có filter theo intern và status.
 * API thật: GET /api/mentor/tasks (tasks.py — require_roles("mentor","admin"))
 *
 * Mentor chỉ thấy nhiệm vụ mình đã giao (backend tự lọc theo mentor_id).
 * Intern mới là người cập nhật progress/status — không sửa ở đây.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMentorTasks } from '../../api/tasks'
import { getAssignedInterns } from '../../api/mentors'
import TaskCreateModal from './TaskCreateModal'
import './MentorTasksPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */
const STATUS_META = {
  todo:     { label: 'Chưa bắt đầu', tone: 'todo'     },
  doing:    { label: 'Đang thực hiện', tone: 'doing'   },
  done:     { label: 'Hoàn thành',    tone: 'done'     },
  canceled: { label: 'Đã huỷ',        tone: 'canceled' },
}

const STATUS_OPTIONS = [
  { value: '',         label: 'Tất cả trạng thái' },
  { value: 'todo',     label: 'Chưa bắt đầu' },
  { value: 'doing',    label: 'Đang thực hiện' },
  { value: 'done',     label: 'Hoàn thành' },
  { value: 'canceled', label: 'Đã huỷ' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function isOverdue(isoDate, status) {
  if (!isoDate || status === 'done' || status === 'canceled') return false
  return new Date(isoDate) < new Date()
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
export default function MentorTasksPage() {
  const { user } = useAuth()
  void user // suppress lint — dùng nếu cần hiển thị tên

  /* ── Filter state ── */
  const [filterInternId, setFilterInternId] = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')

  /* ── Interns for filter dropdown ── */
  const [interns, setInterns] = useState([])

  /* ── Tasks ── */
  const [tasks,       setTasks]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  /* ── Modal & Toast ── */
  const [showModal, setShowModal] = useState(false)
  const [toast,     setToast]     = useState(null)

  /* ── Toast auto-hide ── */
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  /* ── Load interns for filter ── */
  async function loadInterns() {
    const { ok, data } = await getAssignedInterns()
    if (ok) setInterns(data?.items ?? [])
  }

  /* ── Load tasks ── */
  async function loadTasks(internId, status) {
    const params = {}
    if (internId) params.intern_id = Number(internId)
    if (status)   params.status    = status
    const { ok, data } = await getMentorTasks(params)
    if (ok) {
      setTasks(data?.items ?? [])
      setError(null)
    } else {
      setError('Không thể tải danh sách nhiệm vụ.')
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInterns()
    void loadTasks('', '')
  }, [])

  function handleFilterChange(internId, status) {
    setFilterInternId(internId)
    setFilterStatus(status)
    setLoading(true)
    void loadTasks(internId, status)
  }

  /* ── Callback sau khi POST /api/mentor/tasks thành công ──
     newTask là TaskResponse thật. Chỉ chèn vào đầu list nếu khớp bộ lọc
     đang chọn (giống kết quả backend sẽ trả về). Không reload trang. */
  const handleTaskCreated = useCallback((newTask) => {
    setShowModal(false)
    if (!newTask || newTask.id == null) return
    const matchIntern = !filterInternId || String(newTask.intern_id) === String(filterInternId)
    const matchStatus = !filterStatus || newTask.status === filterStatus
    if (!matchIntern || !matchStatus) return
    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)])
  }, [filterInternId, filterStatus])

  const hasFilter = Boolean(filterInternId || filterStatus)

  /* ── Counts ── */
  const counts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="mtp-page">

      {/* ── TOAST ── */}
      {toast && (
        <div className={`mtp-toast mtp-toast--${toast.type}`} role="alert">
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="mtp-header">
        <div>
          <nav className="mtp-crumb" aria-label="Breadcrumb">
            <span>Mentor</span>
            <span aria-hidden="true">/</span>
            <span>Danh sách nhiệm vụ</span>
          </nav>
          <h1>Danh sách nhiệm vụ</h1>
          <p className="mtp-lead">
            Tất cả nhiệm vụ bạn đã giao. Intern tự cập nhật tiến độ.
          </p>
        </div>
        <button
          id="mtp-create-btn"
          type="button"
          className="mtp-btn mtp-btn--primary"
          onClick={() => setShowModal(true)}
        >
          + Giao nhiệm vụ
        </button>
      </header>

      {/* ── SUMMARY ── */}
      <section className="mtp-summary" aria-label="Tổng quan">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className={`mtp-sum-card mtp-sum-card--${meta.tone}`}>
            <span className="mtp-sum-card__count">{counts[key] ?? 0}</span>
            <span className="mtp-sum-card__label">{meta.label}</span>
          </div>
        ))}
      </section>

      {/* ── FILTERS ── */}
      <div className="mtp-filters">
        <select
          id="mtp-filter-intern"
          className="mtp-filter-select"
          value={filterInternId}
          onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
        >
          <option value="">Tất cả thực tập sinh</option>
          {interns.map((i) => (
            <option key={i.intern_id} value={i.intern_id}>
              {i.intern_name ?? i.intern_email}
            </option>
          ))}
        </select>

        <select
          id="mtp-filter-status"
          className="mtp-filter-select"
          value={filterStatus}
          onChange={(e) => handleFilterChange(filterInternId, e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── TABLE PANEL ── */}
      <section className="mtp-panel" aria-label="Danh sách nhiệm vụ">

        {/* Loading */}
        {loading && (
          <div className="mtp-loading" role="status" aria-live="polite">
            <span className="mtp-spinner" aria-hidden="true" />
            <span>Đang tải danh sách nhiệm vụ…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mtp-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && tasks.length === 0 && (
          <div className="mtp-empty">
            <span className="mtp-empty-icon" aria-hidden="true">📋</span>
            <p>
              {hasFilter
                ? 'Không có nhiệm vụ nào phù hợp với bộ lọc.'
                : 'Chưa có nhiệm vụ nào được giao.'}
            </p>
            {!hasFilter && (
              <button
                type="button"
                className="mtp-btn mtp-btn--primary"
                onClick={() => setShowModal(true)}
              >
                + Giao nhiệm vụ đầu tiên
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && tasks.length > 0 && (
          <div className="mtp-table-wrap">
            <table className="mtp-table">
              <thead>
                <tr>
                  <th>Nhiệm vụ</th>
                  <th className="mtp-col--intern">Thực tập sinh</th>
                  <th className="mtp-col--deadline">Hạn chót</th>
                  <th className="mtp-col--progress">Tiến độ</th>
                  <th className="mtp-col--status">Trạng thái</th>
                  <th className="mtp-col--date">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const meta    = STATUS_META[task.status] ?? { label: task.status, tone: 'todo' }
                  const overdue = isOverdue(task.due_at, task.status)
                  return (
                    <tr key={task.id} className="mtp-row">
                      <td>
                        <p className="mtp-task-title">{task.title}</p>
                        {task.description && (
                          <p className="mtp-task-desc">{task.description}</p>
                        )}
                      </td>
                      <td className="mtp-cell-muted">
                        {task.intern_name ?? '—'}
                      </td>
                      <td className={`mtp-deadline${overdue ? ' mtp-deadline--overdue' : ''}`}>
                        {formatDate(task.due_at)}
                        {overdue && <span className="mtp-overdue-badge">Quá hạn</span>}
                      </td>
                      <td>
                        <div className="mtp-progress-bar">
                          <div
                            className="mtp-progress-bar__fill"
                            style={{ width: `${task.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="mtp-progress-label">{task.progress ?? 0}%</span>
                      </td>
                      <td>
                        <span className={`mtp-badge mtp-badge--${meta.tone}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="mtp-cell-muted">{formatDate(task.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── MODAL ── */}
      {showModal && (
        <TaskCreateModal
          onClose={() => setShowModal(false)}
          onSuccess={handleTaskCreated}
          onToast={setToast}
        />
      )}
    </div>
  )
}
