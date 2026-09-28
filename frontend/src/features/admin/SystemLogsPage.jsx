/**
 * SystemLogsPage.jsx
 * Route: /admin/system-logs
 *
 * US 42 (spec §13): "Là admin, tôi muốn xem nhật ký hoạt động để theo dõi
 * các thao tác trong hệ thống."
 *
 * TASK 1 (đã xong — task trước):
 *   - Dựng Data Table với cột khớp đúng SystemLogResponse từ backend.
 *
 * TASK 2 (task này):
 *   - Tích hợp API thật: GET /api/admin/system-logs
 *     (query params: limit, offset, user_id — lấy đúng tên từ backend route)
 *   - State: logs, loading, error/toast, currentPage, userIdInput
 *   - Phân trang Next/Prev dựa vào response.total + response.limit (offset/limit)
 *     (backend KHÔNG trả total_pages/has_next — FE tự tính: totalPages = Math.ceil(total/limit))
 *   - Tìm kiếm theo user_id (integer) — nút "Tìm" hoặc Enter, không debounce
 *     (hook debounce không có trong repo, chọn cách đơn giản theo yêu cầu)
 *
 * Ghi chú: docs/api.md chưa có mô tả GET /api/admin/system-logs → cần bổ sung.
 */

import { useState, useEffect } from 'react';
import { getSystemLogs } from '../../api/admin';
import './SystemLogsPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   Hằng số phân trang
   ───────────────────────────────────────────────────────────────────────── */

const PAGE_LIMIT = 20; // số dòng mỗi trang — backend cho phép 1–200

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: thống kê nhanh từ dữ liệu hiện tại để render stat bar
   (giữ nguyên từ task 1)
   ───────────────────────────────────────────────────────────────────────── */

function countByAction(logs) {
  const result = { CREATE: 0, UPDATE: 0, DELETE: 0 };
  for (const log of logs) {
    if (log.action in result) result[log.action]++;
  }
  return result;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: định dạng ISO datetime → hiển thị thân thiện (2 dòng)
   (giữ nguyên từ task 1)
   ───────────────────────────────────────────────────────────────────────── */

function formatDatetime(isoStr) {
  if (!isoStr) return { date: '—', time: '' };
  const d = new Date(isoStr);
  const date = d.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const time = d.toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  return { date, time };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: phân loại status_code → CSS modifier
   (giữ nguyên từ task 1)
   ───────────────────────────────────────────────────────────────────────── */

function statusClass(code) {
  if (code >= 200 && code < 300) return 'ok';
  if (code >= 300 && code < 400) return 'warn';
  return 'err';
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */

/**
 * SystemLogsPage
 *
 * Hiển thị bảng nhật ký hoạt động hệ thống (admin only).
 * Cột dựa trực tiếp theo SystemLogResponse từ backend/app/schemas/system_log.py.
 *
 * Logic phân trang:
 *   - Backend dùng offset/limit, response trả { items, total, limit, offset }
 *   - FE tính: totalPages = Math.ceil(total / PAGE_LIMIT)
 *   - Prev disable khi currentPage === 1
 *   - Next disable khi currentPage >= totalPages (hoặc total === 0)
 *
 * Logic tìm kiếm:
 *   - Ô nhập user_id (integer) → bấm "Tìm" hoặc Enter → reset về trang 1 + gọi API
 *   - Xóa trắng ô tìm kiếm → bấm "Tìm" → tìm tất cả (bỏ filter user_id)
 */
function SystemLogsPage() {

  /* ── State ── */
  const [logs,         setLogs]         = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null); // { type: 'error', message }
  const [currentPage,  setCurrentPage]  = useState(1);
  // Giá trị đang nhập trong ô tìm kiếm (chưa submit)
  const [userIdInput,  setUserIdInput]  = useState('');
  // Giá trị đã submit — chỉ thay đổi khi bấm Tìm/Enter
  const [appliedUserId, setAppliedUserId] = useState(null); // null = không lọc

  /* ── Tính số trang từ total/limit (backend không trả sẵn) ── */
  const totalPages = total > 0 ? Math.ceil(total / PAGE_LIMIT) : 1;

  /* ── Hàm load dữ liệu ── */
  // Tất cả setState nằm BÊN TRONG hàm async này, không đặt trong thân useEffect
  async function loadLogs(page, userId) {
    setToast(null);

    const offset = (page - 1) * PAGE_LIMIT;
    const params = { limit: PAGE_LIMIT, offset };
    if (userId != null) params.user_id = userId;

    try {
      const { ok, status, data } = await getSystemLogs(params);

      if (ok) {
        setLogs(data.items ?? []);
        setTotal(data.total ?? 0);
      } else {
        // Hiện toast lỗi — format đơn giản, không phụ thuộc domain interns
        const msg = data?.detail
          ?? (status === 403
            ? 'Bạn không có quyền xem nhật ký hệ thống.'
            : `Lỗi ${status} — vui lòng thử lại.`);
        setToast({ type: 'error', message: msg });
        setLogs([]);
        setTotal(0);
      }
    } catch {
      setToast({ type: 'error', message: 'Không thể kết nối tới máy chủ, vui lòng thử lại.' });
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  /* ── Effect: gọi lại khi currentPage hoặc appliedUserId thay đổi ──
     setState KHÔNG đặt trong thân useEffect — chỉ gọi loadLogs()      */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs(currentPage, appliedUserId);
  }, [currentPage, appliedUserId]);

  /* ── Tự ẩn toast sau 5 giây ── */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  /* ── Handler: submit tìm kiếm (Enter hoặc nút Tìm) ── */
  function handleSearch(e) {
    e.preventDefault();
    const trimmed = userIdInput.trim();
    const parsed  = trimmed === '' ? null : parseInt(trimmed, 10);

    // Validate: phải là số nguyên dương nếu nhập
    if (trimmed !== '' && (Number.isNaN(parsed) || parsed < 1)) {
      setToast({ type: 'error', message: 'User ID phải là số nguyên dương (>= 1).' });
      return;
    }

    // Reset về trang 1 và áp dụng filter mới
    setCurrentPage(1);
    setAppliedUserId(parsed);
  }

  /* ── Handler: phân trang ── */
  function handlePrev() {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  }

  function handleNext() {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  }

  /* ── Thống kê action theo trang hiện tại ── */
  const counts = countByAction(logs);

  /* ── Render ── */
  return (
    <div className="sys-logs-page">
      {/* Glow nền */}
      <div className="sys-logs-page__glow" aria-hidden="true" />

      {/* ── Toast ── */}
      {toast && (
        <div
          id="sys-logs-toast"
          className={`sys-logs-toast sys-logs-toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'error' ? '✕ ' : '✓ '}
          {toast.message}
        </div>
      )}

      <div className="sys-logs-shell">

        {/* Back link */}
        <a href="/admin/dashboard" className="sys-logs-back">
          ← Quay lại tổng quan
        </a>

        {/* ── Page header ── */}
        <div className="sys-logs-header">
          <div className="sys-logs-header__left">
            <span className="sys-logs-badge">Admin</span>
            <h1>Nhật ký <span>hoạt động</span></h1>
            <p className="sys-logs-subtitle">
              Theo dõi các thao tác tạo, sửa, xóa dữ liệu trong hệ thống.
              Endpoint: <code>GET /api/admin/system-logs</code>
            </p>
          </div>

          {/* ── Thanh tìm kiếm theo user_id ── */}
          <form
            id="sys-logs-search-form"
            className="sys-logs-search"
            onSubmit={handleSearch}
            aria-label="Tìm kiếm nhật ký theo User ID"
          >
            <input
              id="sys-logs-search-input"
              type="number"
              min="1"
              step="1"
              className="sys-logs-search__input"
              placeholder="Tìm theo User ID…"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              aria-label="Nhập User ID cần tìm"
            />
            <button
              id="sys-logs-search-btn"
              type="submit"
              className="sys-logs-search__btn"
              disabled={loading}
            >
              Tìm
            </button>
          </form>
        </div>

        {/* ── Stat summary bar (tính từ trang hiện tại) ── */}
        <div className="sys-logs-stats" role="region" aria-label="Thống kê nhật ký trang hiện tại">
          <div className="sys-logs-stat-item">
            <span className="sys-logs-stat-item__dot sys-logs-stat-item__dot--total" />
            Tổng cộng
            <span className="sys-logs-stat-item__count">{loading ? '…' : total}</span>
          </div>
          <div className="sys-logs-stat-item">
            <span className="sys-logs-stat-item__dot sys-logs-stat-item__dot--create" />
            CREATE
            <span className="sys-logs-stat-item__count">{counts.CREATE}</span>
          </div>
          <div className="sys-logs-stat-item">
            <span className="sys-logs-stat-item__dot sys-logs-stat-item__dot--update" />
            UPDATE
            <span className="sys-logs-stat-item__count">{counts.UPDATE}</span>
          </div>
          <div className="sys-logs-stat-item">
            <span className="sys-logs-stat-item__dot sys-logs-stat-item__dot--delete" />
            DELETE
            <span className="sys-logs-stat-item__count">{counts.DELETE}</span>
          </div>
        </div>

        {/* ── Data Table card (cấu trúc giữ nguyên từ task 1) ── */}
        <div className="sys-logs-card">
          <div className="sys-logs-scroll">
            <table
              className="sys-logs-table"
              id="sys-logs-data-table"
              aria-label="Bảng nhật ký hoạt động hệ thống"
              aria-busy={loading}
            >
              {/* ── Column headers — tên cột khớp đúng field backend ── */}
              <thead>
                <tr>
                  <th className="col-id"     scope="col">#</th>
                  <th className="col-time"   scope="col">Thời gian</th>
                  <th className="col-user"   scope="col">User ID</th>
                  <th className="col-role"   scope="col">Vai trò</th>
                  <th className="col-action" scope="col">Action</th>
                  <th className="col-method" scope="col">Method</th>
                  <th className="col-path"   scope="col">Endpoint</th>
                  <th className="col-res"    scope="col">Đối tượng</th>
                  <th className="col-status" scope="col">Status</th>
                  <th className="col-ip"     scope="col">IP</th>
                </tr>
              </thead>

              <tbody>
                {/* Trạng thái đang tải */}
                {loading ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="sys-logs-loading">
                        <span className="sys-logs-loading__spinner" aria-hidden="true" />
                        Đang tải dữ liệu…
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  /* Empty state */
                  <tr>
                    <td colSpan={10}>
                      <div className="sys-logs-empty">
                        <span className="sys-logs-empty__icon">📋</span>
                        {appliedUserId != null
                          ? `Không tìm thấy nhật ký của User ID ${appliedUserId}.`
                          : 'Chưa có nhật ký nào.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* Danh sách log — render y chang task 1 */
                  logs.map((log) => {
                    const { date, time } = formatDatetime(log.created_at);
                    return (
                      <tr key={log.id}>
                        {/* id */}
                        <td className="col-id">{log.id}</td>

                        {/* created_at */}
                        <td>
                          <div className="cell-time">
                            <div className="cell-time__date">{date}</div>
                            <div className="cell-time__clock">{time}</div>
                          </div>
                        </td>

                        {/* user_id */}
                        <td>
                          {log.user_id != null ? (
                            <span className="cell-user">
                              <span className="cell-user__id" title={`User #${log.user_id}`}>
                                {log.user_id}
                              </span>
                            </span>
                          ) : (
                            <span className="cell-null">—</span>
                          )}
                        </td>

                        {/* role */}
                        <td>
                          {log.role ? (
                            <span className="cell-role">{log.role}</span>
                          ) : (
                            <span className="cell-null">—</span>
                          )}
                        </td>

                        {/* action */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`cell-action cell-action--${log.action}`}>
                            {log.action}
                          </span>
                        </td>

                        {/* method */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`cell-method cell-method--${log.method}`}>
                            {log.method}
                          </span>
                        </td>

                        {/* path */}
                        <td>
                          <span className="cell-path">{log.path}</span>
                        </td>

                        {/* resource */}
                        <td>
                          {log.resource ? (
                            <span className="cell-resource" title={log.resource}>
                              {log.resource}
                            </span>
                          ) : (
                            <span className="cell-null">—</span>
                          )}
                        </td>

                        {/* status_code */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`cell-status cell-status--${statusClass(log.status_code)}`}>
                            {log.status_code}
                          </span>
                        </td>

                        {/* ip_address */}
                        <td>
                          {log.ip_address ? (
                            <span className="cell-ip">{log.ip_address}</span>
                          ) : (
                            <span className="cell-null">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer: thông tin trang + nút phân trang ── */}
          <div className="sys-logs-footer">
            <span className="sys-logs-footer__count">
              {loading
                ? 'Đang tải…'
                : `Trang ${currentPage} / ${totalPages} — ${logs.length} / ${total} bản ghi`}
              {appliedUserId != null && (
                <> · Lọc User ID: <strong>{appliedUserId}</strong></>
              )}
            </span>

            {/* Nút phân trang */}
            <div className="sys-logs-pagination" role="navigation" aria-label="Phân trang nhật ký">
              <button
                id="sys-logs-prev-btn"
                type="button"
                className="sys-logs-page-btn"
                onClick={handlePrev}
                disabled={loading || currentPage <= 1}
                aria-label="Trang trước"
              >
                ← Trước
              </button>
              <span className="sys-logs-page-indicator" aria-current="page">
                {currentPage} / {totalPages}
              </span>
              <button
                id="sys-logs-next-btn"
                type="button"
                className="sys-logs-page-btn"
                onClick={handleNext}
                disabled={loading || currentPage >= totalPages}
                aria-label="Trang sau"
              >
                Sau →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SystemLogsPage;
