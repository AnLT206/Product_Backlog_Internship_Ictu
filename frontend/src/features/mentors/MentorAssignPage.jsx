/**
 * MentorAssignPage.jsx
 * Route: /hr/mentors/assign
 *
 * US: "Là HR, tôi muốn phân công thực tập sinh cho mentor để họ được hướng dẫn."
 *
 * Task này (UI): dữ liệu MOCK, nút "Phân công" CHƯA gọi API.
 * Task kế tiếp: nối API thật
 *   - GET /hr/mentors                (danh sách mentor)
 *   - GET /hr/interns?status=active  (danh sách TTS)
 *   - endpoint gán mentor trong backend/app/api/routes/mentor_assignments.py
 *
 * TODO(backend): InternListItem (backend/app/schemas/intern.py) KHÔNG có field
 * mentor_id / has_mentor và GET /hr/interns không hỗ trợ lọc theo mentor.
 * Hiện hiển thị TOÀN BỘ TTS active; cần backend bổ sung field này để ẩn
 * các TTS đã có mentor.
 */
import { useState } from 'react'
import './MentorAssignPage.css'

// MOCK — sẽ thay bằng GET /hr/mentors
const MOCK_MENTORS = [
  { id: 1, full_name: 'Nguyễn Văn An', email: 'an.nguyen@ictu.edu.vn' },
  { id: 2, full_name: 'Trần Thị Bình', email: 'binh.tran@ictu.edu.vn' },
  { id: 3, full_name: 'Lê Hoàng Cường', email: 'cuong.le@ictu.edu.vn' },
]

// MOCK — sẽ thay bằng GET /hr/interns (status active)
const MOCK_INTERNS = [
  { id: 101, full_name: 'Phạm Minh Đức', email: 'duc.pham@sv.ictu.edu.vn', university: 'ĐH CNTT&TT', major: 'Khoa học máy tính' },
  { id: 102, full_name: 'Hoàng Thu Hà', email: 'ha.hoang@sv.ictu.edu.vn', university: 'ĐH CNTT&TT', major: 'Hệ thống thông tin' },
  { id: 103, full_name: 'Vũ Quang Huy', email: 'huy.vu@sv.ictu.edu.vn', university: 'ĐH CNTT&TT', major: 'Kỹ thuật phần mềm' },
  { id: 104, full_name: 'Đặng Ngọc Lan', email: 'lan.dang@sv.ictu.edu.vn', university: 'ĐH CNTT&TT', major: 'An toàn thông tin' },
]

export default function MentorAssignPage() {
  const [mentorId, setMentorId] = useState('')
  const [selected, setSelected] = useState([])

  const allChecked = selected.length === MOCK_INTERNS.length
  const canSubmit = mentorId !== '' && selected.length > 0

  function toggleIntern(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleAll() {
    setSelected(allChecked ? [] : MOCK_INTERNS.map((i) => i.id))
  }

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: gọi API phân công ở task sau — chưa gọi API ở task này.
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
              {MOCK_MENTORS.map((m) => (
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
              {MOCK_INTERNS.map((i) => (
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
                        {i.email} · {i.major}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {/* TODO(backend): GET /hr/interns chưa có field mentor_id/has_mentor
                nên hiện hiển thị toàn bộ TTS active, chưa lọc "chưa có mentor". */}
            <p className="mentor-assign-hint">
              Đã chọn {selected.length}/{MOCK_INTERNS.length} thực tập sinh.
            </p>
          </div>

          <div className="mentor-assign-actions">
            <button
              id="mentor-assign-submit"
              type="submit"
              className="mentor-assign-btn"
              disabled={!canSubmit}
            >
              Phân công
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
