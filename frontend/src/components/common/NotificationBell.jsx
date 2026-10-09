/**
 * NotificationBell.jsx
 * Component Chuông thông báo dành cho thực tập sinh (Intern).
 *
 * US: "Là thực tập sinh, tôi muốn nhận thông báo trên ứng dụng để không bỏ lỡ lịch trình."
 *
 * Tích hợp API thật từ src/api/notifications.js:
 *   - GET   /api/notifications               (Lấy danh sách thông báo thật)
 *   - PATCH /api/notifications/{id}/read      (Đánh dấu đã đọc trên backend)
 *
 * Tính năng:
 * - Gọi API thật khi mount component, hiển thị loading, error, empty state.
 * - Tính toán chính xác số lượng chưa đọc từ API thật, ẩn badge khi = 0.
 * - Click vào thông báo:
 *   + Nếu chưa đọc: gọi API PATCH đánh dấu đã đọc, cập nhật state ngay sau khi API thành công,
 *     giảm unread count (không giảm nếu API lỗi).
 *   + Nếu đã đọc: không gọi API dư thừa.
 *   + Điều hướng đến trang tương ứng (nhiệm vụ / dashboard) không reload trang.
 * - Đóng dropdown khi click ra ngoài hoặc nhấn Esc.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotificationAsRead } from '../../api/notifications'
import './NotificationBell.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Helper định dạng thời gian và icon
   ───────────────────────────────────────────────────────────────────────── */
function formatTimeAgo(isoString) {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString('vi-VN')
  } catch {
    return String(isoString)
  }
}

function getNotificationIcon(item) {
  const text = `${item.title || ''} ${item.body || ''}`.toLowerCase()
  if (text.includes('nhiệm vụ') || text.includes('task')) return '📋'
  if (text.includes('báo cáo') || text.includes('report')) return '📝'
  if (text.includes('lịch') || text.includes('họp')) return '📅'
  if (text.includes('đánh giá')) return '⭐'
  if (text.includes('hồ sơ') || text.includes('tiếp nhận')) return '✅'
  return '🔔'
}

/**
 * Xác định route điều hướng dựa trên nội dung thông báo.
 * Lưu ý: Route /intern/schedule hiện chưa được khai báo trong routes/index.jsx (ready: false).
 * Điều hướng an toàn về /intern/tasks nếu liên quan công việc, hoặc /intern/dashboard.
 */
function getNotificationRoute(item) {
  if (item.target_url) return item.target_url
  const text = `${item.title || ''} ${item.body || ''}`.toLowerCase()
  if (text.includes('nhiệm vụ') || text.includes('task') || text.includes('công việc')) {
    return '/intern/tasks'
  }
  if (text.includes('cv') || text.includes('đơn xin') || text.includes('tài liệu')) {
    return '/intern/documents/upload'
  }
  return '/intern/dashboard'
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [markingId, setMarkingId] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const containerRef = useRef(null)
  const navigate = useNavigate()

  // Số lượng thông báo chưa đọc tính trực tiếp từ dữ liệu API thật
  const unreadCount = Math.max(
    0,
    notifications.filter((n) => !n.is_read).length
  )

  /* ── Gọi API lấy danh sách thông báo ──
     Mọi setState đều đặt SAU await để tuân thủ react-hooks/set-state-in-effect */
  async function loadNotifications() {
    const res = await getNotifications()
    if (res.ok && res.data) {
      const items = res.data.items ?? (Array.isArray(res.data) ? res.data : [])
      setNotifications(items)
      setError(null)
    } else {
      setError(res.data?.detail || 'Không thể tải danh sách thông báo.')
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications()
  }, [])

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

  // Đóng dropdown khi nhấn Escape
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

  function handleRetry() {
    setLoading(true)
    setError(null)
    setActionError(null)
    void loadNotifications()
  }

  // Click vào thông báo: đánh dấu đã đọc và điều hướng
  async function handleNotificationClick(item) {
    setActionError(null)

    // Nếu thông báo chưa đọc: gọi API cập nhật trạng thái
    if (!item.is_read) {
      setMarkingId(item.id)
      const res = await markNotificationAsRead(item.id)
      setMarkingId(null)

      if (!res.ok) {
        // Nếu API lỗi: KHÔNG giảm unread count và KHÔNG điều hướng
        setActionError(res.data?.detail || 'Không thể cập nhật trạng thái thông báo.')
        return
      }

      // Cập nhật UI ngay sau khi API thành công
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      )
    }

    // Đóng dropdown và điều hướng không reload trang
    setIsOpen(false)
    const targetRoute = getNotificationRoute(item)
    navigate(targetRoute)
  }

  // Đánh dấu tất cả là đã đọc bằng API
  async function handleMarkAllAsRead() {
    const unreadItems = notifications.filter((n) => !n.is_read)
    if (unreadItems.length === 0) return

    setActionError(null)
    const results = await Promise.all(
      unreadItems.map((item) => markNotificationAsRead(item.id))
    )

    const successIds = new Set()
    let hasFail = false

    results.forEach((res, idx) => {
      if (res.ok) {
        successIds.add(unreadItems[idx].id)
      } else {
        hasFail = true
      }
    })

    if (successIds.size > 0) {
      setNotifications((prev) =>
        prev.map((n) => (successIds.has(n.id) ? { ...n, is_read: true } : n))
      )
    }

    if (hasFail) {
      setActionError('Một số thông báo chưa thể cập nhật trạng thái đã đọc.')
    }
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

            {unreadCount > 0 && !loading && (
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

          {/* Banner thông báo lỗi action nếu có */}
          {actionError && (
            <div className="notif-action-error" role="alert">
              <span>⚠️ {actionError}</span>
              <button
                type="button"
                className="notif-action-error__close"
                onClick={() => setActionError(null)}
                aria-label="Đóng thông báo lỗi"
              >
                ✕
              </button>
            </div>
          )}

          {/* Body Dropdown */}
          <div className="notif-dropdown__body">
            {/* Trạng thái Loading */}
            {loading && (
              <div className="notif-loading" role="status" aria-live="polite">
                <span className="notif-spinner" aria-hidden="true" />
                <span>Đang tải thông báo…</span>
              </div>
            )}

            {/* Trạng thái Lỗi */}
            {!loading && error && (
              <div className="notif-error" role="alert">
                <span className="notif-error__icon" aria-hidden="true">⚠️</span>
                <p className="notif-error__msg">{error}</p>
                <button
                  type="button"
                  className="notif-btn-retry"
                  onClick={handleRetry}
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Trạng thái Rỗng */}
            {!loading && !error && notifications.length === 0 && (
              <div className="notif-empty">
                <span className="notif-empty__icon" aria-hidden="true">🔕</span>
                <p className="notif-empty__title">Không có thông báo nào</p>
                <p className="notif-empty__desc">Bạn đã cập nhật mọi thông tin mới nhất.</p>
              </div>
            )}

            {/* Danh sách thông báo */}
            {!loading && !error && notifications.length > 0 && (
              <ul className="notif-list">
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className={`notif-item${item.is_read ? ' is-read' : ' is-unread'}${
                      markingId === item.id ? ' is-marking' : ''
                    }`}
                    onClick={() => handleNotificationClick(item)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void handleNotificationClick(item)
                      }
                    }}
                  >
                    <div className="notif-item__icon-wrap" aria-hidden="true">
                      <span className="notif-item__icon">{getNotificationIcon(item)}</span>
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
                      <p className="notif-item__message">{item.body || item.message || ''}</p>
                      <span className="notif-item__time">{formatTimeAgo(item.created_at)}</span>
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
