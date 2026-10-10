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
import { getSavedAvatar } from '../../utils/avatarHelper';
import InternActionButtons from './components/InternActionButtons';
import { getRealtimeSyncState, subscribeRealtimeEvents } from '../../utils/realtimeSync';
import './InternListPage.css';

const DEFAULT_MAJORS = [
  'Công nghệ thông tin',
  'Kỹ thuật phần mềm',
  'Khoa học máy tính',
  'An toàn thông tin',
  'Hệ thống thông tin',
  'Mạng máy tính & Truyền thông dữ liệu',
  'Trí tuệ nhân tạo & Khoa học dữ liệu',
  'Kỹ thuật máy tính',
];

/* ─────────────────────────────────────────────
   Helper: avatar initials từ full_name
───────────────────────────────────────────── */
function initials(full_name) {
  const trimmed = (full_name ?? '').trim();
  if (trimmed.toUpperCase() === 'TTS') return 'TTS';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].length <= 3 ? parts[0].toUpperCase() : (parts[0][0] ?? '?').toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  const [filterUni,   setFilterUni]   = useState('');
  const [availableMajors, setAvailableMajors] = useState(DEFAULT_MAJORS);
  const [availableUnis, setAvailableUnis] = useState([
    'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    'Đại học Thái Nguyên',
    'Trường Đại học Kỹ thuật Công nghiệp',
    'Trường Đại học Khoa học',
  ]);

  /* ── Debounce chỉ trên ô tìm kiếm text (300ms) ──
     Dropdown Ngành & Trường sẽ gọi API ngay (không qua debounce)    */
  const debouncedQuery = useDebounce(filterQ, 300);

  /* ── Data state ── */
  const [interns,  setInterns]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState(null);
  const [toast,    setToast]    = useState(null);

  /* Kiểm tra có lọc nào đang áp dụng không */
  const hasActiveFilter = filterQ.trim() !== '' || filterMajor !== '' || filterUni !== '';

  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      try {
        const { ok, data } = await getFilterOptions();
        if (isMounted && ok) {
          if (Array.isArray(data?.majors) && data.majors.length > 0) {
            setAvailableMajors(Array.from(new Set([...DEFAULT_MAJORS, ...data.majors])));
          }
          if (Array.isArray(data?.universities) && data.universities.length > 0) {
            setAvailableUnis(data.universities);
          }
        }
      } catch {
        // Giữ default
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
  async function loadInterns(retryCount = 1) {
    const res = await getInterns({
      major:      filterMajor,
      university: filterUni,
      q:          debouncedQuery.trim(),
      page:       1,
    });
    const { ok, data, status } = res;
    if (ok && data) {
      const syncState = getRealtimeSyncState();
      let localCvSubmitted = false;
      let localCvFileName = null;
      try {
        const cvSubRaw = localStorage.getItem('applicant_cv_submission');
        if (cvSubRaw) {
          const parsedCv = JSON.parse(cvSubRaw);
          if (parsedCv?.file_name && parsedCv.file_name !== 'CV_UngVien.pdf') {
            localCvSubmitted = true;
            localCvFileName = parsedCv.file_name;
          }
        }
      } catch {}

      let hasActiveLocalReject = false;
      try {
        const decRaw = localStorage.getItem('applicant_decision_status');
        if (decRaw) {
          const dec = JSON.parse(decRaw);
          if (dec?.status === 'rejected') {
            hasActiveLocalReject = true;
          }
        }
      } catch {}

      const NON_INTERN_EMAILS = new Set([
        'hr@ictu.edu.vn', 'hr2@ictu.edu.vn',
        'admin@ictu.edu.vn',
        'mentor@ictu.edu.vn', 'mentor2@ictu.edu.vn',
      ]);
      const isNonIntern = (item) => {
        const email = (item?.email || '').toLowerCase().trim();
        const role = (item?.role || '').toLowerCase().trim();
        if (role && role !== 'intern' && role !== 'applicant') return true;
        if (NON_INTERN_EMAILS.has(email)) return true;
        if (email.startsWith('hr') && email.endsWith('@ictu.edu.vn') && !email.includes('student')) return true;
        if (email.startsWith('admin') && email.endsWith('@ictu.edu.vn')) return true;
        if (email.startsWith('mentor') && email.endsWith('@ictu.edu.vn')) return true;
        return false;
      };

      const items = (data.items ?? []).filter((item) => !isNonIntern(item)).map((item) => {
        const syncMatch = (syncState.applicants || []).find(
          (a) => a.id === item.id || (item.email && a.email?.toLowerCase() === item.email?.toLowerCase())
        );
        const isApplicantAccount = item.email === 'ungvien@ictu.edu.vn' || item.id === 7;
        const hasCv = Boolean(item.has_cv) ||
          (Boolean(syncMatch?.cv_file) && syncMatch.cv_file !== 'CV_UngVien.pdf') ||
          (isApplicantAccount && localCvSubmitted);

        const activeReject = hasActiveLocalReject && syncMatch?.status !== 'pending';

        let resolvedStatus = item.status;
        if (item.status === 'active' || item.status === 'approved' || syncMatch?.status === 'approved') {
          resolvedStatus = 'active';
        } else if (syncMatch?.status === 'pending' || (isApplicantAccount && localCvSubmitted && !activeReject) || item.status === 'pending') {
          resolvedStatus = 'pending';
        } else if (activeReject || syncMatch?.status === 'rejected') {
          resolvedStatus = 'inactive';
        } else if (hasCv && item.status !== 'inactive' && item.status !== 'rejected') {
          resolvedStatus = 'pending';
        }

        return {
          ...item,
          status: resolvedStatus,
          has_cv: hasCv,
          cv_file_name: item.cv_file_name || (isApplicantAccount && localCvSubmitted ? localCvFileName : syncMatch?.cv_file),
          avatar: item.avatar || syncMatch?.avatar || getSavedAvatar(item.email, item.id, item.full_name),
        };
      });
      // Phân tách 2 luồng: Trang Quản lý hồ sơ TTS chỉ hiển thị các TTS chính thức (active/approved), không lẫn ứng viên pending
      const activeInterns = items.filter((item) => item.status === 'active' || item.status === 'approved');
      setInterns(activeInterns);
      setLoadErr(null);
    } else if (retryCount > 0 && (status === 401 || status === 403 || status === 0)) {
      await new Promise((r) => setTimeout(r, 400));
      return loadInterns(retryCount - 1);
    } else {
      setLoadErr('Không thể tải danh sách thực tập sinh, vui lòng thử lại.');
    }
    setLoading(false);
  }

  /* ── useEffect:
     - Chạy lại khi debouncedQuery đổi (sau 300ms ngừng gõ)
     - Chạy lại ngay khi filterMajor hoặc filterUni đổi (dropdown — không debounce)
     ESLint: "void" + setState SAU await (trong loadInterns)             */
  useEffect(() => {
    setLoading(true);
    void loadInterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filterMajor, filterUni]);

  useEffect(() => {
    const unsub = subscribeRealtimeEvents(() => {
      void loadInterns();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Reset bộ lọc ── */
  function handleClearFilter() {
    setFilterQ('');
    setFilterMajor('');
    setFilterUni('');
  }

  /* ── Render ── */
  return (
    <div className="intern-list-page">
      {/* Glow nền */}
      <div className="intern-list-page__glow" aria-hidden="true" />

      <div className="intern-list-shell">
        {toast && (
          <div
            id="intern-list-toast"
            className={`intern-list-toast intern-list-toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontWeight: 600,
              fontSize: '14px',
              background: toast.type === 'error' ? '#fef2f2' : '#eff6ff',
              border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#93c5fd'}`,
              color: toast.type === 'error' ? '#dc2626' : '#1d4ed8',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {toast.type === 'error' ? '✕ ' : '✓ '}
            {toast.message}
          </div>
        )}

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

          {/* ── Dropdown Trường học (university) — gọi API ngay ── */}
          <div className="intern-filter-group">
            <label className="intern-filter-label" htmlFor="intern-filter-uni">
              Trường học
            </label>
            <select
              id="intern-filter-uni"
              className="intern-filter-select"
              value={filterUni}
              onChange={(e) => setFilterUni(e.target.value)}
              aria-label="Lọc theo trường học"
            >
              <option value="">— Tất cả trường —</option>
              {availableUnis.map((uni) => (
                <option key={uni} value={uni}>{uni}</option>
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
                            style={{ overflow: 'hidden' }}
                          >
                            {intern.avatar ? (
                              <img
                                src={intern.avatar}
                                alt={intern.full_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline';
                                }}
                              />
                            ) : null}
                            <span style={{ display: intern.avatar ? 'none' : 'inline' }}>
                              {initials(intern.full_name)}
                            </span>
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

                      {/* Trạng thái & Thao tác duyệt */}
                      <td className="col-status" style={{ textAlign: 'center' }}>
                        <InternActionButtons
                          internId={intern.id}
                          status={intern.status}
                          hasCv={Boolean(intern.has_cv)}
                          cvFileName={intern.cv_file_name}
                          cvId={intern.cv_id}
                          intern={intern}
                          onSuccess={(toastPayload) => {
                            setToast(toastPayload);
                            loadInterns();
                            setTimeout(() => setToast(null), 4000);
                          }}
                        />
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
