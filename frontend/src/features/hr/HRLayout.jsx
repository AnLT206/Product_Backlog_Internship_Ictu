import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './HRLayout.css'

const NAV = [
  { to: '/hr/dashboard', label: 'Tổng quan', end: true },
  { to: '/hr/interns', label: 'Thực tập sinh', end: true },
  { to: '/hr/interns/new', label: 'Thêm hồ sơ mới' },
  { to: '/hr/programs', label: 'Chương trình' },
  { to: '/hr/mentors', label: 'Mentor' },
]

export default function HRLayout() {
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

  return (
    <div className={`hr-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="hr-shell__glow" aria-hidden="true" />

      <header className="hr-topbar">
        <button
          type="button"
          className="hr-topbar__menu"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="hr-topbar__brand">
          <img src={logoApp} alt="" width={28} height={28} />
          <strong>ICTU HR</strong>
        </div>
        <button
          type="button"
          className="hr-topbar__logout"
          onClick={handleLogout}
        >
          Thoát
        </button>
      </header>

      <button
        type="button"
        className="hr-sidebar-backdrop"
        aria-label="Đóng menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside className="hr-sidebar" id="hr-sidebar">
        <div className="hr-sidebar__brand">
          <img src={logoApp} alt="" width={36} height={36} />
          <div>
            <strong>ICTU HR</strong>
            <span>Quản lý thực tập</span>
          </div>
        </div>

        <nav className="hr-sidebar__nav" aria-label="Menu HR">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) =>
                `hr-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hr-sidebar__footer">
          <div className="hr-user">
            <p className="hr-user__name">{user?.full_name || 'HR Manager'}</p>
            <p className="hr-user__email">{user?.email}</p>
          </div>
          <button type="button" className="hr-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="hr-main">
        <Outlet />
      </div>
    </div>
  )
}
