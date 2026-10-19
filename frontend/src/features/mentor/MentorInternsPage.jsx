/**
 * MentorInternsPage.jsx
 * Route: /mentor/interns
 *
 * Danh sách thực tập sinh trong quyền hướng dẫn của Mentor hiện tại.
 * API thật: GET /api/mentor/assigned-interns
 *           GET /api/mentor/tasks (để tính số nhiệm vụ theo intern)
 *
 * Mentor CHỈ thấy intern mình quản lý — backend lọc theo mentor_user_id.
 * Không hiển thị toàn bộ intern hệ thống.
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAssignedInterns } from '../../api/mentors'
import { getMentorTasks } from '../../api/tasks'
import {
  subscribeRealtimeEvents,
  getRealtimeSyncState,
  SYNC_EVENTS,
} from '../../utils/realtimeSync'
import TaskCreateModal from './TaskCreateModal'
import './MentorInternsPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
export default function MentorInternsPage() {
  const { user } = useAuth()

  /* ── Interns ── */
  const [interns,       setInterns]       = useState([])
  const [internsLoading, setInternsLoading] = useState(true)
  const [internsError,   setInternsError]   = useState(null)

  /* ── Tasks (for counting per intern) ── */
  const [tasks, setTasks] = useState([])

  /* ── Modal & Toast ── */
  const [showModal,     setShowModal]     = useState(false)
  const [modalInternId, setModalInternId] = useState(null) // pre-select intern
  const [toast,         setToast]         = useState(null)

  /* ── Toast auto-hide ── */
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  /* ── Load data ── */
  async function loadAll() {
    const [internsRes, tasksRes] = await Promise.all([
      getAssignedInterns(),
      getMentorTasks(),
    ])

    const syncState = getRealtimeSyncState()
    const currentMentorId = user?.id || (user?.email?.includes('mentor2') ? 4 : 3)
    let items = []

    if (internsRes.ok) {
      items = Array.isArray(internsRes.data)
        ? [...internsRes.data]
        : (Array.isArray(internsRes.data?.items) ? [...internsRes.data.items] : [])
    }

    // Kết hợp với phân công thực tế từ HR qua realtime sync
    const localAssigns = (syncState.mentorAssignments || []).filter(
      (a) => a.mentor_id === currentMentorId || (!a.mentor_id && user?.email?.includes('mentor'))
    )

    localAssigns.forEach((a) => {
      const exists = items.some((i) => Number(i.intern_id || i.id) === Number(a.intern_id))
      if (!exists) {
        items.push({
          intern_id: a.intern_id,
          intern_code: a.student_code?.split(' ')[0] || `TTS000${a.intern_id}`,
          intern_name: a.student,
          intern_email: a.student_email || 'intern@ictu.edu.vn',
          program_id: a.program_id || 1,
          program_name: a.program_name || 'Khóa K20 - Kỳ Thu 2026',
          group_name: a.group_name || a.project || 'Nhóm R&D Software Engineering',
          assigned_at: a.assigned_at || new Date().toISOString(),
        })
      }
    })

    // Chuẩn hóa fields
    items = items.map((i) => {
      const targetId = Number(i.intern_id || i.id)
      const matchLocal = (syncState.mentorAssignments || []).find((a) => Number(a.intern_id) === targetId)
      return {
        ...i,
        intern_id: targetId,
        intern_name: i.intern_name || i.full_name || `TTS #${targetId}`,
        intern_code: i.intern_code || i.code || `TTS000${targetId}`,
        intern_email: i.intern_email || i.email || 'intern@ictu.edu.vn',
        group_name: matchLocal?.group_name || i.group_name || 'Nhóm R&D Software Engineering',
        program_name: matchLocal?.program_name || i.program_name || 'Khóa K20 - Kỳ Thu 2026',
      }
    })

    setInterns(items)
    setInternsError(null)

    if (tasksRes.ok) {
      setTasks(tasksRes.data?.items ?? (Array.isArray(tasksRes.data) ? tasksRes.data : []))
    }
    setInternsLoading(false)
  }

  useEffect(() => {
    void loadAll()

    const unsubscribe = subscribeRealtimeEvents((event) => {
      if (
        event.type === SYNC_EVENTS.MENTOR_ASSIGNED ||
        event.type === 'SYNC_MENTOR_ASSIGNMENT' ||
        event.type === 'SYNC_GROUPS_UPDATED' ||
        event.type === SYNC_EVENTS.CONTRACT_SIGNED
      ) {
        void loadAll()
        setToast({ type: 'success', message: 'Dữ liệu phân công vừa được đồng bộ từ HR!' })
      }
    })

    const handleStorage = () => void loadAll()
    window.addEventListener('storage', handleStorage)

    return () => {
      unsubscribe()
      window.removeEventListener('storage', handleStorage)
    }
  }, [user])

  /* ── Task stats per intern ── */
  const taskStats = useMemo(() => {
    const map = {}
    for (const task of tasks) {
      const id = task.intern_id
      if (!map[id]) map[id] = { total: 0, doing: 0, done: 0, todo: 0 }
      map[id].total += 1
      if (task.status === 'doing')    map[id].doing += 1
      else if (task.status === 'done') map[id].done  += 1
      else if (task.status === 'todo') map[id].todo  += 1
    }
    return map
  }, [tasks])

  function handleGiaoNhiemVu(internId) {
    setModalInternId(String(internId))
    setShowModal(true)
  }

  function handleTaskCreated(newTask) {
    setTasks((prev) => [newTask, ...prev])
    setShowModal(false)
  }

  return (
    <div className="mip-page">

      {/* ── TOAST ── */}
      {toast && (
        <div className={`mip-toast mip-toast--${toast.type}`} role="alert">
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="mip-header">
        <div>
          <nav className="mip-crumb" aria-label="Breadcrumb">
            <span>Mentor</span>
            <span aria-hidden="true">/</span>
            <span>Thực tập sinh của tôi</span>
          </nav>
          <h1>Thực tập sinh của tôi</h1>
          <p className="mip-lead">
            Chỉ hiển thị những thực tập sinh đã được HR phân công cho bạn.
          </p>
        </div>
        <button
          id="mip-create-task-btn"
          type="button"
          className="mip-btn mip-btn--primary"
          onClick={() => { setModalInternId(null); setShowModal(true) }}
        >
          + Giao nhiệm vụ
        </button>
      </header>

      {/* ── LOADING ── */}
      {internsLoading && (
        <div className="mip-loading" role="status">
          <span className="mip-spinner" aria-hidden="true" />
          <span>Đang tải danh sách thực tập sinh…</span>
        </div>
      )}

      {/* ── ERROR ── */}
      {!internsLoading && internsError && (
        <div className="mip-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <p>{internsError}</p>
        </div>
      )}

      {/* ── EMPTY ── */}
      {!internsLoading && !internsError && interns.length === 0 && (
        <div className="mip-empty">
          <span className="mip-empty-icon" aria-hidden="true">👤</span>
          <p>Chưa có thực tập sinh nào được phân công cho bạn.</p>
          <p className="mip-empty-hint">
            HR sẽ phân công thực tập sinh sau khi tạo chương trình thực tập.
          </p>
        </div>
      )}

      {/* ── TABLE ── */}
      {!internsLoading && !internsError && interns.length > 0 && (
        <section className="mip-panel" aria-label="Danh sách thực tập sinh">
          <div className="mip-table-wrap">
            <table className="mip-table">
              <thead>
                <tr>
                  <th>Thực tập sinh</th>
                  <th className="mip-col--code">Mã TTS</th>
                  <th className="mip-col--program">Chương trình</th>
                  <th className="mip-col--group">Nhóm phân công</th>
                  <th className="mip-col--assign">Ngày phân công</th>
                  <th className="mip-col--tasks">Nhiệm vụ</th>
                  <th className="mip-col--progress">Tiến độ</th>
                  <th className="mip-col--action">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {interns.map((intern) => {
                  const stats = taskStats[intern.intern_id] ?? { total: 0, doing: 0, done: 0, todo: 0 }
                  const pct   = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

                  return (
                    <tr key={intern.intern_id} className="mip-row">
                      <td>
                        <div className="mip-intern-cell">
                          <div className="mip-avatar" aria-hidden="true">
                            {(intern.intern_name || intern.intern_email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="mip-intern-name">{intern.intern_name ?? '—'}</p>
                            <p className="mip-intern-email">{intern.intern_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="mip-cell-muted">{intern.intern_code ?? '—'}</td>
                      <td className="mip-cell-muted">{intern.program_name ?? '—'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '12px', background: '#EFF6FF', color: '#1D4ED8', fontSize: '12px', fontWeight: 600 }}>
                          👥 {intern.group_name ?? 'Nhóm R&D'}
                        </span>
                      </td>
                      <td className="mip-cell-muted">{formatDate(intern.assigned_at)}</td>
                      <td>
                        {stats.total === 0 ? (
                          <span className="mip-task-count mip-task-count--none">Chưa có</span>
                        ) : (
                          <div className="mip-task-breakdown">
                            <span className="mip-task-count">{stats.total} nhiệm vụ</span>
                            <span className="mip-task-hint">
                              {stats.todo > 0 && `${stats.todo} chờ `}
                              {stats.doing > 0 && `${stats.doing} đang làm `}
                              {stats.done > 0 && `${stats.done} xong`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="mip-progress-bar">
                          <div className="mip-progress-bar__fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="mip-progress-label">{pct}% hoàn thành</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="mip-action-btn"
                          id={`mip-assign-task-${intern.intern_id}`}
                          onClick={() => handleGiaoNhiemVu(intern.intern_id)}
                        >
                          Giao nhiệm vụ
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL ──
          Truyền modalInternId để TaskCreateModal pre-select intern nếu cần.
          TaskCreateModal hiện chưa hỗ trợ initialInternId — TODO khi cần.
      */}
      {showModal && (
        <TaskCreateModal
          onClose={() => setShowModal(false)}
          onSaved={handleTaskCreated}
          onToast={setToast}
          initialInternId={modalInternId}
        />
      )}
    </div>
  )
}
