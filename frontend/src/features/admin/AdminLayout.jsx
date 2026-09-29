import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../hooks/usePermission'
import './AdminLayout.css'

/**
 * NAV — danh sách mục điều hướng admin.
 *
 * Mỗi mục có thêm trường `permission`:
 *   - Nếu null/undefined → hiển thị với mọi user đã đăng nhập vào layout.
 *   - Nếu có → chỉ hiển thị khi hasPermission(user, permission) === true.
 *
 * Nguyên tắc: KHÔNG tự viết if/else theo role ở đây — mọi logic quyền
 * nằm gọn trong hasPermission() (src/hooks/usePermission.js).
 */
const NAV = [
  { to: '/admin/dashboard', label: 'Tổng quan', end: true, permission: null },
  { to: '/admin/users', label: 'Người dùng', end: true, permission: 'admin_users' },
  { to: '/admin/users/new', label: 'Tạo tài khoản', permission: 'admin_users' },
  { to: '/admin/roles', label: 'Phân quyền', permission: 'admin_roles' },
  { to: '/admin/system-logs', label: 'Nhật ký hệ thống', permission: 'admin_audit_logs' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // Lọc menu theo quyền — chỉ gọi hasPermission(), không if/else role trực tiếp
  const visibleNav = NAV.filter(
    (item) => item.permission === null || hasPermission(user, item.permission)
  )

  return (
    <div className={`admin-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="admin-shell__glow" aria-hidden="true" />

      <header className="admin-topbar">
        <button
          type="button"
          className="admin-topbar__menu"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="admin-topbar__brand">
          <img src={logoApp} alt="" width={28} height={28} />
          <strong>ICTU Admin</strong>
        </div>
        <button
          type="button"
          className="admin-topbar__logout"
          onClick={handleLogout}
        >
          Thoát
        </button>
      </header>

      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Đóng menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside className="admin-sidebar" id="admin-sidebar">
        <div className="admin-sidebar__brand">
          <img src={logoApp} alt="" width={36} height={36} />
          <div>
            <strong>ICTU Admin</strong>
            <span>Quản trị hệ thống</span>
          </div>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Menu admin">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-user">
            <p className="admin-user__name">{user?.full_name || 'Admin'}</p>
            <p className="admin-user__email">{user?.email}</p>
          </div>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  )
}
