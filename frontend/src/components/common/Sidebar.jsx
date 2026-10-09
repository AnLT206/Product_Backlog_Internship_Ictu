import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { hasPermission } from '../../hooks/usePermission'
import logoApp from '../../assets/logo_app.png'
import './Sidebar.css'

/**
 * Standard Design System Sidebar component.
 * Supports desktop sticky layout and mobile sliding drawer mode.
 */
export default function Sidebar({
  isOpen = false,
  onClose,
  logoTitle = 'ICTU Portal',
  logoSubtitle = 'Quản lý Thực tập',
  sectionLabel = 'CHỨC NĂNG CHÍNH',
  navItems = [],
  user,
  userCardMeta,
  customUserName,
  defaultUserName,
  avatarText,
  onLogout,
  onProfileClick,
}) {
  const location = useLocation()

  function isItemActive(item) {
    const currentPath = location.pathname
    const currentHash = location.hash || ''
    const [itemPath, itemHash] = item.to.split('#')

    if (itemHash) {
      return currentPath === itemPath && currentHash === `#${itemHash}`
    }

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

  const displayName = customUserName || user?.full_name || defaultUserName || 'Người dùng ICTU'
  const displayMeta = userCardMeta || (
    user?.role === 'intern'
      ? `${user?.code || 'TTS0001'} · TTS`
      : user?.role === 'mentor'
      ? 'Mentor Hướng dẫn'
      : user?.role === 'hr'
      ? 'Quản lý Nhân sự (HR)'
      : 'Quản trị viên'
  )

  const resolvedAvatar = avatarText || (displayName.charAt(0).toUpperCase())

  return (
    <aside className={`ui-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="ui-sidebar-brand">
        <div className="ui-sidebar-brand__logo-wrap">
          <img src={logoApp} alt="ICTU Portal" className="ui-sidebar-brand__img" />
        </div>
        <div className="ui-sidebar-brand__text">
          <div className="ui-sidebar-brand__title-row">
            <span className="ui-sidebar-brand__title">{logoTitle}</span>
          </div>
          <span className="ui-sidebar-brand__sub">{logoSubtitle}</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="ui-sidebar-content">
        {sectionLabel && <div className="ui-sidebar-section-label">{sectionLabel}</div>}
        <nav className="ui-sidebar-nav">
          {navItems
            .filter((item) => !item.permission || hasPermission(user, item.permission))
            .map((item) => {
              const active = isItemActive(item)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`ui-sidebar-nav-item ${active ? 'is-active' : ''}`}
                  title={item.label}
                  onClick={() => {
                    if (onClose) onClose()
                  }}
                >
                  <span className="ui-sidebar-nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ui-sidebar-nav-pill">{item.badge}</span>
                  )}
                  {item.hasDot && <span className="ui-sidebar-nav-dot" title="Có cập nhật" />}
                </Link>
              )
            })}
        </nav>
      </div>

      {/* Footer User Card */}
      <div className="ui-sidebar-footer">
        <div
          className={`ui-sidebar-user-card ${onProfileClick ? 'ui-sidebar-user-card--clickable' : ''}`}
          onClick={onProfileClick}
          title={onProfileClick ? 'Xem hồ sơ cá nhân' : undefined}
        >
          <div className="ui-sidebar-user-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} />
            ) : (
              <span>{resolvedAvatar}</span>
            )}
          </div>
          <div className="ui-sidebar-user-info">
            <span className="ui-sidebar-user-name" title={displayName}>
              {displayName}
            </span>
            <span className="ui-sidebar-user-meta" title={displayMeta}>
              {displayMeta}
            </span>
          </div>
          {onLogout && (
            <button
              type="button"
              className="ui-sidebar-logout-btn"
              title="Đăng xuất"
              onClick={(e) => {
                e.stopPropagation()
                onLogout()
              }}
              aria-label="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

