import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Menu,
  X,
  Bell,
  Calendar,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoApp from '../../assets/logo_app.png'
import './EnterpriseAppShell.css'

export default function EnterpriseAppShell({
  children,
  portalName = 'ICTU Portal',
  portalTag = 'SaaS Portal',
  portalTagPrefix = 'PHÂN HỆ',
  logoTitle = 'ICTU Portal',
  logoSubtitle = 'Quản lý Thực tập',
  navItems = [],
  breadcrumbs = [],
  customBreadcrumbs,
  periodInfo,
  topbarActions,
  userCardMeta,
  defaultUserName,
  avatarText,
  statusBadge,
  sidebarSectionLabel = 'CHỨC NĂNG CHÍNH',
  showPortalTagBox = false,
  adminUserCard = false,
  showNotifications = true,
  showTopbarUser = true,
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Close mobile sidebar and notif popover on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setNotifOpen(false)
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
              {!showPortalTagBox && <span className="sidebar-brand__badge">{portalTag}</span>}
            </div>
            <span className="sidebar-brand__sub">{logoSubtitle}</span>
          </div>
        </div>

        {showPortalTagBox && (
          <div className="sidebar-tag-panel">
            <span className="tag-panel-label">{portalTagPrefix}</span>
            <span className="tag-panel-badge tag-panel-badge-active">
              <span className="tag-panel-dot" />
              {portalTag}
            </span>
          </div>
        )}

        {/* Menu chính */}
        <div className="sidebar-content">
          <div className="sidebar-section-label">{sidebarSectionLabel}</div>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`sidebar-nav-item ${active ? 'is-active' : ''}`}
                  title={item.label}
                >
                  {Icon && <Icon className="sidebar-nav-icon" size={18} />}
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
          <div className={`user-profile-card ${adminUserCard ? 'user-profile-card--admin' : ''}`}>
            <div className="user-avatar-wrap">
              <div className={`user-avatar ${adminUserCard ? 'user-avatar--admin' : ''}`}>
                {adminUserCard ? 'G' : (avatarText || (defaultUserName || user?.full_name || user?.email || 'U').charAt(0).toUpperCase())}
              </div>
              {!adminUserCard && <span className="user-status-dot" title="Đang trực tuyến" />}
            </div>
            <div className="user-info">
              <span className="user-name" title={defaultUserName || user?.full_name}>
                {defaultUserName || user?.full_name || 'Người dùng ICTU'}
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

            {periodInfo && (
              <div className="semester-badge">
                <Calendar size={13} className="semester-icon" />
                <span>{periodInfo}</span>
              </div>
            )}

            {topbarActions && (
              <div className="topbar-custom-actions">
                {topbarActions}
              </div>
            )}

            {/* Chuông thông báo - Nhật ký hệ thống */}
            {showNotifications && (
              <div className="notif-dropdown-wrapper">
                <button
                  type="button"
                  className={`notif-btn ${notifOpen ? 'is-active' : ''}`}
                  title="Thông báo nhật ký hệ thống"
                  onClick={() => setNotifOpen(!notifOpen)}
                >
                  <Bell size={17} />
                  <span className="notif-counter">2</span>
                </button>

                {notifOpen && (
                  <div className="notif-popover" role="dialog" aria-label="Thông báo nhật ký hệ thống">
                    <div className="notif-popover-header">
                      <div className="notif-popover-title">
                        <strong>Nhật ký hệ thống</strong>
                        <span className="notif-pill-new">2 mới</span>
                      </div>
                      <button
                        type="button"
                        className="notif-close-btn"
                        onClick={() => setNotifOpen(false)}
                        aria-label="Đóng"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="notif-popover-list">
                      <div
                        className="notif-item notif-item--unread"
                        onClick={() => {
                          setNotifOpen(false)
                          navigate(adminUserCard ? '/admin/system-logs' : '/admin/dashboard')
                        }}
                      >
                        <div className="notif-dot notif-dot--info" />
                        <div className="notif-content">
                          <strong className="notif-title">Cấp quyền người dùng thành công</strong>
                          <p className="notif-desc">Admin cấp quyền Mentor cho Nguyễn Văn Bình (Khoa CNTT)</p>
                          <span className="notif-time">11:15:42 (25/08) · POST /api/v2/rbac/roles/assign</span>
                        </div>
                      </div>

                      <div
                        className="notif-item notif-item--unread"
                        onClick={() => {
                          setNotifOpen(false)
                          navigate(adminUserCard ? '/admin/system-logs' : '/admin/dashboard')
                        }}
                      >
                        <div className="notif-dot notif-dot--success" />
                        <div className="notif-content">
                          <strong className="notif-title">Xác thực 2FA TOTP kích hoạt</strong>
                          <p className="notif-desc">TTS kích hoạt thành công qua Google Authenticator</p>
                          <span className="notif-time">09:32:04 (25/08) · PUT /api/v2/auth/totp/verify-activate</span>
                        </div>
                      </div>

                      <div
                        className="notif-item"
                        onClick={() => {
                          setNotifOpen(false)
                          navigate(adminUserCard ? '/admin/system-logs' : '/admin/dashboard')
                        }}
                      >
                        <div className="notif-dot notif-dot--purple" />
                        <div className="notif-content">
                          <strong className="notif-title">Đồng bộ FastHRM tự động hoàn tất</strong>
                          <p className="notif-desc">Đã đối soát 100% Khớp khóa UID (+48 hồ sơ mới)</p>
                          <span className="notif-time">02:00:14 ICT · Webhook FastHRM Cloud</span>
                        </div>
                      </div>
                    </div>

                    <div className="notif-popover-footer">
                      <button
                        type="button"
                        className="notif-view-all-btn"
                        onClick={() => {
                          setNotifOpen(false)
                          navigate(adminUserCard ? '/admin/system-logs' : '/admin/dashboard')
                        }}
                      >
                        Xem toàn bộ nhật ký hệ thống &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
          {children}
        </main>
      </div>
    </div>
  )
}

