/**
 * InternListPage.jsx
 * Route: /hr/interns
 *
 * US 3: "Là HR, tôi muốn tìm kiếm và lọc thực tập sinh theo trường/ngành
 *        để dễ dàng quản lý."
 *
 * Task 1 (done): Giao diện tĩnh + bộ lọc client-side trên mock data.
 *
 * Task 2 (task này):
 *   - Tạo useDebounce (frontend/src/hooks/useDebounce.js) — mới.
 *   - Thêm getInterns() vào src/api/interns.js — MOCK, TODO khi BE có thật.
 *   - Áp dụng debounce 300ms cho ô tìm kiếm.
 *   - Dropdown Ngành thay đổi → gọi API ngay (không debounce).
 *   - Thay lọc client-side (useMemo) bằng useEffect + getInterns().
 *   - Hiển thị trạng thái loading, empty state rõ ràng.
 *
 * KHÔNG thêm: phân trang (task chưa yêu cầu — page param dự phòng trong API).
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useDebounce from '../../hooks/useDebounce';
import { getInterns, getFilterOptions } from '../../api/interns';
import './InternListPage.css';

const DEFAULT_MAJORS = [
  'Công nghệ thông tin',
  'Kỹ thuật phần mềm',
  'Hệ thống thông tin',
  'An toàn thông tin',
  'Khoa học máy tính',
  'Truyền thông đa phương tiện',
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
  /* ── Filter state ── */
  const [filterQ,     setFilterQ]     = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [availableMajors, setAvailableMajors] = useState(DEFAULT_MAJORS);

  /* ── Debounce chỉ trên ô tìm kiếm text (300ms) ──
     Dropdown Ngành sẽ gọi API ngay (không qua debounce)    */
  const debouncedQuery = useDebounce(filterQ, 300);

  /* ── Data state ── */
  const [interns,  setInterns]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState(null);

  /* Kiểm tra có lọc nào đang áp dụng không */
  const hasActiveFilter = filterQ.trim() !== '' || filterMajor !== '';

  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      try {
        const { ok, data } = await getFilterOptions();
        if (isMounted && ok && Array.isArray(data?.majors) && data.majors.length > 0) {
          setAvailableMajors(data.majors);
        }
      } catch {
        // Giữ DEFAULT_MAJORS
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ─────────────────────────────────────────────
     loadInterns — khai báo TRƯỚC useEffect
     Mọi setState đều SAU await → tránh ESLint set-state-in-effect
  ───────────────────────────────────────────── */
  async function loadInterns() {
    const { ok, data } = await getInterns({
      major: filterMajor,
      q:     debouncedQuery.trim(),
      page:  1,
    });
    if (ok) {
      setInterns(data.items ?? []);
      setLoadErr(null);
    } else {
      setLoadErr('Không thể tải danh sách thực tập sinh, vui lòng thử lại.');
    }
    setLoading(false);
  }

  /* ── useEffect:
     - Chạy lại khi debouncedQuery đổi (sau 300ms ngừng gõ)
     - Chạy lại ngay khi filterMajor đổi (dropdown — không debounce)
     ESLint: "void" + setState SAU await (trong loadInterns)             */
  useEffect(() => {
    setLoading(true);
    void loadInterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filterMajor]);

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

          <Link to="/hr/interns/new" id="intern-add-btn" className="intern-list-add-btn">
            + Thêm hồ sơ mới
          </Link>
        </div>

        {/* ══════════════════════════════════════
            BỘ LỌC
            - Input tìm kiếm: debounce 300ms
            - Dropdown Ngành: gọi API ngay
            ══════════════════════════════════════ */}
        <div
          className="intern-filter-bar"
          role="search"
          aria-label="Bộ lọc danh sách thực tập sinh"
        >
          {/* ── Ô tìm kiếm (q) — có debounce ── */}
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

          {/* ── Dropdown Ngành (major) — gọi API ngay ── */}
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
              <option value="">— Tất cả ngành —</option>
              {availableMajors.map((major) => (
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
            Xóa lọc
          </button>

          {/* ── Hint khi đang lọc và đã có kết quả ── */}
          {!loading && hasActiveFilter && (
            <p className="intern-filter-active-hint" role="status" aria-live="polite">
              Đang lọc — hiển thị {interns.length} hồ sơ
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
              aria-busy={loading}
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
                {/* ── Loading ── */}
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="intern-list-empty" role="status" aria-live="polite">
                        
                        Đang tải dữ liệu…
                      </div>
                    </td>
                  </tr>

                ) : loadErr ? (
                  /* ── Lỗi tải ── */
                  <tr>
                    <td colSpan={7}>
                      <div className="intern-list-empty" role="alert">
                        
                        {loadErr}
                      </div>
                    </td>
                  </tr>

                ) : interns.length === 0 ? (
                  /* ── Empty state ── */
                  <tr>
                    <td colSpan={7}>
                      <div className="intern-list-empty">
                        
                        {hasActiveFilter
                          ? 'Không tìm thấy thực tập sinh phù hợp.'
                          : 'Chưa có hồ sơ thực tập sinh nào.'}
                      </div>
                    </td>
                  </tr>

                ) : (
                  /* ── Dữ liệu ── */
                  interns.map((intern, idx) => (
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
                        <Link
                          to={`/hr/interns/${intern.id}/edit`}
                          id={`intern-edit-btn-${intern.id}`}
                          className="intern-edit-btn"
                          aria-label={`Chỉnh sửa hồ sơ ${intern.full_name}`}
                        >
                          Sửa
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && !loadErr && (
            <div className="intern-list-footer">
              {hasActiveFilter
                ? `${interns.length} hồ sơ khớp bộ lọc`
                : `${interns.length} hồ sơ`}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default InternListPage;
