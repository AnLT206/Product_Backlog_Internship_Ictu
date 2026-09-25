/**
 * ProgramListPage.jsx
 * Route dự kiến: /hr/programs
 *
 * US: "Là HR, tôi muốn tạo chương trình thực tập theo phòng ban."
 * Task 3: Giao diện bảng danh sách + nút dẫn sang form tạo mới.
 *
 * Dữ liệu hiện tại: MOCK (xem TODO bên dưới).
 * Không có search / filter / phân trang (không thuộc task này).
 */

import './ProgramListPage.css';

/* ─────────────────────────────────────────────
   Mock data
   TODO: Thay bằng fetch GET /api/hr/programs khi BE sẵn sàng
         (software-specification.md §7.2).
   Format trả về dự kiến:
   [{ id, name, department, description, start_date, end_date }]
───────────────────────────────────────────── */
const MOCK_PROGRAMS = [
  {
    id: 1,
    name: 'Chương trình thực tập Hè 2026',
    department: 'Công nghệ thông tin',
    start_date: '2026-06-01',
    end_date: '2026-08-31',
  },
  {
    id: 2,
    name: 'Thực tập Kỹ thuật phần mềm Q3',
    department: 'Kỹ thuật phần mềm',
    start_date: '2026-07-15',
    end_date: '2026-10-15',
  },
  {
    id: 3,
    name: 'Thực tập Quản trị hệ thống',
    department: 'Hạ tầng & Vận hành',
    start_date: '2026-09-01',
    end_date: '2026-11-30',
  },
];

/** Định dạng ngày YYYY-MM-DD → DD/MM/YYYY cho hiển thị */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * ProgramListPage
 * Hiển thị danh sách chương trình thực tập (dữ liệu mock).
 * Nút "Tạo chương trình mới" dẫn sang /hr/programs/new.
 */
function ProgramListPage() {
  /* TODO: Thay MOCK_PROGRAMS bằng state + useEffect gọi GET /api/hr/programs */
  const programs = MOCK_PROGRAMS;

  return (
    <div className="program-list-page">
      <div className="program-list-wrapper">

        {/* ── Header ── */}
        <div className="program-list-header">
          <div className="program-list-title">
            <h1>Chương trình <span>thực tập</span></h1>
            <p className="program-list-subtitle">
              Quản lý các chương trình thực tập theo phòng ban
            </p>
          </div>

          {/* Nút tạo mới → /hr/programs/new */}
          <a
            id="program-new-btn"
            href="/hr/programs/new"
            className="program-new-btn"
          >
            <span className="program-new-btn__icon">＋</span>
            Tạo chương trình mới
          </a>
        </div>

        {/* ── Bảng danh sách ── */}
        <div className="program-table-card">
          {programs.length === 0 ? (
            <div className="program-empty">
              <span className="program-empty__icon">📋</span>
              Chưa có chương trình thực tập nào.
              <br />
              Bấm <strong>Tạo chương trình mới</strong> để bắt đầu.
            </div>
          ) : (
            <table className="program-table">
              <thead>
                <tr>
                  <th>Tên chương trình</th>
                  <th>Phòng ban</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((prog) => (
                  <tr key={prog.id}>
                    <td className="prog-name">{prog.name}</td>
                    <td>
                      <span className="prog-dept-badge">{prog.department}</span>
                    </td>
                    <td className="prog-date">{formatDate(prog.start_date)}</td>
                    <td className="prog-date">{formatDate(prog.end_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default ProgramListPage;
