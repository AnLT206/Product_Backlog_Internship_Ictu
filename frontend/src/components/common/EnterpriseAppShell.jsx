import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../hooks/usePermission'
import { getSavedAvatar } from '../../utils/avatarHelper'
import logoApp from '../../assets/logo_app.png'
import './EnterpriseAppShell.css'

export default function EnterpriseAppShell({
  children,
  portalName = 'ICTU Portal',
  logoTitle = 'ICTU Portal',
  logoSubtitle = 'Quản lý Thực tập',
  navItems = [],
  breadcrumbs = [],
  customBreadcrumbs,
  topbarActions,
  userCardMeta,
  defaultUserName,
  customUserName,
  avatarText,
  statusBadge,
  sidebarSectionLabel = 'CHỨC NĂNG CHÍNH',
  adminUserCard = false,
  showNotifications = false,
  showTopbarUser = false,
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [, setAvatarTick] = useState(0)

  useEffect(() => {
    const handleAvatarChange = () => setAvatarTick((t) => t + 1)
    if (typeof window !== 'undefined') {
      window.addEventListener('ictu_avatar_changed', handleAvatarChange)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ictu_avatar_changed', handleAvatarChange)
      }
    }
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function isItemActive(item) {
    const currentPath = location.pathname
    const currentHash = location.hash || ''

    const [itemPath, itemHash] = item.to.split('#')

    // If item explicitly has a hash (e.g. /mentor/dashboard#tasks)
    if (itemHash) {
      return currentPath === itemPath && currentHash === `#${itemHash}`
    }

    // If item has NO hash (e.g. /mentor/dashboard):
    // Check if other sibling items exist with the same path and a hash
    const siblingHashes = navItems
      .filter((other) => other !== item && other.to.startsWith(itemPath + '#'))
      .map((other) => other.to.split('#')[1])

    if (siblingHashes.length > 0) {
      if (currentPath !== itemPath) return false
      const cleanHash = currentHash.replace(/^#/, '')
      if (cleanHash && siblingHashes.includes(cleanHash)) {
        return false
      }
      return true
    }

    if (item.end === true) {
      return currentPath === itemPath
    }
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/')
  }

  return (
    <div className={`enterprise-shell ${mobileMenuOpen ? 'is-mobile-open' : ''}`}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="enterprise-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── SIDEBAR CỐ ĐỊNH BÊN TRÁI ── */}
      <aside className="enterprise-sidebar">
        {/* Logo ICTU Portal Header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand__logo-wrap">
            <img src={logoApp} alt="ICTU Portal" className="sidebar-brand__img" />
          </div>
          <div className="sidebar-brand__text">
            <div className="sidebar-brand__title-row">
              <span className="sidebar-brand__title">{logoTitle}</span>
            </div>
            <span className="sidebar-brand__sub">{logoSubtitle}</span>
          </div>
        </div>

        {/* Menu chính */}
        <div className="sidebar-content">
          <div className="sidebar-section-label">{sidebarSectionLabel}</div>
          <nav className="sidebar-nav">
            {navItems
              .filter((item) => !item.permission || hasPermission(user, item.permission))
              .map((item) => {
                const active = isItemActive(item)
                if (item.locked) {
                  return (
                    <div
                      key={item.to}
                      className="sidebar-nav-item is-locked"
                      title={`${item.label} (Chức năng chưa cần đến - Đang tạm khóa để tinh gọn dữ liệu)`}
                      onClick={() => {
                        alert(`🔒 Chức năng "${item.label}" hiện chưa cần đến trong quy trình tiếp nhận & quản lý theo backlog. Đã được tạm khóa để tinh gọn dữ liệu.`);
                      }}
                      style={{
                        opacity: 0.52,
                        cursor: 'not-allowed',
                        userSelect: 'none',
                      }}
                    >
                      <span className="sidebar-nav-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px' }}>🔒</span>
                        <span style={{ textDecoration: 'line-through' }}>{item.label}</span>
                      </span>
                      <span
                        className="sidebar-nav-pill"
                        style={{
                          fontSize: '10.5px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        Tạm khóa
                      </span>
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar-nav-item ${active ? 'is-active' : ''}`}
                    title={item.label}
                  >
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`sidebar-nav-pill ${item.badgeClass || ''}`}>{item.badge}</span>
                    )}
                    {item.hasDot && <span className="sidebar-nav-dot-badge" title="Có thông báo mới" />}
                  </Link>
                )
              })}
          </nav>
        </div>

        {/* Thẻ người dùng ở góc dưới */}
        <div className="sidebar-footer">
          <div
            className={`user-profile-card ${adminUserCard ? 'user-profile-card--admin' : ''} ${user?.role === 'intern' ? 'user-profile-card--clickable' : ''}`}
            onClick={() => {
              if (user?.role === 'intern') {
                navigate('/intern/profile');
              }
            }}
            title={user?.role === 'intern' ? 'Xem và chỉnh sửa hồ sơ cá nhân' : undefined}
          >
            <div className="user-avatar-wrap">
              {(() => {
                const resolvedUserAvatar = user?.avatar || getSavedAvatar(user?.email, user?.id, user?.full_name)
                return (
                  <div className={`user-avatar ${adminUserCard ? 'user-avatar--admin' : ''} ${resolvedUserAvatar ? 'user-avatar--img-wrap' : ''}`}>
                    {resolvedUserAvatar ? (
                      <img
                        src={resolvedUserAvatar}
                        alt={user?.full_name || 'Avatar'}
                        className="user-avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'
                        }}
                      />
                    ) : null}
                    <span style={{ display: resolvedUserAvatar ? 'none' : 'inline' }}>
                      {avatarText || (adminUserCard ? 'AD' : (user?.full_name || defaultUserName || user?.email || 'U').charAt(0).toUpperCase())}
                    </span>
                  </div>
                )
              })()}
              {!adminUserCard && <span className="user-status-dot" title="Đang trực tuyến" />}
            </div>
            <div className="user-info">
              <span className="user-name" title={customUserName || user?.full_name || defaultUserName}>
                {customUserName || user?.full_name || defaultUserName || 'Người dùng ICTU'}
              </span>
              <span className={`user-role-tag ${adminUserCard ? 'user-role-tag--blue' : ''}`} title={userCardMeta}>
                {userCardMeta || (
                  user?.role === 'intern'
                    ? `${user?.code || 'TTS0002'} · ĐTV • K20-CNTT`
                    : user?.role === 'mentor'
                    ? 'Senior Tech Lead • Khoa CNTT'
                    : user?.role === 'hr'
                    ? 'HR Manager • Ban HTDN'
                    : 'Root Administrator'
                )}
              </span>
            </div>
            <button
              type="button"
              className="user-logout-btn"
              title="Đăng xuất"
              onClick={handleLogout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN WRAPPER ── */}
      <div className="enterprise-layout">
        {/* ── TOPBAR Ở TRÊN (STICKY) ── */}
        <header className="enterprise-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Breadcrumbs */}
            <nav className="topbar-breadcrumbs" aria-label="Breadcrumb">
              {customBreadcrumbs ? (
                customBreadcrumbs
              ) : (
                <>
                  <span className="crumb-item">ICTU Portal</span>
                  <span className="crumb-sep">/</span>
                  <span className="crumb-item crumb-portal">{portalName}</span>
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={idx} className="crumb-chain">
                      <span className="crumb-sep">/</span>
                      <span className="crumb-item crumb-current">{crumb.label}</span>
                    </span>
                  ))}
                </>
              )}
            </nav>
          </div>

          <div className="topbar-right">
            {statusBadge && statusBadge}

            {topbarActions && (
              <div className="topbar-custom-actions">
                {topbarActions}
              </div>
            )}

            {/* Chuông thông báo chuẩn hóa toàn hệ thống */}
            {showNotifications && (
              <NotificationBell
                initialNotifications={
                  adminUserCard
                    ? [
                        {
                          id: 'log-1',
                          title: 'Cấp quyền người dùng thành công',
                          message: 'Admin cấp quyền Mentor cho TTS (Khoa CNTT) · POST /api/v2/rbac/roles/assign',
                          time: '11:15:42',
                          read: false,
                          type: 'approval',
                        },
                        {
                          id: 'log-2',
                          title: 'Xác thực 2FA TOTP kích hoạt',
                          message: 'TTS kích hoạt thành công qua Google Authenticator · PUT /api/v2/auth/totp/verify-activate',
                          time: '09:32:04',
                          read: false,
                          type: 'ticket',
                        },
                        {
                          id: 'log-3',
                          title: 'Đồng bộ FastHRM tự động hoàn tất',
                          message: 'Đã đối soát 100% Khớp khóa UID (+48 hồ sơ mới)',
                          time: '02:00:14',
                          read: true,
                          type: 'attendance',
                        },
                      ]
                    : undefined
                }
                onNotificationClick={() => {
                  if (adminUserCard) {
                    navigate('/admin/system-logs')
                  }
                }}
              />
            )}

            {/* User Avatar */}
            {showTopbarUser && (
              <div className="topbar-avatar-wrap" title={defaultUserName || user?.full_name || 'Người dùng'}>
                <div className="topbar-avatar">
                  {avatarText || (defaultUserName || user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="topbar-avatar-status" />
              </div>
            )}
          </div>
        </header>

        {/* ── NỘI DUNG CHÍNH (CONTENT AREA) ── */}
        <main className="enterprise-content">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

