/**
 * MentorListPage.jsx
 * Route: /hr/mentors
 *
 * US 29 (spec §7.3): "Là HR, tôi muốn thêm mới mentor để phân công cho TTS."
 *
 * TASK 1 (task này):
 *   - Giao diện tĩnh: bảng danh sách mentor với mock data.
 *   - Nút "Thêm mentor mới" → mở MentorFormModal (popup).
 *   - Khi modal submit thành công (mock): thêm mentor mới vào đầu danh sách.
 *   - Cột: Họ tên, Email, Phòng ban, Số TTS đang quản lý.
 *
 * TODO (task 2):
 *   - Thay MOCK_MENTORS bằng state + useEffect gọi GET /api/hr/mentors.
 *   - Xóa mock setTimeout trong MentorFormModal, nối POST /api/hr/mentors thật.
 */

import { useState } from 'react';
import MentorFormModal from './MentorFormModal';
import './MentorListPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK DATA
   Cấu trúc khớp theo spec §7.2 endpoint GET /api/hr/mentors:
     id           int
     full_name    str
     email        str
     department   str
     intern_count int    (từ GET /api/hr/mentors/workload hoặc join sẵn)

   TODO (task 2): Xóa mảng này, thay bằng state + fetch thật.
   ───────────────────────────────────────────────────────────────────────── */
const MOCK_MENTORS = [
  {
    id: 1,
    full_name:    'Nguyễn Văn Bình',
    email:        'binh.nv@ictu.edu.vn',
    department:   'Công nghệ thông tin',
    intern_count: 3,
  },
  {
    id: 2,
    full_name:    'Trần Thị Lan',
    email:        'lan.tt@ictu.edu.vn',
    department:   'Kỹ thuật phần mềm',
    intern_count: 2,
  },
  {
    id: 3,
    full_name:    'Lê Hoàng Nam',
    email:        'nam.lh@ictu.edu.vn',
    department:   'Hạ tầng & Vận hành',
    intern_count: 0,
  },
  {
    id: 4,
    full_name:    'Phạm Minh Tú',
    email:        'tu.pm@ictu.edu.vn',
    department:   'Thiết kế & Trải nghiệm',
    intern_count: 1,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: lấy chữ cái đầu của tên để làm avatar
   ───────────────────────────────────────────────────────────────────────── */
function initials(full_name) {
  const parts = full_name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */

/**
 * MentorListPage
 *
 * Trang danh sách mentor dành cho HR.
 * Route: /hr/mentors
 */
function MentorListPage() {
  /* TODO (task 2): Thay useState(MOCK_MENTORS) bằng useState([]) + useEffect fetch */
  const [mentors,    setMentors]    = useState(MOCK_MENTORS);
  const [showModal,  setShowModal]  = useState(false);
  const [toastMsg,   setToastMsg]   = useState(null);

  /* ── Mở modal ── */
  function handleOpenModal() {
    setShowModal(true);
  }

  /* ── Đóng modal ── */
  function handleCloseModal() {
    setShowModal(false);
  }

  /* ── Nhận mentor mới từ modal (task 1: mock; task 2: dữ liệu thật từ API) ── */
  function handleSaved(newMentor) {
    setMentors((prev) => [newMentor, ...prev]);
    setShowModal(false);
    setToastMsg(`Đã thêm mentor "${newMentor.full_name}" thành công.`);
    setTimeout(() => setToastMsg(null), 4000);
  }

  return (
    <div className="mentor-list-page">
      {/* Glow nền */}
      <div className="mentor-list-page__glow" aria-hidden="true" />

      {/* ── Toast thông báo ── */}
      {toastMsg && (
        <div
          id="mentor-list-toast"
          className="mentor-list-toast"
          role="status"
          aria-live="polite"
        >
          ✓ {toastMsg}
        </div>
      )}

      <div className="mentor-list-shell">

        {/* ── Page header ── */}
        <div className="mentor-list-header">
          <div className="mentor-list-header__left">
            <span className="mentor-list-badge">HR</span>
            <h1>Danh sách <span>Mentor</span></h1>
            <p className="mentor-list-subtitle">
              Quản lý danh sách mentor và phân công cho thực tập sinh.
            </p>
          </div>

          <button
            id="mentor-add-btn"
            type="button"
            className="mentor-add-btn"
            onClick={handleOpenModal}
          >
            + Thêm mentor mới
          </button>
        </div>

        {/* ── Data Table card ── */}
        <div className="mentor-list-card">
          <div className="mentor-list-scroll">
            <table
              className="mentor-list-table"
              id="mentor-list-data-table"
              aria-label="Bảng danh sách mentor"
            >
              <thead>
                <tr>
                  <th className="col-no"    scope="col">#</th>
                  <th className="col-name"  scope="col">Họ tên</th>
                  <th className="col-email" scope="col">Email</th>
                  <th className="col-dept"  scope="col">Phòng ban</th>
                  <th className="col-count" scope="col">Số TTS</th>
                </tr>
              </thead>

              <tbody>
                {mentors.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="mentor-list-empty">
                        <span className="mentor-list-empty__icon">👥</span>
                        Chưa có mentor nào. Bấm "Thêm mentor mới" để bắt đầu.
                      </div>
                    </td>
                  </tr>
                ) : (
                  mentors.map((mentor, idx) => (
                    <tr key={mentor.id}>
                      {/* STT */}
                      <td className="col-no">{idx + 1}</td>

                      {/* Họ tên + avatar */}
                      <td>
                        <div className="mentor-cell-name">
                          <div
                            className="mentor-avatar"
                            aria-hidden="true"
                            title={mentor.full_name}
                          >
                            {initials(mentor.full_name)}
                          </div>
                          <span className="mentor-name-text">{mentor.full_name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <span className="mentor-email">{mentor.email}</span>
                      </td>

                      {/* Phòng ban */}
                      <td>
                        <span className="mentor-dept-tag">{mentor.department}</span>
                      </td>

                      {/* Số TTS đang quản lý */}
                      <td className="col-count" style={{ textAlign: 'center' }}>
                        <span className="mentor-count-badge">{mentor.intern_count}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mentor-list-footer">
            {mentors.length} mentor
          </div>
        </div>

      </div>

      {/* ── Modal Thêm mentor ── */}
      {showModal && (
        <MentorFormModal
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

export default MentorListPage;
