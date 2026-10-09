/**
 * NotificationBell.jsx
 * Component Chuông thông báo dành cho thực tập sinh (Intern).
 *
 * US: "Là thực tập sinh, tôi muốn nhận thông báo trên ứng dụng để không bỏ lỡ lịch trình."
 *
 * Tính năng:
 * - Icon hình chuông kèm chấm/badge đỏ hiển thị số lượng chưa đọc.
 * - Tự động ẩn badge khi số lượng chưa đọc = 0.
 * - Click chuông mở dropdown danh sách thông báo.
 * - Click ra ngoài (hoặc nhấn Esc) tự động đóng dropdown.
 * - Danh sách thông báo MOCK thực tế về lịch trình, nhiệm vụ, báo cáo.
 * - Nhận biết rõ ràng thông báo chưa đọc (nền highlight, dấu chấm xanh, chữ đậm).
 * - Nút "Đánh dấu đã đọc" tương tác trực tiếp trên giao diện MOCK.
 * - Empty state khi không có thông báo.
 * - Responsive: không làm vỡ header trên desktop, căn chỉnh mượt mà trên mobile.
 */

import { useEffect, useRef, useState } from 'react'
import './NotificationBell.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Dữ liệu MOCK thông báo dành cho thực tập sinh
   ───────────────────────────────────────────────────────────────────────── */
const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: 'task',
    title: 'Mentor đã giao nhiệm vụ mới',
    message: 'Nhiệm vụ "Tìm hiểu quy trình xác thực JWT & viết báo cáo" đã được giao cho bạn.',
    time: '15 phút trước',
    is_read: false,
    icon: '📋',
  },
  {
    id: 2,
    type: 'report',
    title: 'Sắp đến hạn báo cáo tuần',
    message: 'Báo cáo tuần 4 cần được nộp trước 17:00 Thứ Sáu. Đừng quên đính kèm minh chứng.',
    time: '2 giờ trước',
    is_read: false,
    icon: '📝',
  },
  {
    id: 3,
    type: 'schedule',
    title: 'Lịch thực tập ngày mai',
    message: 'Buổi họp định hướng kỹ thuật với Mentor sẽ diễn ra lúc 09:00 tại phòng họp 3.',
    time: '5 giờ trước',
    is_read: false,
    icon: '📅',
  },
  {
    id: 4,
    type: 'evaluation',
    title: 'Lịch đánh giá thực tập đã được cập nhật',
    message: 'Kỳ đánh giá giữa kỳ sẽ bắt đầu từ tuần tới. Vui lòng chuẩn bị tài liệu liên quan.',
    time: '1 ngày trước',
    is_read: true,
    icon: '⭐',
  },
  {
    id: 5,
    type: 'system',
    title: 'Hồ sơ thực tập sinh đã được tiếp nhận',
    message: 'Phòng Nhân sự đã ghi nhận hồ sơ và phân bổ vào chương trình thực tập.',
    time: '3 ngày trước',
    is_read: true,
    icon: '✅',
  },
]

export default function NotificationBell() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Số lượng thông báo chưa đọc
  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Đóng dropdown khi click ra ngoài
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

  // Đóng dropdown khi nhấn phím Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Đánh dấu 1 thông báo là đã đọc
  function handleMarkAsRead(id) {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    )
  }

  // Đánh dấu tất cả là đã đọc
  function handleMarkAllAsRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
  }

  return (
    <div className="notif-wrapper" ref={containerRef}>
      {/* ── Nút chuông thông báo ── */}
      <button
        type="button"
        className={`notif-btn${isOpen ? ' is-active' : ''}`}
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <svg
          className="notif-bell-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {/* Chấm đỏ / Badge hiển thị số lượng chưa đọc (ẩn khi = 0) */}
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown danh sách thông báo ── */}
      {isOpen && (
        <div
          className="notif-dropdown"
          role="region"
          aria-label="Bảng thông báo"
        >
          {/* Header Dropdown */}
          <div className="notif-dropdown__header">
            <div className="notif-dropdown__title-wrap">
              <h2 className="notif-dropdown__title">Thông báo</h2>
              {unreadCount > 0 && (
                <span className="notif-dropdown__count-badge">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-dropdown__mark-all-btn"
                onClick={handleMarkAllAsRead}
                title="Đánh dấu tất cả là đã đọc"
              >
                Đã đọc tất cả
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="notif-dropdown__body">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty__icon" aria-hidden="true">🔕</span>
                <p className="notif-empty__title">Không có thông báo nào</p>
                <p className="notif-empty__desc">Bạn đã cập nhật mọi thông tin mới nhất.</p>
              </div>
            ) : (
              <ul className="notif-list">
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className={`notif-item${item.is_read ? ' is-read' : ' is-unread'}`}
                    onClick={() => handleMarkAsRead(item.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleMarkAsRead(item.id)
                      }
                    }}
                  >
                    <div className="notif-item__icon-wrap" aria-hidden="true">
                      <span className="notif-item__icon">{item.icon}</span>
                    </div>

                    <div className="notif-item__content">
                      <div className="notif-item__top">
                        <h3 className="notif-item__title">{item.title}</h3>
                        {!item.is_read && (
                          <span
                            className="notif-item__dot"
                            title="Chưa đọc"
                            aria-label="Chưa đọc"
                          />
                        )}
                      </div>
                      <p className="notif-item__message">{item.message}</p>
                      <span className="notif-item__time">{item.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer Dropdown */}
          <div className="notif-dropdown__footer">
            <span className="notif-dropdown__view-all">
              Tất cả thông báo gần đây
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
