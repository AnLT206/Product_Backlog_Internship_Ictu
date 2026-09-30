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

import { useState, useEffect } from 'react';
import MentorFormModal from './MentorFormModal';
import MentorAssignModal from './MentorAssignModal';
import { getMentors, getDepartments } from '../../api/mentors';
import './MentorListPage.css';

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
  const [mentors,            setMentors]            = useState([]);
  const [showModal,          setShowModal]          = useState(false);
  const [assignModalMentor,  setAssignModalMentor]  = useState(null);
  const [toast,              setToast]              = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [mentorRes, deptRes] = await Promise.all([
          getMentors(),
          getDepartments(),
        ]);

        if (!isMounted) return;

        const deptMap = {};
        if (deptRes.ok && Array.isArray(deptRes.data)) {
          deptRes.data.forEach((d) => {
            deptMap[d.id] = d.name;
          });
        }

        if (mentorRes.ok && Array.isArray(mentorRes.data)) {
          const mapped = mentorRes.data.map((m) => ({
            ...m,
            department: deptMap[m.department_id] || m.department || 'Chưa phân bổ',
            intern_count: m.intern_count ?? 0,
          }));
          setMentors(mapped);
        } else {
          setMentors([]);
        }
      } catch {
        if (isMounted) setMentors([]);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ── Mở modal ── */
  function handleOpenModal() {
    setShowModal(true);
  }

  /* ── Đóng modal ── */
  function handleCloseModal() {
    setShowModal(false);
  }

  /* ── Nhận toast từ MentorFormModal (qua prop onToast) ── */
  function handleToast(t) {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }

  /* ── Nhận mentor mới từ modal — dữ liệu thật từ POST /api/hr/mentors ── */
  function handleSaved(newMentor) {
    setMentors((prev) => [newMentor, ...prev]);
    setShowModal(false);
  }

  /* ── Cập nhật sau khi phân bổ thực tập sinh ── */
  function handleAssignSuccess(updatedMentor) {
    setMentors((prev) =>
      prev.map((m) =>
        m.id === updatedMentor.id
          ? { ...m, intern_count: updatedMentor.intern_count }
          : m
      )
    );
  }

  return (
    <div className="mentor-list-page">
      {/* Glow nền */}
      <div className="mentor-list-page__glow" aria-hidden="true" />

      {/* ── Toast thông báo ── */}
      {toast && (
        <div
          id="mentor-list-toast"
          className={`mentor-list-toast mentor-list-toast--${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {toast.type === 'error' ? '✕ ' : '✓ '}{toast.message}
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
                  <th className="col-action" scope="col" style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {mentors.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="mentor-list-empty">
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

                      {/* Thao tác phân bổ TTS */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="mentor-action-assign-btn"
                          onClick={() => setAssignModalMentor(mentor)}
                          title={`Phân bổ thực tập sinh cho mentor ${mentor.full_name}`}
                        >
                          Phân công TTS
                        </button>
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
          onToast={handleToast}
        />
      )}

      {/* ── Modal Phân công TTS cho Mentor ── */}
      {assignModalMentor && (
        <MentorAssignModal
          mentor={assignModalMentor}
          onClose={() => setAssignModalMentor(null)}
          onSuccess={handleAssignSuccess}
          onToast={handleToast}
        />
      )}
    </div>
  );
}

export default MentorListPage;
