import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './InternLayout.css'

/**
 * NAV — danh sách menu thực tập sinh.
 *
 * ready: true  → có trang thật, dùng NavLink bình thường.
 * ready: false → chưa xây dựng frontend, hiển thị disabled + badge "Sắp ra mắt".
 */
const NAV = [
  { to: '/intern/dashboard',         label: 'Tổng quan',              end: true,  ready: true  },
  { to: '/intern/documents/upload',  label: 'CV / Đơn xin thực tập',              ready: true  },
  { to: '/intern/profile',           label: 'Hồ sơ cá nhân',                      ready: false },
  { to: '/intern/schedule',          label: 'Lịch thực tập',                       ready: false },
  { to: '/intern/reports',           label: 'Báo cáo tuần',                        ready: false },
  { to: '/intern/allowances',        label: 'Phụ cấp',                             ready: false },
  { to: '/intern/leave',             label: 'Đơn xin nghỉ',                        ready: false },
]

export default function InternLayout() {
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
    <div className={`intern-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="intern-shell__glow" aria-hidden="true" />

      {/* Mobile topbar */}
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
          <strong>ICTU Intern</strong>
        </div>
        <button
          type="button"
          className="intern-topbar__logout"
          onClick={handleLogout}
        >
          Thoát
        </button>
      </header>

      {/* Backdrop mobile */}
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
          <img src={logoApp} alt="" width={36} height={36} />
          <div>
            <strong>ICTU Intern</strong>
            <span>Cổng thực tập sinh</span>
          </div>
        </div>

        <nav className="intern-sidebar__nav" aria-label="Menu thực tập sinh">
          {NAV.map((item) =>
            item.ready ? (
              /* Mục đã có trang thật → NavLink bình thường */
              <NavLink
                key={item.to}
                to={item.to}
                end={Boolean(item.end)}
                className={({ isActive }) =>
                  `intern-nav-link${isActive ? ' is-active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ) : (
              /* Mục chưa có trang → disabled span + badge */
              <span
                key={item.to}
                className="intern-nav-link intern-nav-link--disabled"
                title="Chức năng đang được phát triển"
              >
                {item.label}
                <span className="intern-nav-badge">Sắp ra mắt</span>
              </span>
            )
          )}
        </nav>

        <div className="intern-sidebar__footer">
          <div className="intern-user">
            <p className="intern-user__name">{user?.full_name || 'Thực tập sinh'}</p>
            <p className="intern-user__email">{user?.email}</p>
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
