import React, { useState, useEffect } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import './MainLayout.css'

/**
 * Standard Design System MainLayout component.
 * Organizes Sidebar, Navbar, and Responsive Content Area.
 */
export default function MainLayout({
  portalName = 'ICTU Portal',
  logoTitle = 'ICTU Portal',
  logoSubtitle = 'Quản lý Thực tập',
  sectionLabel = 'CHỨC NĂNG CHÍNH',
  navItems = [],
  breadcrumbs = [],
  customBreadcrumbs,
  statusBadge,
  actions,
  showNotifications = false,
  notificationList,
  onNotificationClick,
  user,
  userCardMeta,
  customUserName,
  defaultUserName,
  avatarText,
  onLogout,
  onProfileClick,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Auto-close mobile drawer upon navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // ESC key listener to close mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  return (
    <div className={`ui-main-wrapper ${mobileMenuOpen ? 'is-mobile-open' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="ui-layout-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        logoTitle={logoTitle}
        logoSubtitle={logoSubtitle}
        sectionLabel={sectionLabel}
        navItems={navItems}
        user={user}
        userCardMeta={userCardMeta}
        customUserName={customUserName}
        defaultUserName={defaultUserName}
        avatarText={avatarText}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
      />

      {/* Main Content Layout with Sticky Top Navbar */}
      <div className="ui-main-content-layout">
        <Navbar
          portalName={portalName}
          breadcrumbs={breadcrumbs}
          customBreadcrumbs={customBreadcrumbs}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          mobileMenuOpen={mobileMenuOpen}
          statusBadge={statusBadge}
          actions={actions}
          showNotifications={showNotifications}
          notificationList={notificationList}
          onNotificationClick={onNotificationClick}
        />

        <main className="ui-page-container">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

