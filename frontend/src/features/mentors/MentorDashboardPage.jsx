/**
 * MentorDashboardPage.jsx
 * Route: /mentor/dashboard
 *
 * US 15: "Là Mentor, tôi muốn giao nhiệm vụ cho thực tập sinh."
 *
 * Dashboard tổng quan dành riêng cho Mentor:
 *   A. Stat cards — tính từ dữ liệu API thật
 *   B. Thực tập sinh của tôi — GET /api/mentor/assigned-interns
 *   C. Nhiệm vụ gần đây — GET /api/mentor/tasks (5 mục mới nhất)
 *   D. Nhiệm vụ sắp đến hạn — lọc từ dữ liệu tasks trên FE
 *   E. Quick actions — bao gồm nút mở TaskCreateModal
 *
 * API thật đã dùng:
 *   GET /api/mentor/assigned-interns  — mentor_assignments.py
 *   GET /api/mentor/tasks             — tasks.py
 *   POST /api/mentor/tasks            — tasks.py (qua TaskCreateModal)
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAssignedInterns } from '../../api/mentors'
import { getMentorTasks } from '../../api/tasks'
import TaskCreateModal from './TaskCreateModal'
import './MentorDashboardPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */
const STATUS_META = {
  todo:     { label: 'Chưa bắt đầu', tone: 'todo'     },
  doing:    { label: 'Đang thực hiện', tone: 'doing'   },
  done:     { label: 'Hoàn thành',    tone: 'done'     },
  canceled: { label: 'Đã huỷ',        tone: 'canceled' },
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function isUpcoming(isoDate, status) {
  if (!isoDate || status === 'done' || status === 'canceled') return false
  const due  = new Date(isoDate)
  const now  = new Date()
  const diff = due - now
  // Sắp đến hạn: trong vòng 7 ngày và chưa hết hạn
  return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

function isOverdue(isoDate, status) {
  if (!isoDate || status === 'done' || status === 'canceled') return false
  return new Date(isoDate) < new Date()
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
export default function MentorDashboardPage() {
  const { user } = useAuth()

  /* ── Interns ── */
  const [interns,       setInterns]       = useState([])
  const [internsLoading, setInternsLoading] = useState(true)
  const [internsError,   setInternsError]   = useState(null)

  /* ── Tasks ── */
  const [tasks,       setTasks]       = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError,   setTasksError]   = useState(null)

  /* ── Modal & Toast ── */
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toast,           setToast]           = useState(null)

  /* ── Tự ẩn toast sau 4 giây ── */
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  /* ── Load Interns ── */
  async function loadInterns() {
    const { ok, data } = await getAssignedInterns()
    if (ok) {
      setInterns(data?.items ?? [])
      setInternsError(null)
    } else {
      setInternsError('Không thể tải danh sách thực tập sinh.')
    }
    setInternsLoading(false)
  }

  /* ── Load Tasks ── */
  async function loadTasks() {
    const { ok, data } = await getMentorTasks()
    if (ok) {
      setTasks(data?.items ?? [])
      setTasksError(null)
    } else {
      setTasksError('Không thể tải danh sách nhiệm vụ.')
    }
    setTasksLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInterns()
    void loadTasks()
  }, [])

  /* ── Tính stats từ dữ liệu thật ── */
  const stats = {
    internCount:  interns.length,
    taskDoing:    tasks.filter((t) => t.status === 'doing').length,
    taskDone:     tasks.filter((t) => t.status === 'done').length,
    taskUpcoming: tasks.filter((t) => isUpcoming(t.due_at, t.status)).length,
  }

  /* ── Callback sau khi POST /api/mentor/tasks thành công ──
     newTask là TaskResponse thật từ backend → thêm vào đầu danh sách.
     Stats / Nhiệm vụ gần đây / Sắp đến hạn đều tính từ `tasks`
     nên tự cập nhật ngay, không cần F5 hay gọi lại API. */
  const handleTaskCreated = useCallback((newTask) => {
    if (!newTask || newTask.id == null) return
    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)])
    setShowCreateModal(false)
  }, [])

  /* ── Recent tasks (5 mục đầu) ── */
  const recentTasks   = tasks.slice(0, 5)
  const upcomingTasks = tasks.filter((t) => isUpcoming(t.due_at, t.status))

  return (
    <div className="mentor-dash">

      {/* ── TOAST ── */}
      {toast && (
        <div className={`mentor-dash__toast mentor-dash__toast--${toast.type}`} role="alert">
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="mentor-dash__header">
        <div>
          <nav className="mentor-dash__crumb" aria-label="Breadcrumb">
            <span>Mentor</span>
            <span aria-hidden="true">/</span>
            <span>Tổng quan</span>
          </nav>
          <h1>Xin chào, {user?.full_name || 'Mentor'}</h1>
          <p className="mentor-dash__lead">
            Quản lý thực tập sinh và theo dõi tiến độ nhiệm vụ được phân công.
          </p>
        </div>
        <div className="mentor-dash__header-actions">
          <Link className="mentor-dash__btn mentor-dash__btn--ghost" to="/mentor/interns">
            Thực tập sinh
          </Link>
          <Link className="mentor-dash__btn mentor-dash__btn--ghost" to="/mentor/tasks">
            Nhiệm vụ
          </Link>
          <button
            id="mentor-dash-create-task-btn"
            type="button"
            className="mentor-dash__btn mentor-dash__btn--primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Giao nhiệm vụ
          </button>
        </div>
      </header>

      {/* ── STAT CARDS ── */}
      <section className="mentor-dash__stats" aria-label="Thống kê nhanh">
        <article className="mentor-stat mentor-stat--primary">
          <p className="mentor-stat__label">Thực tập sinh</p>
          <p className="mentor-stat__value">
            {internsLoading ? '…' : stats.internCount}
          </p>
          <p className="mentor-stat__hint">TTS đang trong quyền hướng dẫn</p>
        </article>
        <article className="mentor-stat mentor-stat--info">
          <p className="mentor-stat__label">Đang thực hiện</p>
          <p className="mentor-stat__value">
            {tasksLoading ? '…' : stats.taskDoing}
          </p>
          <p className="mentor-stat__hint">Nhiệm vụ đang làm</p>
        </article>
        <article className="mentor-stat mentor-stat--done">
          <p className="mentor-stat__label">Đã hoàn thành</p>
          <p className="mentor-stat__value">
            {tasksLoading ? '…' : stats.taskDone}
          </p>
          <p className="mentor-stat__hint">Nhiệm vụ đã hoàn thành</p>
        </article>
        <article className="mentor-stat mentor-stat--warn">
          <p className="mentor-stat__label">Sắp đến hạn</p>
          <p className="mentor-stat__value">
            {tasksLoading ? '…' : stats.taskUpcoming}
          </p>
          <p className="mentor-stat__hint">Trong vòng 7 ngày tới</p>
        </article>
      </section>

      {/* ── 2 COLUMNS: interns + upcoming ── */}
      <div className="mentor-dash__grid2">

        {/* ── THỰC TẬP SINH CỦA TÔI ── */}
        <section className="mentor-dash__panel" aria-label="Thực tập sinh của tôi">
          <div className="mentor-dash__panel-head">
            <div>
              <h2>Thực tập sinh của tôi</h2>
              <p className="mentor-dash__panel-desc">
                Chỉ hiển thị TTS đã được HR phân công cho bạn.
              </p>
            </div>
            <Link className="mentor-dash__text-link" to="/mentor/interns">
              Xem tất cả →
            </Link>
          </div>

          {internsLoading && (
            <div className="mentor-dash__loading" role="status">
              <span className="mentor-dash__spinner" aria-hidden="true" />
              <span>Đang tải…</span>
            </div>
          )}
          {!internsLoading && internsError && (
            <div className="mentor-dash__error" role="alert">⚠ {internsError}</div>
          )}
          {!internsLoading && !internsError && interns.length === 0 && (
            <div className="mentor-dash__empty">
              <span className="mentor-dash__empty-icon">👤</span>
              <p>Chưa có thực tập sinh nào được phân công cho bạn.</p>
              <p className="mentor-dash__empty-hint">HR sẽ phân công sau khi có chương trình thực tập.</p>
            </div>
          )}
          {!internsLoading && !internsError && interns.length > 0 && (
            <ul className="mentor-intern-list">
              {interns.slice(0, 6).map((intern) => (
                <li key={intern.intern_id} className="mentor-intern-item">
                  <div className="mentor-intern-avatar" aria-hidden="true">
                    {(intern.intern_name || intern.intern_email).charAt(0).toUpperCase()}
                  </div>
                  <div className="mentor-intern-info">
                    <p className="mentor-intern-name">{intern.intern_name || '—'}</p>
                    <p className="mentor-intern-meta">
                      {intern.intern_code && <span>{intern.intern_code}</span>}
                      {intern.intern_code && intern.program_name && <span> · </span>}
                      {intern.program_name && <span>{intern.program_name}</span>}
                    </p>
                  </div>
                </li>
              ))}
              {interns.length > 6 && (
                <li className="mentor-intern-more">
                  <Link to="/mentor/interns">Xem thêm {interns.length - 6} thực tập sinh…</Link>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* ── SẮP ĐẾN HẠN ── */}
        <section className="mentor-dash__panel" aria-label="Nhiệm vụ sắp đến hạn">
          <div className="mentor-dash__panel-head">
            <div>
              <h2>Sắp đến hạn</h2>
              <p className="mentor-dash__panel-desc">Nhiệm vụ đến hạn trong 7 ngày tới.</p>
            </div>
          </div>

          {tasksLoading && (
            <div className="mentor-dash__loading" role="status">
              <span className="mentor-dash__spinner" aria-hidden="true" />
              <span>Đang tải…</span>
            </div>
          )}
          {!tasksLoading && !tasksError && upcomingTasks.length === 0 && (
            <div className="mentor-dash__empty">
              <span className="mentor-dash__empty-icon">✅</span>
              <p>Không có nhiệm vụ nào sắp đến hạn.</p>
            </div>
          )}
          {!tasksLoading && upcomingTasks.length > 0 && (
            <ul className="mentor-upcoming-list">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="mentor-upcoming-item">
                  <div className="mentor-upcoming-info">
                    <p className="mentor-upcoming-title">{task.title}</p>
                    <p className="mentor-upcoming-meta">
                      {task.intern_name ?? '—'} · Hạn: {formatDate(task.due_at)}
                    </p>
                  </div>
                  <span className={`mentor-task-badge mentor-task-badge--${STATUS_META[task.status]?.tone ?? 'todo'}`}>
                    {STATUS_META[task.status]?.label ?? task.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── NHIỆM VỤ GẦN ĐÂY ── */}
      <section className="mentor-dash__panel mentor-dash__panel--stretch" aria-label="Nhiệm vụ gần đây">
        <div className="mentor-dash__panel-head">
          <div>
            <h2>Nhiệm vụ gần đây</h2>
            <p className="mentor-dash__panel-desc">5 nhiệm vụ mới nhất bạn đã giao.</p>
          </div>
          <Link className="mentor-dash__text-link" to="/mentor/tasks">
            Xem tất cả →
          </Link>
        </div>

        {tasksLoading && (
          <div className="mentor-dash__loading" role="status">
            <span className="mentor-dash__spinner" aria-hidden="true" />
            <span>Đang tải danh sách nhiệm vụ…</span>
          </div>
        )}
        {!tasksLoading && tasksError && (
          <div className="mentor-dash__error" role="alert">⚠ {tasksError}</div>
        )}
        {!tasksLoading && !tasksError && tasks.length === 0 && (
          <div className="mentor-dash__empty">
            <span className="mentor-dash__empty-icon">📋</span>
            <p>Chưa có nhiệm vụ nào được giao.</p>
            <button
              type="button"
              className="mentor-dash__btn mentor-dash__btn--primary"
              onClick={() => setShowCreateModal(true)}
            >
              + Giao nhiệm vụ đầu tiên
            </button>
          </div>
        )}
        {!tasksLoading && !tasksError && recentTasks.length > 0 && (
          <div className="mentor-table-wrap">
            <table className="mentor-table">
              <thead>
                <tr>
                  <th>Nhiệm vụ</th>
                  <th className="mentor-table__col--intern">Thực tập sinh</th>
                  <th className="mentor-table__col--deadline">Hạn chót</th>
                  <th className="mentor-table__col--progress">Tiến độ</th>
                  <th className="mentor-table__col--status">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => {
                  const meta    = STATUS_META[task.status] ?? { label: task.status, tone: 'todo' }
                  const overdue = isOverdue(task.due_at, task.status)
                  return (
                    <tr key={task.id} className="mentor-table__row">
                      <td>
                        <p className="mentor-table__title">{task.title}</p>
                        {task.description && (
                          <p className="mentor-table__desc">{task.description}</p>
                        )}
                      </td>
                      <td className="mentor-table__cell-muted">{task.intern_name ?? '—'}</td>
                      <td className={`mentor-table__deadline${overdue ? ' mentor-table__deadline--overdue' : ''}`}>
                        {formatDate(task.due_at)}
                        {overdue && <span className="mentor-table__overdue-badge">Quá hạn</span>}
                      </td>
                      <td>
                        <div className="mentor-progress-bar">
                          <div
                            className="mentor-progress-bar__fill"
                            style={{ width: `${task.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="mentor-progress-bar__label">{task.progress ?? 0}%</span>
                      </td>
                      <td>
                        <span className={`mentor-task-badge mentor-task-badge--${meta.tone}`}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── MODAL TẠO NHIỆM VỤ ── */}
      {showCreateModal && (
        <TaskCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTaskCreated}
          onToast={setToast}
        />
      )}
    </div>
  )
}
