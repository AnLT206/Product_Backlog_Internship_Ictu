import React from 'react'
import { Menu, X } from 'lucide-react'
import NotificationBell from './NotificationBell'
import './Navbar.css'

/**
 * Standard Design System Navbar component.
 */
export default function Navbar({
  portalName = 'ICTU Portal',
  breadcrumbs = [],
  customBreadcrumbs,
  onMobileMenuToggle,
  mobileMenuOpen = false,
  statusBadge,
  actions,
  showNotifications = false,
  notificationList,
  onNotificationClick,
}) {
  return (
    <header className="ui-navbar">
      {/* Left Area: Mobile Drawer Toggle & Breadcrumbs */}
      <div className="ui-navbar-left">
        {onMobileMenuToggle && (
          <button
            type="button"
            className="ui-navbar-mobile-toggle"
            onClick={onMobileMenuToggle}
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <nav className="ui-navbar-breadcrumbs" aria-label="Breadcrumb">
          {customBreadcrumbs ? (
            customBreadcrumbs
          ) : (
            <>
              <span className="ui-crumb-item">ICTU Portal</span>
              <span className="ui-crumb-sep">/</span>
              <span className="ui-crumb-item ui-crumb-portal">{portalName}</span>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className="ui-crumb-sep">/</span>
                  <span className="ui-crumb-item ui-crumb-current">{crumb.label}</span>
                </React.Fragment>
              ))}
            </>
          )}
        </nav>
      </div>

      {/* Right Area: Status, Custom Actions, Notification Bell */}
      <div className="ui-navbar-right">
        {statusBadge && statusBadge}

        {actions && <div className="ui-navbar-actions">{actions}</div>}

        {showNotifications && (
          <NotificationBell
            initialNotifications={notificationList}
            onNotificationClick={onNotificationClick}
          />
        )}
      </div>
    </header>
  )
}

