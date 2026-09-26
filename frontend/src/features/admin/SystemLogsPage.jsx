/**
 * SystemLogsPage.jsx
 * Route: /admin/system-logs
 *
 * US 42 (spec §13): "Là admin, tôi muốn xem nhật ký hoạt động để theo dõi
 * các thao tác trong hệ thống."
 *
 * TASK 1 (task này):
 *   - Dựng Data Table hiển thị danh sách nhật ký.
 *   - Cột dựa CHÍNH XÁC theo schema thật đọc từ backend:
 *       backend/app/schemas/system_log.py → SystemLogResponse
 *     Fields: id, user_id, role, action, method, path, resource,
 *             ip_address, user_agent, status_code, created_at
 *   - Endpoint thật: GET /api/admin/system-logs
 *     (backend/app/api/routes/admin.py, đã merge qua PR us-42-system-logs-get-api)
 *   - Dữ liệu GIẢ (mock tĩnh) — KHÔNG gọi API (task 2 sẽ nối API thật).
 *
 * TASK 2 (chưa làm):
 *   - Nối API thật: GET /api/admin/system-logs
 *   - Thêm phân trang / filter theo action, user_id, khoảng thời gian.
 *
 * Ghi chú docs: docs/api.md chưa có mô tả endpoint GET /api/admin/system-logs.
 *   → Cần bổ sung vào docs/api.md khi task 2 hoàn thành.
 */

import './SystemLogsPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK DATA
   Cấu trúc khớp 100% với SystemLogResponse (backend/app/schemas/system_log.py):
     id            int
     user_id       int | None
     role          str | None
     action        "CREATE" | "UPDATE" | "DELETE"
     method        str       (HTTP verb thật của request)
     path          str       (đường dẫn endpoint)
     resource      str | None
     ip_address    str | None
     user_agent    str | None
     status_code   int       (HTTP status code thật)
     created_at    datetime  (ISO 8601)

   TODO (task 2): Xóa mảng này, thay bằng state + useEffect gọi
     GET /api/admin/system-logs?limit=50&offset=0
   ───────────────────────────────────────────────────────────────────────── */
const MOCK_LOGS = [
  {
    id: 12,
    user_id: 3,
    role: 'hr',
    action: 'CREATE',
    method: 'POST',
    path: '/api/hr/interns',
    resource: 'intern#7',
    ip_address: '192.168.1.42',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
    status_code: 201,
    created_at: '2026-09-26T14:32:11.000Z',
  },
  {
    id: 11,
    user_id: 3,
    role: 'hr',
    action: 'UPDATE',
    method: 'POST',
    path: '/api/hr/interns/5/approve',
    resource: 'intern#5',
    ip_address: '192.168.1.42',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
    status_code: 200,
    created_at: '2026-09-26T13:50:04.000Z',
  },
  {
    id: 10,
    user_id: 1,
    role: 'admin',
    action: 'CREATE',
    method: 'POST',
    path: '/api/admin/users',
    resource: 'user#6',
    ip_address: '10.0.0.5',
    user_agent: 'Mozilla/5.0 (Macintosh)',
    status_code: 201,
    created_at: '2026-09-26T10:15:22.000Z',
  },
  {
    id: 9,
    user_id: 2,
    role: 'admin',
    action: 'UPDATE',
    method: 'PUT',
    path: '/api/admin/users/4/role',
    resource: 'user#4',
    ip_address: '10.0.0.5',
    user_agent: 'Mozilla/5.0 (Macintosh)',
    status_code: 200,
    created_at: '2026-09-25T17:08:55.000Z',
  },
  {
    id: 8,
    user_id: 3,
    role: 'hr',
    action: 'UPDATE',
    method: 'POST',
    path: '/api/hr/interns/3/reject',
    resource: 'intern#3',
    ip_address: '192.168.1.42',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
    status_code: 200,
    created_at: '2026-09-25T11:40:18.000Z',
  },
  {
    id: 7,
    user_id: null,
    role: null,
    action: 'CREATE',
    method: 'POST',
    path: '/api/auth/login',
    resource: null,
    ip_address: '203.113.1.99',
    user_agent: 'curl/7.88.1',
    status_code: 401,
    created_at: '2026-09-25T09:12:03.000Z',
  },
  {
    id: 6,
    user_id: 1,
    role: 'admin',
    action: 'DELETE',
    method: 'DELETE',
    path: '/api/admin/users/9',
    resource: 'user#9',
    ip_address: '10.0.0.5',
    user_agent: 'Mozilla/5.0 (Macintosh)',
    status_code: 204,
    created_at: '2026-09-24T16:05:47.000Z',
  },
  {
    id: 5,
    user_id: 4,
    role: 'mentor',
    action: 'UPDATE',
    method: 'PATCH',
    path: '/api/mentor/tasks/2',
    resource: 'task#2',
    ip_address: '172.16.0.10',
    user_agent: 'Mozilla/5.0 (X11; Linux)',
    status_code: 200,
    created_at: '2026-09-24T14:30:00.000Z',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: thống kê nhanh từ dữ liệu hiện tại để render stat bar
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
   - 2xx → ok
   - 4xx / 5xx → err
   - 3xx → warn
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
 * TODO (task 2):
 *   1. Thêm state logs, loading, error.
 *   2. useEffect → import { getSystemLogs } from '../../api/admin'
 *      và điền kết quả vào state.
 *   3. Thêm phân trang dựa vào response.total / limit / offset.
 *   4. Thêm filter theo action, user_id, from_at, to_at.
 */
function SystemLogsPage() {
  /* TODO (task 2): đổi thành state + fetch thật */
  const logs = MOCK_LOGS;
  const total = MOCK_LOGS.length;  /* TODO: lấy từ response.total */

  const counts = countByAction(logs);

  return (
    <div className="sys-logs-page">
      {/* Glow nền */}
      <div className="sys-logs-page__glow" aria-hidden="true" />

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
              Endpoint thật: <code>GET /api/admin/system-logs</code>
            </p>
          </div>
        </div>

        {/* ── Stat summary bar ── */}
        <div className="sys-logs-stats" role="region" aria-label="Thống kê nhật ký">
          <div className="sys-logs-stat-item">
            <span className="sys-logs-stat-item__dot sys-logs-stat-item__dot--total" />
            Tổng cộng
            <span className="sys-logs-stat-item__count">{total}</span>
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

        {/* ── Data Table card ── */}
        <div className="sys-logs-card">
          <div className="sys-logs-scroll">
            <table
              className="sys-logs-table"
              id="sys-logs-data-table"
              aria-label="Bảng nhật ký hoạt động hệ thống"
            >
              {/* ── Column headers — tên cột khớp đúng field backend ── */}
              <thead>
                <tr>
                  {/* id */}
                  <th className="col-id" scope="col">#</th>
                  {/* created_at */}
                  <th className="col-time" scope="col">Thời gian</th>
                  {/* user_id */}
                  <th className="col-user" scope="col">User ID</th>
                  {/* role */}
                  <th className="col-role" scope="col">Vai trò</th>
                  {/* action: CREATE | UPDATE | DELETE */}
                  <th className="col-action" scope="col">Action</th>
                  {/* method: GET | POST | PUT | PATCH | DELETE */}
                  <th className="col-method" scope="col">Method</th>
                  {/* path */}
                  <th className="col-path" scope="col">Endpoint</th>
                  {/* resource */}
                  <th className="col-res" scope="col">Đối tượng</th>
                  {/* status_code */}
                  <th className="col-status" scope="col">Status</th>
                  {/* ip_address */}
                  <th className="col-ip" scope="col">IP</th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="sys-logs-empty">
                        <span className="sys-logs-empty__icon">📋</span>
                        Chưa có nhật ký nào.
                      </div>
                    </td>
                  </tr>
                ) : (
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

          {/* Footer: tổng số dòng + ghi chú */}
          <div className="sys-logs-footer">
            <span className="sys-logs-footer__count">
              Hiển thị {logs.length} / {total} bản ghi
            </span>
            <span className="sys-logs-footer__note">
              {/* TODO (task 2): thay bằng phân trang thật khi nối API */}
              Phân trang sẽ được bổ sung ở task 2 — nối GET /api/admin/system-logs
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SystemLogsPage;
