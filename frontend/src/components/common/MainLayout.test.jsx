import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MainLayout from './MainLayout'

describe('Design System MainLayout & Responsive Drawer Suite', () => {
  const sampleNavItems = [
    { to: '/test/dashboard', label: 'Tổng quan' },
    { to: '/test/interns', label: 'Hồ sơ Thực tập sinh', badge: '12' },
    { to: '/test/reports', label: 'Báo cáo định kỳ' },
  ]

  it('renders sidebar nav items, breadcrumbs, and main content', () => {
    render(
      <MemoryRouter initialEntries={['/test/dashboard']}>
        <MainLayout
          portalName="HR Portal"
          logoTitle="ICTU HRM"
          navItems={sampleNavItems}
          breadcrumbs={[{ label: 'Bảng điều khiển' }]}
        >
          <div data-testid="page-content">Nội dung trang quản lý</div>
        </MainLayout>
      </MemoryRouter>
    )

    expect(screen.getByText('ICTU HRM')).toBeInTheDocument()
    expect(screen.getByText('Tổng quan')).toBeInTheDocument()
    expect(screen.getByText('Hồ sơ Thực tập sinh')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Bảng điều khiển')).toBeInTheDocument()
    expect(screen.getByTestId('page-content')).toBeInTheDocument()
  })

  it('toggles mobile drawer when clicking hamburger toggle button', () => {
    render(
      <MemoryRouter initialEntries={['/test/dashboard']}>
        <MainLayout
          portalName="HR Portal"
          navItems={sampleNavItems}
        >
          <div>Nội dung</div>
        </MainLayout>
      </MemoryRouter>
    )

    const toggleBtn = screen.getByLabelText(/Mở menu điều hướng/i)
    expect(toggleBtn).toBeInTheDocument()

    // Click to open drawer
    fireEvent.click(toggleBtn)

    const backdrop = screen.getByTestId('sidebar-backdrop')
    expect(backdrop).toBeInTheDocument()

    // Click backdrop to close
    fireEvent.click(backdrop)
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })

  it('closes mobile drawer when pressing ESC key', () => {
    render(
      <MemoryRouter initialEntries={['/test/dashboard']}>
        <MainLayout
          portalName="HR Portal"
          navItems={sampleNavItems}
        >
          <div>Nội dung</div>
        </MainLayout>
      </MemoryRouter>
    )

    // Open drawer
    fireEvent.click(screen.getByLabelText(/Mở menu điều hướng/i))
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })

  it('renders NotificationBell in Navbar when showNotifications=true', () => {
    render(
      <MemoryRouter initialEntries={['/test/dashboard']}>
        <MainLayout
          portalName="HR Portal"
          navItems={sampleNavItems}
          showNotifications={true}
        >
          <div>Nội dung</div>
        </MainLayout>
      </MemoryRouter>
    )

    const bellBtn = screen.getByTestId('notif-bell-btn')
    expect(bellBtn).toBeInTheDocument()
  })
})
