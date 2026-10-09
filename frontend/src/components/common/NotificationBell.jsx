import React, { useState, useEffect, useRef } from 'react'
import {
  Bell,
  Calendar,
  CheckCircle2,
  FileCheck,
  Clock,
  CheckCheck,
  X,
  ExternalLink,
  Info,
} from 'lucide-react'
import './NotificationBell.css'

// Dữ liệu mẫu thông báo mặc định
export const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Có lịch họp mới',
    message: 'Lịch họp đánh giá tiến độ Sprint với Mentor Tuấn lúc 09:00 ngày mai.',
    time: '5 phút trước',
    read: false,
    type: 'meeting',
  },
  {
    id: 'notif-2',
    title: 'Báo cáo đã được duyệt',
    message: 'Báo cáo tuần 4 của bạn đã được Mentor phê duyệt với điểm số 9.5/10.',
    time: '25 phút trước',
    read: false,
    type: 'approval',
  },
  {
    id: 'notif-3',
    title: 'Yêu cầu hỗ trợ đã phản hồi',
    message: 'Ban Nhân sự HR đã phê duyệt đơn xin cấp Giấy chứng nhận thực tập.',
    time: '2 giờ trước',
    read: false,
    type: 'ticket',
  },
  {
    id: 'notif-4',
    title: 'Nhắc nhở chấm công',
    message: 'Bạn đã hoàn tất ghi nhận chuyên cần ca sáng thành công.',
    time: 'Hôm qua',
    read: true,
    type: 'attendance',
  },
]

/**
 * Thành phần 1: NotificationBell (Chuông thông báo cho Header)
 *
 * @param {Array} initialNotifications - Danh sách thông báo ban đầu
 * @param {Function} onNotificationClick - Callback khi người dùng bấm vào 1 thông báo
 * @param {Function} onMarkAllRead - Callback khi bấm đánh dấu tất cả đã đọc
 */
export default function NotificationBell({
  initialNotifications = DEFAULT_NOTIFICATIONS,
  onNotificationClick,
  onMarkAllRead,
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const containerRef = useRef(null)

  // Cập nhật khi initialNotifications thay đổi
  useEffect(() => {
    if (initialNotifications) {
      setNotifications(initialNotifications)
    }
  }, [initialNotifications])

  // Tính số lượng thông báo chưa đọc
  const unreadCount = notifications.filter((item) => !item.read).length

  // Tự động đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Click vào 1 item thông báo: chuyển trạng thái thành "Đã đọc", đổi màu nền nhạt đi và giảm số đếm
  const handleItemClick = (item) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      )
    }

    if (typeof onNotificationClick === 'function') {
      onNotificationClick({ ...item, read: true })
    }
  }

  // Đánh dấu tất cả thông báo là đã đọc
  const handleMarkAllAsRead = (e) => {
    e.stopPropagation()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (typeof onMarkAllRead === 'function') {
      onMarkAllRead()
    }
  }

  // Lọc thông báo hiển thị theo tab
  const displayedNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.read
    return true
  })

  // Chọn icon tương ứng theo loại thông báo
  const renderItemIcon = (type) => {
    switch (type) {
      case 'meeting':
        return <Calendar size={18} className="notif-type-icon notif-icon--meeting" />
      case 'approval':
        return <CheckCircle2 size={18} className="notif-type-icon notif-icon--approval" />
      case 'ticket':
        return <FileCheck size={18} className="notif-type-icon notif-icon--ticket" />
      default:
        return <Info size={18} className="notif-type-icon notif-icon--default" />
    }
  }

  return (
    <div className="notif-bell-container" ref={containerRef}>
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        className={`notif-bell-button ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Thông báo hệ thống"
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="notif-bell-btn"
      >
        <Bell size={20} className="notif-bell-icon" />

        {/* Chấm đỏ báo số lượng thông báo chưa đọc */}
        {unreadCount > 0 && (
          <span
            className="notif-bell-badge"
            data-testid="notif-unread-badge"
            aria-label={`${unreadCount} thông báo chưa đọc`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown List Thông Báo */}
      {isOpen && (
        <div
          className="notif-dropdown-menu"
          role="region"
          aria-label="Hộp thoại thông báo"
          data-testid="notif-dropdown-list"
        >
          {/* Header Dropdown */}
          <div className="notif-dropdown-header">
            <div className="notif-header-title-row">
              <div className="notif-header-title">
                <strong>Thông báo</strong>
                {unreadCount > 0 && (
                  <span className="notif-unread-pill" data-testid="notif-header-unread-count">
                    {unreadCount} mới
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-mark-all-btn"
                  onClick={handleMarkAllAsRead}
                  title="Đánh dấu tất cả là đã đọc"
                  data-testid="notif-mark-all-btn"
                >
                  <CheckCheck size={14} />
                  <span>Đã đọc tất cả</span>
                </button>
              )}
            </div>

            {/* Filter Tabs (Tất cả / Chưa đọc) */}
            <div className="notif-filter-tabs">
              <button
                type="button"
                className={`notif-tab ${filter === 'all' ? 'is-active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                className={`notif-tab ${filter === 'unread' ? 'is-active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>
          </div>

          {/* Danh sách thông báo */}
          <div className="notif-list-body">
            {displayedNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <Bell size={28} className="notif-empty-icon" />
                <p>Không có thông báo nào trong danh mục này.</p>
              </div>
            ) : (
              displayedNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`notif-item ${
                    item.read ? 'notif-item--read' : 'notif-item--unread'
                  }`}
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  data-testid={`notif-item-${item.id}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleItemClick(item)
                    }
                  }}
                >
                  {/* Icon loại thông báo */}
                  <div className="notif-item-icon-wrap">
                    {renderItemIcon(item.type)}
                  </div>

                  {/* Nội dung thông báo */}
                  <div className="notif-item-content">
                    <div className="notif-item-header">
                      <h4 className="notif-item-title">{item.title}</h4>
                      {!item.read && <span className="notif-dot-unread" title="Chưa đọc" />}
                    </div>
                    <p className="notif-item-desc">{item.message}</p>
                    <div className="notif-item-footer">
                      <span className="notif-item-time">
                        <Clock size={12} />
                        {item.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Dropdown */}
          <div className="notif-dropdown-footer">
            <span className="notif-footer-hint">Nhấp vào thông báo để chuyển sang trạng thái đã đọc</span>
          </div>
        </div>
      )}
    </div>
  )
}

