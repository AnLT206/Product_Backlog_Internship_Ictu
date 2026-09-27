/**
 * InternListPage.jsx
 * Route dự kiến: /hr/interns
 *
 * US 3: "Là HR, tôi muốn tìm kiếm và lọc thực tập sinh theo trường/ngành
 *        để dễ dàng quản lý."
 *
 * KHỞI TẠO TỐI THIỂU — ghi vào PR:
 *   Đây là bản khởi tạo mới (InternListPage chưa tồn tại trong repo).
 *   Bảng hiển thị: Họ tên, Email, Trường, Ngành, Trạng thái, nút Sửa.
 *   Dữ liệu dùng MOCK — task 2 sẽ nối GET /api/hr/interns thật.
 *   Cột Action (Duyệt/Từ chối với InternActionButtons) để chỗ trống để
 *   tích hợp sau mà không phá vỡ cấu trúc bảng này.
 *
 * PHẠM VI TASK NÀY (filter UI):
 *   - Dropdown "Ngành" (major) — dữ liệu mock tạm
 *   - Input tìm kiếm (q) — placeholder "Tìm theo tên, email..."
 *   - State lưu giá trị lọc hiện tại (filterMajor, filterQ)
 *   - Lọc client-side trên mock data (task 2 sẽ đổi sang gọi API thật)
 *   - Nút "Xóa lọc" — reset về trạng thái ban đầu
 *   KHÔNG: debounce (task 2), gọi API (task 2), lọc theo university/status
 *
 * TODO (task 2):
 *   - Thay MOCK_INTERNS + MOCK_MAJORS bằng state + useEffect gọi
 *     GET /api/hr/interns?major=&q=&page= thật.
 *   - Tích hợp InternActionButtons vào cột Action.
 *   - Thêm phân trang.
 */

import { useState, useMemo } from 'react';
import './InternListPage.css';

/* ─────────────────────────────────────────────
   MOCK: Danh sách ngành mẫu
   TODO (task 2): Thay bằng danh sách từ API hoặc constants/majors.js
───────────────────────────────────────────── */
const MOCK_MAJORS = [
  'Công nghệ thông tin',
  'Kỹ thuật phần mềm',
  'Hệ thống thông tin',
  'An toàn thông tin',
  'Khoa học máy tính',
  'Truyền thông đa phương tiện',
];

/* ─────────────────────────────────────────────
   MOCK: Danh sách TTS mẫu — đủ cấu trúc field
   theo InternRegisterResponse (backend/app/schemas)
   TODO (task 2): Xóa, thay bằng state + fetch GET /api/hr/interns
───────────────────────────────────────────── */
const MOCK_INTERNS = [
  {
    id: 1,
    full_name:   'Nguyễn Văn An',
    email:       'an.nv@ictu.edu.vn',
    university:  'Đại học Công nghệ thông tin và Truyền thông',
    major:       'Công nghệ thông tin',
    status:      'pending',
  },
  {
    id: 2,
    full_name:   'Trần Thị Bình',
    email:       'binh.tt@ictu.edu.vn',
    university:  'Đại học Bách Khoa Hà Nội',
    major:       'Kỹ thuật phần mềm',
    status:      'active',
  },
  {
    id: 3,
    full_name:   'Lê Hoàng Cường',
    email:       'cuong.lh@ictu.edu.vn',
    university:  'Học viện Công nghệ Bưu chính Viễn thông',
    major:       'An toàn thông tin',
    status:      'active',
  },
  {
    id: 4,
    full_name:   'Phạm Thị Dung',
    email:       'dung.pt@ictu.edu.vn',
    university:  'Đại học Công nghệ thông tin và Truyền thông',
    major:       'Hệ thống thông tin',
    status:      'inactive',
  },
  {
    id: 5,
    full_name:   'Hoàng Văn Em',
    email:       'em.hv@ictu.edu.vn',
    university:  'Đại học Thái Nguyên',
    major:       'Công nghệ thông tin',
    status:      'pending',
  },
];

/* ─────────────────────────────────────────────
   Helper: avatar initials từ full_name
───────────────────────────────────────────── */
function initials(full_name) {
  const parts = (full_name ?? '').trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─────────────────────────────────────────────
   Helper: status label tiếng Việt
───────────────────────────────────────────── */
const STATUS_LABEL = {
  pending:  'Chờ duyệt',
  active:   'Đã duyệt',
  inactive: 'Từ chối',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * InternListPage
 *
 * Trang danh sách thực tập sinh dành cho HR.
 * Route: /hr/interns
 */
function InternListPage() {
  /* ──────────────────────────────────
     Filter state
     filterQ    : giá trị ô tìm kiếm (q)
     filterMajor: ngành được chọn trong dropdown
     TODO (task 2): truyền những state này vào query param khi gọi API thật
  ────────────────────────────────── */
  const [filterQ,     setFilterQ]     = useState('');
  const [filterMajor, setFilterMajor] = useState('');

  /* Kiểm tra có lọc nào đang áp dụng không */
  const hasActiveFilter = filterQ.trim() !== '' || filterMajor !== '';

  /* ── Lọc client-side trên mock data ──
     TODO (task 2): Xóa useMemo này, thay bằng gọi API với query params
  ────────────────────────────────────── */
  const filteredInterns = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    return MOCK_INTERNS.filter((intern) => {
      const matchMajor = filterMajor === '' || intern.major === filterMajor;
      const matchQ     = q === ''
        || intern.full_name.toLowerCase().includes(q)
        || intern.email.toLowerCase().includes(q);
      return matchMajor && matchQ;
    });
  }, [filterQ, filterMajor]);

  /* ── Reset bộ lọc ── */
  function handleClearFilter() {
    setFilterQ('');
    setFilterMajor('');
  }

  /* ── Render ── */
  return (
    <div className="intern-list-page">
      {/* Glow nền */}
      <div className="intern-list-page__glow" aria-hidden="true" />

      <div className="intern-list-shell">

        {/* ── Page header ── */}
        <div className="intern-list-header">
          <div className="intern-list-header__left">
            <span className="intern-list-badge">HR</span>
            <h1>Danh sách <span>thực tập sinh</span></h1>
            <p className="intern-list-subtitle">
              Xem và quản lý hồ sơ các thực tập sinh trong hệ thống.
            </p>
          </div>

          <a href="/hr/interns/new" id="intern-add-btn" className="intern-list-add-btn">
            + Thêm hồ sơ mới
          </a>
        </div>

        {/* ══════════════════════════════════════
            BỘ LỌC — phạm vi task này
            Dropdown Ngành + Input tìm kiếm
            Không có: lọc theo trường, lọc theo status
            ══════════════════════════════════════ */}
        <div
          className="intern-filter-bar"
          role="search"
          aria-label="Bộ lọc danh sách thực tập sinh"
        >
          {/* ── Ô tìm kiếm (q) ── */}
          <div className="intern-filter-group">
            <label className="intern-filter-label" htmlFor="intern-filter-q">
              Tìm kiếm
            </label>
            <input
              id="intern-filter-q"
              type="search"
              className="intern-filter-input"
              placeholder="Tìm theo tên, email..."
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              aria-label="Tìm kiếm theo tên hoặc email"
              autoComplete="off"
            />
          </div>

          {/* ── Dropdown Ngành (major) ── */}
          <div className="intern-filter-group">
            <label className="intern-filter-label" htmlFor="intern-filter-major">
              Ngành học
            </label>
            <select
              id="intern-filter-major"
              className="intern-filter-select"
              value={filterMajor}
              onChange={(e) => setFilterMajor(e.target.value)}
              aria-label="Lọc theo ngành học"
            >
              {/* TODO (task 2): thay options bằng dữ liệu thật từ API */}
              <option value="">— Tất cả ngành —</option>
              {MOCK_MAJORS.map((major) => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
          </div>

          {/* ── Nút Xóa lọc ── */}
          <button
            id="intern-filter-clear-btn"
            type="button"
            className="intern-filter-clear-btn"
            onClick={handleClearFilter}
            disabled={!hasActiveFilter}
            aria-label="Xóa tất cả bộ lọc"
          >
            ✕ Xóa lọc
          </button>

          {/* ── Hint khi đang lọc ── */}
          {hasActiveFilter && (
            <p className="intern-filter-active-hint" role="status" aria-live="polite">
              Đang lọc — hiển thị {filteredInterns.length} / {MOCK_INTERNS.length} hồ sơ
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════
            TABLE
            ══════════════════════════════════════ */}
        <div className="intern-list-card">
          <div className="intern-list-scroll">
            <table
              className="intern-list-table"
              id="intern-list-data-table"
              aria-label="Bảng danh sách thực tập sinh"
            >
              <thead>
                <tr>
                  <th className="col-no"     scope="col">#</th>
                  <th className="col-name"   scope="col">Họ và tên</th>
                  <th className="col-email"  scope="col">Email</th>
                  <th className="col-uni"    scope="col">Trường</th>
                  <th className="col-major"  scope="col">Ngành</th>
                  <th className="col-status" scope="col">Trạng thái</th>
                  {/* col-action: để trống cho InternActionButtons (task khác) */}
                  <th className="col-action" scope="col">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredInterns.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="intern-list-empty">
                        <span className="intern-list-empty__icon">🔍</span>
                        {hasActiveFilter
                          ? 'Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại.'
                          : 'Chưa có hồ sơ thực tập sinh nào.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInterns.map((intern, idx) => (
                    <tr key={intern.id}>
                      {/* STT */}
                      <td className="col-no">{idx + 1}</td>

                      {/* Họ tên + avatar */}
                      <td>
                        <div className="intern-cell-name">
                          <div
                            className="intern-avatar"
                            aria-hidden="true"
                            title={intern.full_name}
                          >
                            {initials(intern.full_name)}
                          </div>
                          <span className="intern-name-text">{intern.full_name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <span className="intern-email-text">{intern.email}</span>
                      </td>

                      {/* Trường */}
                      <td>{intern.university ?? '—'}</td>

                      {/* Ngành */}
                      <td>
                        {intern.major
                          ? <span className="intern-major-tag">{intern.major}</span>
                          : '—'}
                      </td>

                      {/* Trạng thái */}
                      <td className="col-status" style={{ textAlign: 'center' }}>
                        {/* TODO: Thay bằng <InternActionButtons> khi tích hợp action (task khác) */}
                        <span className={`intern-status-badge intern-status-badge--${intern.status}`}>
                          {STATUS_LABEL[intern.status] ?? intern.status}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="col-action" style={{ textAlign: 'center' }}>
                        <a
                          href={`/hr/interns/${intern.id}/edit`}
                          id={`intern-edit-btn-${intern.id}`}
                          className="intern-edit-btn"
                          aria-label={`Chỉnh sửa hồ sơ ${intern.full_name}`}
                        >
                          ✎ Sửa
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="intern-list-footer">
            {hasActiveFilter
              ? `${filteredInterns.length} / ${MOCK_INTERNS.length} hồ sơ`
              : `${MOCK_INTERNS.length} hồ sơ`}
          </div>
        </div>

      </div>
    </div>
  );
}

export default InternListPage;
