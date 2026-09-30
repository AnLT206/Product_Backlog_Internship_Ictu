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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPrograms } from '../../api/programs';
import './ProgramListPage.css';

/** Định dạng ngày YYYY-MM-DD → DD/MM/YYYY cho hiển thị */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * ProgramListPage
 * Hiển thị danh sách chương trình thực tập từ backend.
 * Nút "Tạo chương trình mới" dẫn sang /hr/programs/new.
 */
function ProgramListPage() {
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchList() {
      try {
        const res = await getPrograms();
        if (!isMounted) return;
        if (res.ok && Array.isArray(res.data)) {
          setPrograms(res.data);
        } else {
          setPrograms([]);
        }
      } catch {
        if (isMounted) setPrograms([]);
      }
    }

    fetchList();
    return () => {
      isMounted = false;
    };
  }, []);

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
          <Link
            id="program-new-btn"
            to="/hr/programs/new"
            className="program-new-btn"
          >
            <span className="program-new-btn__icon">＋</span>
            Tạo chương trình mới
          </Link>
        </div>

        {/* ── Bảng danh sách ── */}
        <div className="program-table-card">
          {programs.length === 0 ? (
            <div className="program-empty">
              
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
