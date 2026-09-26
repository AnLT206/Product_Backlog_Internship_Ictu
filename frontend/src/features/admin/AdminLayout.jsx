import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { useAuth } from '../../context/AuthContext'
import './AdminLayout.css'

const NAV = [
  { to: '/admin/dashboard',  label: 'Tổng quan',      end: true },
  { to: '/admin/users/new',  label: 'Tạo tài khoản' },
  { to: '/admin/roles',      label: 'Phân quyền' },
  { to: '/admin/system-logs', label: 'Nhật ký hệ thống' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <img src={logoApp} alt="" width={32} height={32} />
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
