/**
 * src/hooks/usePermission.js
 *
 * ĐIỂM VÀO DUY NHẤT kiểm tra quyền trong toàn bộ FE.
 *
 * Export:
 *   hasPermission(user, permissionKey) → boolean
 *
 * Khi backend bổ sung `permissions` vào JWT:
 *   → Chỉ cần sửa bên trong hàm hasPermission() (nhánh user.permissions).
 *   → Mọi nơi đang gọi hasPermission() — menu, action button, … — KHÔNG
 *     cần đổi dòng nào.
 *
 * permissionKey phải dùng đúng key đã định nghĩa trong
 * src/constants/permissions.js (PERMISSION_MODULES[*].key).
 */

import { DEFAULT_MATRIX } from '../constants/permissions';

/* ─────────────────────────────────────────────
   ROLE_DEFAULT_PERMISSIONS — bảng ánh xạ tạm
   TODO: Bảng tạm — xóa khi JWT có permissions thật.
         Lúc đó hasPermission() tự chuyển sang check permissions thật ở
         nhánh trên (user.permissions), không cần sửa nơi gọi hasPermission().
───────────────────────────────────────────── */

/**
 * Tái sử dụng DEFAULT_MATRIX từ constants/permissions.js.
 * Không định nghĩa lại danh sách quyền ở đây — chỉ tham chiếu.
 *
 * Shape: { admin: { auth_login: true, ... }, hr: { ... }, ... }
 *
 * @type {Record<string, Record<string, boolean>>}
 */
const ROLE_DEFAULT_PERMISSIONS = DEFAULT_MATRIX;

/* ─────────────────────────────────────────────
   hasPermission
───────────────────────────────────────────── */

/**
 * Kiểm tra user có quyền thực hiện permissionKey hay không.
 *
 * Logic nội bộ (người tích hợp KHÔNG cần biết):
 *   1. Nếu user.permissions tồn tại (mảng quyền chi tiết từ JWT thật)
 *      → check thẳng permissionKey có trong mảng đó.
 *   2. Nếu user.permissions KHÔNG tồn tại (JWT hiện chỉ có role)
 *      → tra bảng ánh xạ tạm ROLE_DEFAULT_PERMISSIONS theo role.
 *   3. Nếu user null/undefined hoặc role không hợp lệ → trả false.
 *
 * @param {{ role?: string, permissions?: string[] }|null|undefined} user
 *   Đối tượng user từ AuthContext (user.role hoặc user.permissions).
 * @param {string} permissionKey
 *   Key quyền — phải khớp với PERMISSION_MODULES[*].key trong permissions.js.
 * @returns {boolean}
 *
 * @example
 * import { hasPermission } from '../hooks/usePermission';
 *
 * // Trong component — lấy user từ useAuth():
 * const { user } = useAuth();
 * if (hasPermission(user, 'interns_approve')) { ... }
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;

  /* ── Nhánh 1: JWT đã có mảng permissions chi tiết (tương lai) ── */
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(permissionKey);
  }

  /* ── Nhánh 2: JWT chỉ có role — dùng bảng ánh xạ tạm ── */
  const role = user.role;
  if (!role) return false;

  const rolePerms = ROLE_DEFAULT_PERMISSIONS[role];
  if (!rolePerms) return false;

  return Boolean(rolePerms[permissionKey]);
}
