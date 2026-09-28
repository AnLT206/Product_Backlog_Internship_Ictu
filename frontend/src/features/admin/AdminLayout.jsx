import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './AdminLayout.css'

const NAV = [
  { to: '/admin/dashboard', label: 'Tổng quan', end: true },
  { to: '/admin/users', label: 'Người dùng', end: true },
  { to: '/admin/users/new', label: 'Tạo tài khoản' },
  { to: '/admin/roles', label: 'Phân quyền' },
  { to: '/admin/system-logs', label: 'Nhật ký hệ thống' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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
          {NAV.map((item) => (
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
