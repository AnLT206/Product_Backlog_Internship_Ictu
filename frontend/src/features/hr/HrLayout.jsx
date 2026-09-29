import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './HrLayout.css'

/**
 * Danh sách menu điều hướng dành cho HR Portal.
 * Bám sát Epic & User Story trong docs/product-backlog.md và software-specification.md:
 * - Tổng quan dashboard
 * - Quản lý hồ sơ TTS & nộp/thêm hồ sơ
 * - Quản lý kỳ/chương trình thực tập & phân công
 * - Quản lý Mentor & phòng ban
 */
const HR_NAV = [
  { to: '/hr/dashboard', label: 'Tổng quan', end: true, icon: '📊' },
  { to: '/hr/interns', label: 'Hồ sơ thực tập sinh', end: true, icon: '👥' },
  { to: '/hr/interns/new', label: 'Thêm mới TTS', icon: '➕' },
  { to: '/hr/programs', label: 'Chương trình thực tập', end: true, icon: '🎓' },
  { to: '/hr/programs/new', label: 'Tạo chương trình', icon: '📝' },
  { to: '/hr/mentors', label: 'Danh sách Mentor', icon: '👨‍🏫' },
]

export default function HrLayout() {
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
    <div className={`hr-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="hr-shell__glow" aria-hidden="true" />

      {/* Mobile Topbar */}
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
          <strong>ICTU HR Portal</strong>
        </div>
        <button
          type="button"
          className="hr-topbar__logout"
          onClick={handleLogout}
        >
          Thoát
        </button>
      </header>

      {/* Mobile Backdrop */}
      <button
        type="button"
        className="hr-sidebar-backdrop"
        aria-label="Đóng menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className="hr-sidebar" id="hr-sidebar">
        <div className="hr-sidebar__brand">
          <img src={logoApp} alt="ICTU Logo" width={36} height={36} />
          <div>
            <strong>ICTU HR</strong>
            <span>Quản lý nhân sự & TTS</span>
          </div>
        </div>

        <nav className="hr-sidebar__nav" aria-label="Menu HR">
          <div className="hr-sidebar__section-title">QUẢN LÝ THỰC TẬP</div>
          {HR_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) =>
                `hr-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="hr-nav-link__icon" aria-hidden="true">{item.icon}</span>
              <span className="hr-nav-link__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hr-sidebar__footer">
          <div className="hr-user">
            <div className="hr-user__avatar">
              {(user?.full_name || user?.email || 'HR').charAt(0).toUpperCase()}
            </div>
            <div className="hr-user__meta">
              <p className="hr-user__name">{user?.full_name || 'Cán bộ Nhân sự'}</p>
              <p className="hr-user__email">{user?.email}</p>
              <span className="hr-user__badge">HR Portal</span>
            </div>
          </div>
          <button type="button" className="hr-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="hr-main">
        <Outlet />
      </div>
    </div>
  )
}
