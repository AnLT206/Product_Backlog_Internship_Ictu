import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './MentorLayout.css'

/**
 * Danh sách menu điều hướng cho Mentor Portal.
 * Bám sát nghiệp vụ Mentor trong SRS §8 và docs/product-backlog.md:
 * - Tổng quan dashboard
 * - Danh sách TTS phụ trách
 * - Giao việc & Quản lý nhiệm vụ (Tasks)
 * - Xem & Phản hồi báo cáo tuần (Weekly Reports)
 * - Đánh giá năng lực cuối kỳ (Evaluations)
 */
const MENTOR_NAV = [
  { to: '/mentor/dashboard', label: 'Tổng quan', end: true, icon: '📊' },
]

export default function MentorLayout() {
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
    <div className={`mentor-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="mentor-shell__glow" aria-hidden="true" />

      {/* Mobile Topbar */}
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
          <strong>ICTU Mentor Portal</strong>
        </div>
        <button
          type="button"
          className="mentor-topbar__logout"
          onClick={handleLogout}
        >
          Thoát
        </button>
      </header>

      {/* Mobile Backdrop */}
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
          <img src={logoApp} alt="ICTU Logo" width={36} height={36} />
          <div>
            <strong>ICTU Mentor</strong>
            <span>Cổng Hướng dẫn Thực tập</span>
          </div>
        </div>

        <nav className="mentor-sidebar__nav" aria-label="Menu Mentor">
          <div className="mentor-sidebar__section-title">HƯỚNG DẪN THỰC TẬP</div>
          {MENTOR_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) =>
                `mentor-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="mentor-nav-link__icon" aria-hidden="true">{item.icon}</span>
              <span className="mentor-nav-link__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mentor-sidebar__footer">
          <div className="mentor-user">
            <div className="mentor-user__avatar">
              {(user?.full_name || user?.email || 'M').charAt(0).toUpperCase()}
            </div>
            <div className="mentor-user__meta">
              <p className="mentor-user__name">{user?.full_name || 'Mentor Hướng dẫn'}</p>
              <p className="mentor-user__email">{user?.email}</p>
              <span className="mentor-user__badge">Mentor</span>
            </div>
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
