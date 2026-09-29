import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './InternLayout.css'

/**
 * Menu điều hướng cho Thực tập sinh Portal.
 * Bám sát nghiệp vụ trong SRS và Product Backlog:
 * - Tổng quan dashboard
 * - Nhiệm vụ công việc
 * - Báo cáo tuần & phản hồi
 * - Chấm công & xin nghỉ
 * - Hợp đồng & quyền lợi
 */
const INTERN_NAV = [
  { to: '/intern/dashboard', label: 'Tổng quan', end: true, icon: '📊' },
]

export default function InternLayout() {
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
    <div className={`intern-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="intern-shell__glow" aria-hidden="true" />

      {/* Mobile Topbar */}
      <header className="intern-topbar">
        <button
          type="button"
          className="intern-topbar__menu"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="intern-topbar__brand">
          <img src={logoApp} alt="" width={28} height={28} />
          <strong>ICTU Intern Portal</strong>
        </div>
        <button
          type="button"
          className="intern-topbar__logout"
          onClick={handleLogout}
        >
          Thoát
        </button>
      </header>

      {/* Mobile Backdrop */}
      <button
        type="button"
        className="intern-sidebar-backdrop"
        aria-label="Đóng menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className="intern-sidebar" id="intern-sidebar">
        <div className="intern-sidebar__brand">
          <img src={logoApp} alt="ICTU Logo" width={36} height={36} />
          <div>
            <strong>ICTU Intern</strong>
            <span>Cổng Thực tập sinh</span>
          </div>
        </div>

        <nav className="intern-sidebar__nav" aria-label="Menu Thực tập sinh">
          <div className="intern-sidebar__section-title">THỰC TẬP DOANH NGHIỆP</div>
          {INTERN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) =>
                `intern-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="intern-nav-link__icon" aria-hidden="true">{item.icon}</span>
              <span className="intern-nav-link__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="intern-sidebar__footer">
          <div className="intern-user">
            <div className="intern-user__avatar">
              {(user?.full_name || user?.email || 'I').charAt(0).toUpperCase()}
            </div>
            <div className="intern-user__meta">
              <p className="intern-user__name">{user?.full_name || 'Thực tập sinh'}</p>
              <p className="intern-user__email">{user?.email}</p>
              <span className="intern-user__badge">Thực tập sinh</span>
            </div>
          </div>
          <button type="button" className="intern-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="intern-main">
        <Outlet />
      </div>
    </div>
  )
}
