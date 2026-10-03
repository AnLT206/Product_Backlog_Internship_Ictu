/**
 * MentorAssignPage.jsx
 * Route: /hr/mentors/assign
 *
 * US: "Là HR, tôi muốn phân công thực tập sinh cho mentor để họ được hướng dẫn."
 *
 * Dữ liệu thật từ backend (src/api/):
 *   - GET  /api/hr/mentors                              → getMentors()
 *   - GET  /api/hr/interns?status=active&page_size=100  → getActiveInterns()
 *   - POST /api/hr/mentors/{mentor_id}/assign-interns   → assignInternsToMentor()
 *
 * TODO(backend): InternListItem (backend/app/schemas/intern.py) KHÔNG có field
 * mentor_id / has_mentor và GET /hr/interns không hỗ trợ lọc theo mentor.
 * Hiện hiển thị TOÀN BỘ TTS active; cần backend bổ sung field này để ẩn
 * các TTS đã có mentor.
 */
import { useEffect, useState } from 'react'
import { getMentors, assignInternsToMentor } from '../../api/mentors'
import { getActiveInterns, buildToast } from '../../api/interns'
import './MentorAssignPage.css'

const TOAST_MS = 4000
const NETWORK_ERROR = 'Không thể kết nối máy chủ, vui lòng thử lại.'

export default function MentorAssignPage() {
  const [mentors, setMentors] = useState([])
  const [interns, setInterns] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mentorId, setMentorId] = useState('')
  const [selected, setSelected] = useState([])
  const [toast, setToast] = useState(null)

  const allChecked = interns.length > 0 && selected.length === interns.length

  // Tự ẩn toast sau ít giây.
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  // Tải mentor + TTS khi mở trang (setState chỉ sau await).
  useEffect(() => {
    async function loadData() {
      try {
        const [mentorRes, internRes] = await Promise.all([
          getMentors(),
          getActiveInterns(),
        ])
        if (mentorRes.ok) {
          setMentors(Array.isArray(mentorRes.data) ? mentorRes.data : [])
        } else {
          setToast(buildToast(mentorRes.ok, mentorRes.status, mentorRes.data))
        }
        if (internRes.ok) {
          setInterns(internRes.data?.items ?? [])
        } else {
          setToast(buildToast(internRes.ok, internRes.status, internRes.data))
        }
      } catch {
        setToast({ type: 'error', message: NETWORK_ERROR })
      }
      setLoading(false)
    }
    void loadData()
  }, [])

  // Tải lại danh sách TTS sau khi phân công thành công (cập nhật bằng state, không reload trang).
  async function refreshInterns() {
    try {
      const { ok, status, data } = await getActiveInterns()
      if (ok) {
        setInterns(data?.items ?? [])
      } else {
        setToast(buildToast(ok, status, data))
      }
    } catch {
      setToast({ type: 'error', message: NETWORK_ERROR })
    }
  }

  function toggleIntern(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleAll() {
    setSelected(allChecked ? [] : interns.map((i) => i.id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return

    if (mentorId === '') {
      setToast({ type: 'error', message: 'Vui lòng chọn mentor.' })
      return
    }
    if (selected.length === 0) {
      setToast({ type: 'error', message: 'Vui lòng chọn ít nhất 1 thực tập sinh.' })
      return
    }

    setSubmitting(true)
    try {
      const { ok, status, data } = await assignInternsToMentor(
        Number(mentorId),
        selected,
        null,
      )
      if (ok) {
        const count = data?.assigned_count ?? selected.length
        setToast(
          buildToast(ok, status, data, `Đã phân công ${count} thực tập sinh cho mentor.`),
        )
        setSelected([])
        await refreshInterns()
      } else {
        setToast(buildToast(ok, status, data))
      }
    } catch {
      setToast({ type: 'error', message: NETWORK_ERROR })
    }
    setSubmitting(false)
  }

  return (
    <div className="mentor-assign-page">
      <div className="mentor-assign-page__glow" aria-hidden="true" />
      <div className="mentor-assign-shell">
        <header className="mentor-assign-header">
          <p className="mentor-assign-badge">Phân công</p>
          <h1 className="mentor-assign-title">Phân công mentor</h1>
          <p className="mentor-assign-subtitle">
            Chọn mentor và các thực tập sinh sẽ được mentor đó hướng dẫn.
          </p>
        </header>

        {toast && (
          <div
            className={`mentor-assign-toast mentor-assign-toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            {toast.message}
          </div>
        )}

        <form className="mentor-assign-card" onSubmit={handleSubmit} noValidate>
          <div className="mentor-assign-field">
            <label htmlFor="mentor-assign-select" className="mentor-assign-label">
              Mentor
            </label>
            <select
              id="mentor-assign-select"
              className="mentor-assign-select"
              value={mentorId}
              onChange={(e) => setMentorId(e.target.value)}
            >
              <option value="">-- Chọn mentor --</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          <div className="mentor-assign-field">
            <div className="mentor-assign-list-head">
              <span className="mentor-assign-label">Thực tập sinh</span>
              <label className="mentor-assign-check mentor-assign-check--all">
                <input
                  id="mentor-assign-check-all"
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                />
                <span>Chọn tất cả</span>
              </label>
            </div>

            <ul className="mentor-assign-list">
              {loading && (
                <li className="mentor-assign-empty">Đang tải dữ liệu...</li>
              )}
              {!loading && interns.length === 0 && (
                <li className="mentor-assign-empty">Không có thực tập sinh nào.</li>
              )}
              {interns.map((i) => (
                <li key={i.id} className="mentor-assign-item">
                  <label className="mentor-assign-check">
                    <input
                      id={`mentor-assign-intern-${i.id}`}
                      type="checkbox"
                      checked={selected.includes(i.id)}
                      onChange={() => toggleIntern(i.id)}
                    />
                    <span className="mentor-assign-intern">
                      <strong>{i.full_name}</strong>
                      <small>
                        {i.email}
                        {i.major ? ` · ${i.major}` : ''}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {/* TODO(backend): GET /hr/interns chưa có field mentor_id/has_mentor
                nên hiện hiển thị toàn bộ TTS active, chưa lọc "chưa có mentor". */}
            <p className="mentor-assign-hint">
              Đã chọn {selected.length}/{interns.length} thực tập sinh.
            </p>
          </div>

          <div className="mentor-assign-actions">
            <button
              id="mentor-assign-submit"
              type="submit"
              className="mentor-assign-btn"
              disabled={submitting || loading}
            >
              {submitting ? 'Đang phân công...' : 'Phân công'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
