import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import NotificationBell, { DEFAULT_NOTIFICATIONS } from './NotificationBell'

describe('NotificationBell Component Test Suite', () => {
  const customNotifications = [
    {
      id: 'item-1',
      title: 'Có lịch họp mới',
      message: 'Lịch họp giao ban dự án lúc 09:00 ngày mai.',
      time: '5 phút trước',
      read: false,
      type: 'meeting',
    },
    {
      id: 'item-2',
      title: 'Báo cáo đã được duyệt',
      message: 'Báo cáo tuần 4 đã được Mentor phê duyệt.',
      time: '30 phút trước',
      read: false,
      type: 'approval',
    },
    {
      id: 'item-3',
      title: 'Nhắc nhở chấm công',
      message: 'Ghi nhận chuyên cần hoàn tất.',
      time: 'Hôm qua',
      read: true,
      type: 'attendance',
    },
  ]

  it('1. Render icon chuông và chấm đỏ báo số lượng thông báo chưa đọc', () => {
    render(<NotificationBell initialNotifications={customNotifications} />)

    const bellBtn = screen.getByTestId('notif-bell-btn')
    expect(bellBtn).toBeInTheDocument()

    // 2 thông báo chưa đọc -> chấm đỏ hiển thị số 2
    const badge = screen.getByTestId('notif-unread-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('2')
  })

  it('2. Khi click vào chuông, xổ xuống Dropdown List chứa các thông báo', async () => {
    const user = userEvent.setup()
    render(<NotificationBell initialNotifications={customNotifications} />)

    // Ban đầu dropdown chưa mở
    expect(screen.queryByTestId('notif-dropdown-list')).not.toBeInTheDocument()

    // Click chuông
    await user.click(screen.getByTestId('notif-bell-btn'))

    // Dropdown xuất hiện
    const dropdown = screen.getByTestId('notif-dropdown-list')
    expect(dropdown).toBeInTheDocument()

    // Kiểm tra danh sách hiển thị các thông báo
    expect(screen.getByText('Có lịch họp mới')).toBeInTheDocument()
    expect(screen.getByText('Báo cáo đã được duyệt')).toBeInTheDocument()
    expect(screen.getByText('Nhắc nhở chấm công')).toBeInTheDocument()
  })

  it('3. Khi click vào 1 item thông báo: chuyển trạng thái thành "Đã đọc", đổi màu nền nhạt đi và giảm số đếm trên chấm đỏ', async () => {
    const user = userEvent.setup()
    const handleNotificationClick = vi.fn()

    render(
      <NotificationBell
        initialNotifications={customNotifications}
        onNotificationClick={handleNotificationClick}
      />,
    )

    // Mở dropdown
    await user.click(screen.getByTestId('notif-bell-btn'))

    // Item 1 ban đầu có class chưa đọc
    const item1 = screen.getByTestId('notif-item-item-1')
    expect(item1).toHaveClass('notif-item--unread')
    expect(screen.getByTestId('notif-unread-badge')).toHaveTextContent('2')

    // Click vào item 1
    await user.click(item1)

    // Item 1 chuyển sang class đã đọc (notif-item--read, đổi màu nền nhạt đi)
    expect(item1).toHaveClass('notif-item--read')
    expect(item1).not.toHaveClass('notif-item--unread')

    // Số đếm trên chấm đỏ giảm từ 2 xuống 1
    expect(screen.getByTestId('notif-unread-badge')).toHaveTextContent('1')

    // Callback được gọi với item đã cập nhật read: true
    expect(handleNotificationClick).toHaveBeenCalledTimes(1)
    expect(handleNotificationClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-1', read: true }),
    )
  })

  it('4. Nút "Đã đọc tất cả" chuyển toàn bộ thông báo về đã đọc và ẩn chấm đỏ khi số đếm = 0', async () => {
    const user = userEvent.setup()
    const handleMarkAll = vi.fn()

    render(
      <NotificationBell
        initialNotifications={customNotifications}
        onMarkAllRead={handleMarkAll}
      />,
    )

    // Mở dropdown
    await user.click(screen.getByTestId('notif-bell-btn'))

    // Bấm nút "Đã đọc tất cả"
    const markAllBtn = screen.getByTestId('notif-mark-all-btn')
    await user.click(markAllBtn)

    // Callback được gọi
    expect(handleMarkAll).toHaveBeenCalledTimes(1)

    // Chấm đỏ biến mất vì unreadCount = 0
    expect(screen.queryByTestId('notif-unread-badge')).not.toBeInTheDocument()

    // Tất cả items đều chuyển sang notif-item--read
    expect(screen.getByTestId('notif-item-item-1')).toHaveClass('notif-item--read')
    expect(screen.getByTestId('notif-item-item-2')).toHaveClass('notif-item--read')
  })

  it('5. Lọc danh sách theo tab "Chưa đọc"', async () => {
    const user = userEvent.setup()
    render(<NotificationBell initialNotifications={customNotifications} />)

    await user.click(screen.getByTestId('notif-bell-btn'))

    // Chuyển sang tab Chưa đọc
    const unreadTab = screen.getByRole('button', { name: /chưa đọc/i })
    await user.click(unreadTab)

    // Item 3 (đã đọc) bị ẩn
    expect(screen.queryByTestId('notif-item-item-3')).not.toBeInTheDocument()
    // Item 1 và 2 (chưa đọc) vẫn còn
    expect(screen.getByTestId('notif-item-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('notif-item-item-2')).toBeInTheDocument()
  })
})

