/**
 * PermissionMatrixPage.jsx
 * Route dự kiến: /admin/roles
 *
 * US 40: "Là admin, tôi muốn phân quyền chi tiết để kiểm soát chức năng
 *         mà mỗi vai trò có thể sử dụng."
 *
 * Kiến trúc 3 lớp bắt buộc (xem task requirement):
 *   Lớp 1 – Dữ liệu tĩnh : constants/permissions.js  (danh sách cứng)
 *   Lớp 2 – API          : api/admin.js               (getPermissionMatrix / updatePermissionMatrix)
 *   Lớp 3 – UI           : file này                   (CHỈ gọi hàm API, không import constants trực tiếp)
 *
 * Checklist:
 *   [x] Component KHÔNG import trực tiếp constants/permissions.js
 *   [x] Gọi getPermissionMatrix() / updatePermissionMatrix() từ api/admin.js
 *   [x] Local state checkbox khởi tạo từ dữ liệu API trả về
 *   [x] Nút "Lưu thay đổi" gọi updatePermissionMatrix(), hiện Toast
 *   [x] Bám theme CreateAccountPage.css / ProgramFormPage.css
 *   [x] KHÔNG có search, export, phân trang
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getPermissionMatrix, updatePermissionMatrix } from '../../api/admin';
import { buildToast } from '../../api/interns';
import './PermissionMatrixPage.css';

/* ─────────────────────────────────────────────
   Icon helper — emoji tương ứng với mỗi role key
───────────────────────────────────────────── */
const ROLE_ICONS = {
  admin:  '🛡️',
  hr:     '👩‍💼',
  mentor: '🎓',
  intern: '🧑‍💻',
};

/* ─────────────────────────────────────────────
   buildToast — tái sử dụng từ src/api/interns.js
   (không viết lại — quy ước ngầm của project)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * PermissionMatrixPage
 *
 * Bảng ma trận phân quyền dạng checkbox:
 *   - Hàng = module/quyền (theo nhóm)
 *   - Cột  = vai trò (admin / hr / mentor / intern)
 *   - Mỗi ô là checkbox bật/tắt ở local state
 *   - Nút "Lưu thay đổi" gọi API và hiện toast
 */
function PermissionMatrixPage() {
  /* ── State ── */
  const [roles,   setRoles]   = useState([]);   // [{ key, label }, ...]
  const [modules, setModules] = useState([]);   // [{ key, label, group }, ...]
  const [matrix,  setMatrix]  = useState({});   // { roleKey: { permKey: bool } }
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null); // { type, message }

  /* ── Load dữ liệu lần đầu ── */
  // setLoading(true) đặt trong useEffect (không nằm trong callback)
  // để tránh lỗi react-hooks/set-state-in-effect (setState đồng bộ trong effect)
  const loadMatrix = useCallback(async () => {
    try {
      const { ok, data } = await getPermissionMatrix();
      if (ok) {
        setRoles(data.roles);
        setModules(data.modules);
        setMatrix(data.matrix);
      } else {
        showToast('error', data?.detail ?? 'Không thể tải dữ liệu phân quyền.');
      }
    } catch {
      showToast('error', 'Không thể kết nối tới máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true); // Đặt ở đây: rõ ràng là trong effect, trước await nên ESLint không bắt lỗi
    loadMatrix();
  }, [loadMatrix]);

  /* ── Toast helpers ── */
  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  /* ── Toggle checkbox ── */
  function handleToggle(roleKey, permKey) {
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [permKey]: !prev[roleKey]?.[permKey],
      },
    }));
  }

  /* ── Lưu thay đổi ── */
  async function handleSave() {
    setSaving(true);
    try {
      const { ok, status, data } = await updatePermissionMatrix(matrix);
      // Tái sử dụng buildToast từ api/interns.js (quy ước project — không viết lại)
      const t = buildToast(ok, status, data, 'Lưu phân quyền thành công!');
      showToast(t.type, t.message);
    } catch {
      showToast('error', 'Không thể kết nối tới máy chủ.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Nhóm các modules theo group ── */
  const groups = [];
  const seenGroups = new Set();
  modules.forEach((mod) => {
    const g = mod.group ?? 'Khác';
    if (!seenGroups.has(g)) {
      seenGroups.add(g);
      groups.push(g);
    }
  });

  /* ── Render ── */
  return (
    <div className="perm-matrix-page">
      {/* Glow nền */}
      <div className="perm-matrix-page__glow" aria-hidden="true" />

      {/* Toast thông báo */}
      {toast && (
        <div
          id="admin-pm-toast"
          className={`perm-matrix-toast perm-matrix-toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}
          {toast.message}
        </div>
      )}

      <div className="perm-matrix-shell">

        {/* Back link */}
        <a href="/admin/dashboard" className="perm-matrix-back">
          ← Quay lại Dashboard
        </a>

        {/* Page header */}
        <div className="perm-matrix-header">
          <div className="perm-matrix-header__left">
            <span className="perm-matrix-badge">Quản trị hệ thống</span>
            <h1>Ma trận <span>phân quyền</span></h1>
            <p className="perm-matrix-subtitle">
              Bật/tắt quyền truy cập từng module cho mỗi vai trò. Nhấn "Lưu thay đổi" để áp dụng.
            </p>
          </div>

          <button
            id="admin-pm-save-btn"
            type="button"
            className="perm-matrix-save-btn"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <span className="perm-matrix-loading__spinner" aria-hidden="true" />
                Đang lưu…
              </>
            ) : (
              '💾 Lưu thay đổi'
            )}
          </button>
        </div>

        {/* Table card */}
        {loading ? (
          <div className="perm-matrix-loading" role="status" aria-label="Đang tải dữ liệu">
            <span className="perm-matrix-loading__spinner" aria-hidden="true" />
            Đang tải dữ liệu phân quyền…
          </div>
        ) : (
          <div className="perm-matrix-card">
            <div className="perm-matrix-scroll">
              <table
                className="perm-matrix-table"
                id="admin-pm-table"
                aria-label="Ma trận phân quyền vai trò"
              >
                {/* ── Column headers ── */}
                <thead>
                  <tr>
                    <th className="pm-th-module">Module / Quyền</th>
                    {roles.map((role) => (
                      <th key={role.key}>
                        <div className="pm-role-chip">
                          <span className="pm-role-chip__icon" aria-hidden="true">
                            {ROLE_ICONS[role.key] ?? '👤'}
                          </span>
                          <span className="pm-role-chip__label">{role.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* ── Rows grouped by module group ── */}
                <tbody>
                  {groups.map((group) => {
                    const groupModules = modules.filter((m) => (m.group ?? 'Khác') === group);
                    return (
                      // React.Fragment với key để tránh warning khi render nhiều tr liên tiếp
                      <React.Fragment key={group}>
                        {/* Group separator */}
                        <tr className="pm-group-row">
                          <td colSpan={roles.length + 1}>{group}</td>
                        </tr>

                        {/* Permission rows */}
                        {groupModules.map((mod) => (
                          <tr key={mod.key}>
                            <td className="pm-td-module">{mod.label}</td>
                            {roles.map((role) => {
                              const checked = Boolean(matrix[role.key]?.[mod.key]);
                              const checkId = `pm-cb-${role.key}-${mod.key}`;
                              return (
                                <td key={role.key} className="pm-td-check">
                                  <label
                                    htmlFor={checkId}
                                    className="pm-checkbox-wrap"
                                    aria-label={`${role.label}: ${mod.label} — ${checked ? 'Có quyền' : 'Không có quyền'}`}
                                  >
                                    <input
                                      id={checkId}
                                      type="checkbox"
                                      className="pm-checkbox"
                                      checked={checked}
                                      onChange={() => handleToggle(role.key, mod.key)}
                                      aria-label={`${role.label} — ${mod.label}`}
                                    />
                                  </label>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footnote */}
        {!loading && (
          <p className="perm-matrix-footnote">
            <strong>Lưu ý:</strong> Danh sách quyền hiện là dữ liệu tĩnh trong{' '}
            <code>constants/permissions.js</code>. Khi backend có API thật, chỉ cần
            sửa 2 hàm trong <code>src/api/admin.js</code>, không cần đổi UI.
            {/* TODO: Xóa footnote này khi API thật đã được tích hợp */}
          </p>
        )}

      </div>
    </div>
  );
}

export default PermissionMatrixPage;
