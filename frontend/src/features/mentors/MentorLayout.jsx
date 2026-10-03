/**
 * MentorLayout.jsx
 * Layout dành riêng cho vai trò Mentor — sidebar + header mobile.
 *
 * Cấu trúc kế thừa từ HRLayout / AdminLayout (cùng design system).
 * Prefix class: "mentor-shell", "mentor-sidebar", "mentor-nav-link".
 *
 * NAV — chỉ thêm menu khi backend đã có API tương ứng:
 *   /mentor/dashboard    → Tổng quan (API: GET /api/mentor/assigned-interns + /api/mentor/tasks)
 *   /mentor/interns      → Thực tập sinh của tôi (API: GET /api/mentor/assigned-interns)
 *   /mentor/tasks        → Danh sách nhiệm vụ (API: GET /api/mentor/tasks)
 */

import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './MentorLayout.css'

const NAV = [
  { to: '/mentor/dashboard', label: 'Tổng quan',              end: true },
  { to: '/mentor/interns',   label: 'Thực tập sinh của tôi',  end: true },
  { to: '/mentor/tasks',     label: 'Danh sách nhiệm vụ',     end: true },
]

export default function MentorLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [prevPath, setPrevPath] = useState(location.pathname)

  // Đóng drawer khi đổi route (pattern từ HRLayout)
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

  return (
    <div className={`mentor-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="mentor-shell__glow" aria-hidden="true" />

      {/* Mobile topbar */}
      <header className="mentor-topbar">
        <button
          type="button"
          className="mentor-topbar__menu"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mentor-topbar__brand">
          <img src={logoApp} alt="" width={28} height={28} />
          <strong>ICTU Mentor</strong>
        </div>
        <button
          type="button"
          className="mentor-topbar__logout"
          onClick={handleLogout}
        >
          Thoát
        </button>
      </header>

      {/* Backdrop mobile */}
      <button
        type="button"
        className="mentor-sidebar-backdrop"
        aria-label="Đóng menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className="mentor-sidebar" id="mentor-sidebar">
        <div className="mentor-sidebar__brand">
          <img src={logoApp} alt="" width={36} height={36} />
          <div>
            <strong>ICTU Mentor</strong>
            <span>Cổng hướng dẫn thực tập</span>
          </div>
        </div>

        <nav className="mentor-sidebar__nav" aria-label="Menu Mentor">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) =>
                `mentor-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mentor-sidebar__footer">
          <div className="mentor-user">
            <p className="mentor-user__name">{user?.full_name || 'Mentor'}</p>
            <p className="mentor-user__email">{user?.email}</p>
          </div>
          <button type="button" className="mentor-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="mentor-main">
        <Outlet />
      </div>
    </div>
  )
}
