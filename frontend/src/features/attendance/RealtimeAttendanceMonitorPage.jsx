import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Radio,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Search,
  Pause,
  Play,
  Zap,
  RefreshCw,
  Eye,
  Filter,
  Wifi,
  WifiOff,
  RotateCcw,
} from 'lucide-react'
import {
  subscribeAttendanceStream,
  triggerManualSwipe,
  togglePauseStream,
  startRealtimeSimulation,
  stopRealtimeSimulation,
  setConnectionStatus,
  clearAttendanceEvents,
  resetAttendanceEvents,
} from './attendanceMonitorService'
import { getSavedAvatar } from '../../utils/avatarHelper'
import AttendanceEventDetailModal from './components/AttendanceEventDetailModal'
import '../admin/AdminPage.css'
import '../admin/AdminInternQrPage.css'
import './RealtimeAttendanceMonitorPage.css'

function getUserInitials(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'TTS'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function RealtimeAttendanceMonitorPage() {
  const location = useLocation()
  const isHrPath = location.pathname.startsWith('/hr')

  // Stream state từ service
  const [events, setEvents] = useState([])
  const [metrics, setMetrics] = useState({
    totalSwipes: 0,
    checkInCount: 0,
    checkOutCount: 0,
    failedCount: 0,
    successRate: '100%',
    activeGates: 2,
  })
  const [connectionStatus, setConnStatus] = useState('connected')
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(false)

  // Bộ lọc & tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all') // 'all' | 'check_in' | 'check_out'
  const [methodFilter, setMethodFilter] = useState('all') // 'all' | 'qr' | 'rfid'
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'success' | 'failed'
  const [gateFilter, setGateFilter] = useState('all')

  // Modal chi tiết
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Toast
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Đăng ký luồng sự kiện realtime
  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeAttendanceStream((data) => {
      setEvents(data.events)
      setMetrics(data.metrics)
      setConnStatus(data.connectionStatus)
      setIsPaused(data.isPaused)
      setLoading(false)
    })

    // Khởi động mô phỏng định kỳ quẹt thẻ
    startRealtimeSimulation(8000)

    return () => {
      unsubscribe()
      stopRealtimeSimulation()
    }
  }, [])

  // Thao tác: Tạm dừng / Tiếp tục
  function handleTogglePause() {
    const paused = togglePauseStream()
    showToast(paused ? 'Đã tạm dừng nhận luồng sự kiện.' : 'Đã tiếp tục nhận luồng sự kiện.')
  }

  // Thao tác: Kích hoạt quẹt thẻ thủ công ngay lập tức
  function handleTriggerManualSwipe() {
    if (connectionStatus !== 'connected') {
      showToast('Không thể quẹt thẻ khi đang mất kết nối.', 'error')
      return
    }
    const evt = triggerManualSwipe()
    if (evt) {
      showToast(`Đã nhận lượt quẹt mới: ${evt.internName} (${evt.internCode}) tại ${evt.gateName}!`)
    }
  }

  // Thao tác: Thử kết nối lại
  function handleReconnect() {
    setConnStatus('reconnecting')
    setConnectionStatus('reconnecting')
    setTimeout(() => {
      setConnectionStatus('connected')
      showToast('Đã kết nối lại thành công tới Gateway IoT!')
    }, 1200)
  }

  // Danh sách cổng quét có trong dữ liệu
  const gateOptions = useMemo(() => {
    const set = new Set()
    events.forEach((e) => {
      if (e.gateName) set.add(e.gateName)
    })
    return Array.from(set)
  }, [events])

  // Lọc danh sách theo bộ lọc của người dùng
  const filteredEvents = useMemo(() => {
    let result = events
    const q = searchQuery.trim().toLowerCase()

    if (q) {
      result = result.filter(
        (e) =>
          (e.internName || '').toLowerCase().includes(q) ||
          (e.internCode || '').toLowerCase().includes(q) ||
          (e.deviceName || '').toLowerCase().includes(q) ||
          (e.gateName || '').toLowerCase().includes(q) ||
          (e.ipAddress || '').includes(q)
      )
    }

    if (eventTypeFilter !== 'all') {
      result = result.filter((e) => e.eventType === eventTypeFilter)
    }

    if (methodFilter !== 'all') {
      result = result.filter((e) => e.method === methodFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter)
    }

    if (gateFilter !== 'all') {
      result = result.filter((e) => e.gateName === gateFilter)
    }

    return result
  }, [events, searchQuery, eventTypeFilter, methodFilter, statusFilter, gateFilter])

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    eventTypeFilter !== 'all' ||
    methodFilter !== 'all' ||
    statusFilter !== 'all' ||
    gateFilter !== 'all'

  function clearAllFilters() {
    setSearchQuery('')
    setEventTypeFilter('all')
    setMethodFilter('all')
    setStatusFilter('all')
    setGateFilter('all')
  }

  return (
    <div className="admin-page realtime-monitor-page">
      {/* ── Toast thông báo ── */}
      {toast && (
        <div
          className={`admin-toast admin-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <header className="admin-page__head admin-page__head--row">
        <div>
          <nav className="admin-page__crumb" aria-label="Breadcrumb">
            <Link to={isHrPath ? '/hr/dashboard' : '/admin/dashboard'}>
              {isHrPath ? 'Phân hệ Nhân sự (HR)' : 'Admin Console'}
            </Link>
            <span aria-hidden="true">/</span>
            <span>Giám sát Chấm công Realtime</span>
          </nav>
          <h1>Giám sát Chấm công Thời gian thực</h1>
          <p>
            Theo dõi trực tiếp luồng dữ liệu quẹt thẻ từ và quét mã QR tại các cổng vào phòng Lab
            và tòa nhà được kết nối tự động với hệ thống máy chấm công IoT.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn--outline"
            onClick={handleTogglePause}
            data-testid="toggle-pause-btn"
          >
            {isPaused ? <Play size={15} className="text-success" /> : <Pause size={15} />}
            <span>{isPaused ? 'Tiếp tục nhận stream' : 'Tạm dừng stream'}</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleTriggerManualSwipe}
            data-testid="simulate-swipe-btn"
          >
            <Zap size={15} />
            <span>Mô phỏng quẹt thẻ ngay</span>
          </button>
        </div>
      </header>

      {/* ── Thanh trạng thái kết nối Realtime Stream ── */}
      <section className="realtime-stream-strip" aria-label="Trạng thái kết nối realtime">
        <div className="realtime-stream-status">
          <span
            className={`live-pulse-dot live-pulse-dot--${connectionStatus}`}
            data-testid={`status-dot-${connectionStatus}`}
          />
          <div>
            <div className="realtime-status-text">
              {connectionStatus === 'connected' && 'Đang kết nối Realtime • Cổng IoT Gateway Online'}
              {connectionStatus === 'connecting' && 'Đang kết nối tới máy chủ Gateway IoT...'}
              {connectionStatus === 'reconnecting' && 'Đang thử kết nối lại luồng sự kiện...'}
              {connectionStatus === 'disconnected' && 'Mất kết nối tới Gateway máy chấm công IoT'}
            </div>
            <div className="realtime-status-sub">
              Giao thức: WebSocket SSE / FastHRM Protocol v3.4 • Cập nhật tự động
            </div>
          </div>
        </div>

        <div className="realtime-stream-controls">
          {connectionStatus === 'disconnected' ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--sm"
              onClick={handleReconnect}
              data-testid="reconnect-btn"
            >
              <RotateCcw size={14} />
              <span>Kết nối lại</span>
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              onClick={() => {
                setConnectionStatus('disconnected')
                showToast('Đã mô phỏng ngắt kết nối Gateway IoT.', 'error')
              }}
              title="Mô phỏng ngắt kết nối để kiểm thử giao diện"
            >
              <WifiOff size={14} />
              <span>Thử ngắt kết nối</span>
            </button>
          )}

          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-btn--sm"
            onClick={resetAttendanceEvents}
            title="Khôi phục lại dữ liệu mẫu ban đầu"
          >
            <RefreshCw size={14} />
            <span>Đặt lại dữ liệu</span>
          </button>
        </div>
      </section>

      {/* ── Banner cảnh báo khi mất kết nối hoặc tạm dừng ── */}
      {connectionStatus === 'disconnected' && (
        <div className="realtime-alert-banner realtime-alert-banner--danger" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>
              <strong>Cảnh báo mất kết nối:</strong> Không thể nhận dữ liệu quẹt thẻ mới từ cổng IoT.
              Vui lòng kiểm tra đường truyền mạng nội bộ.
            </span>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={handleReconnect}
          >
            Kết nối lại ngay
          </button>
        </div>
      )}

      {isPaused && connectionStatus === 'connected' && (
        <div className="realtime-alert-banner realtime-alert-banner--warning" role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pause size={18} />
            <span>
              <strong>Đang tạm dừng:</strong> Luồng sự kiện đang bị tạm dừng hiển thị. Các lượt quẹt
              mới sẽ không tự động cập nhật cho đến khi bạn bấm Tiếp tục.
            </span>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--outline admin-btn--sm"
            onClick={handleTogglePause}
          >
            Tiếp tục stream
          </button>
        </div>
      )}

      {/* ── 5 Thẻ KPI Thống kê Chấm công Hôm nay ── */}
      <section className="realtime-kpi-grid" aria-label="Chỉ số chấm công hôm nay">
        {/* 1. Tổng lượt quẹt */}
        <div className="admin-qr-kpi-card" data-testid="kpi-total-swipes">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--blue">
            <Activity size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">{metrics.totalSwipes}</span>
            <span className="admin-qr-kpi-label">Tổng lượt quẹt hôm nay</span>
          </div>
        </div>

        {/* 2. Check-in */}
        <div className="admin-qr-kpi-card" data-testid="kpi-checkin">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--green">
            <LogIn size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">{metrics.checkInCount}</span>
            <span className="admin-qr-kpi-label">Vào ca (Check-in)</span>
          </div>
        </div>

        {/* 3. Check-out */}
        <div className="admin-qr-kpi-card" data-testid="kpi-checkout">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--purple">
            <LogOut size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">{metrics.checkOutCount}</span>
            <span className="admin-qr-kpi-label">Tan ca (Check-out)</span>
          </div>
        </div>

        {/* 4. Quét lỗi / Từ chối */}
        <div className="admin-qr-kpi-card" data-testid="kpi-failed">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--amber">
            <AlertTriangle size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">{metrics.failedCount}</span>
            <span className="admin-qr-kpi-label">Lượt quẹt lỗi / Cảnh báo</span>
          </div>
        </div>

        {/* 5. Cổng IoT */}
        <div className="admin-qr-kpi-card" data-testid="kpi-gates">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--blue">
            <Cpu size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">2 Cổng IoT</span>
            <span className="admin-qr-kpi-label">Lab 302 & Tòa C1 (Online)</span>
          </div>
        </div>
      </section>

      {/* ── Thanh lọc & tìm kiếm sự kiện ── */}
      <section className="admin-qr-toolbar" aria-label="Bộ lọc sự kiện quẹt thẻ">
        <div className="admin-qr-toolbar__filters">
          <div className="admin-qr-search-box">
            <Search size={16} className="admin-qr-search-icon" />
            <input
              type="search"
              className="admin-qr-search-input"
              placeholder="Tìm theo họ tên, mã TTS, thiết bị, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm sự kiện"
            />
          </div>

          {/* Lọc loại sự kiện */}
          <select
            className="admin-qr-select"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            aria-label="Lọc theo loại sự kiện"
          >
            <option value="all">Tất cả loại sự kiện</option>
            <option value="check_in">Chỉ vào ca (Check-in)</option>
            <option value="check_out">Chỉ tan ca (Check-out)</option>
          </select>

          {/* Lọc phương thức */}
          <select
            className="admin-qr-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Lọc theo phương thức"
          >
            <option value="all">Tất cả phương thức</option>
            <option value="qr">Mã QR</option>
            <option value="rfid">Thẻ từ RFID / NFC</option>
          </select>

          {/* Lọc trạng thái */}
          <select
            className="admin-qr-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="success">Thành công (Hợp lệ)</option>
            <option value="failed">Thất bại / Cảnh báo</option>
          </select>

          {/* Lọc cổng */}
          {gateOptions.length > 0 && (
            <select
              className="admin-qr-select"
              value={gateFilter}
              onChange={(e) => setGateFilter(e.target.value)}
              aria-label="Lọc theo cổng quét"
            >
              <option value="all">Tất cả cổng IoT</option>
              {gateOptions.map((gate) => (
                <option key={gate} value={gate}>
                  {gate}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              onClick={clearAllFilters}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <p className="admin-page__meta">
          Hiển thị <strong>{filteredEvents.length}</strong> / {events.length} sự kiện
        </p>
      </section>

      {/* ── Bảng danh sách sự kiện quẹt thẻ realtime ── */}
      <section className="admin-qr-table-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Thời gian</th>
                <th>Thực tập sinh</th>
                <th>Mã TTS</th>
                <th>Sự kiện</th>
                <th>Phương thức</th>
                <th>Thiết bị / Cổng</th>
                <th>Trạng thái & Phản hồi</th>
                <th className="admin-table__actions-col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--admin-muted)' }}>
                      <RefreshCw size={16} className="stream-icon-pulse" />
                      <span>Đang kết nối luồng sự kiện chấm công...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="admin-empty">
                      <strong>Chưa có lượt chấm công nào</strong>
                      <span>
                        {hasActiveFilters
                          ? 'Không tìm thấy sự kiện quẹt thẻ nào phù hợp với bộ lọc hiện tại.'
                          : 'Hệ thống chưa ghi nhận lượt quẹt thẻ nào trong phiên làm việc hôm nay.'}
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--outline admin-btn--sm"
                          style={{ marginTop: '12px' }}
                          onClick={clearAllFilters}
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredEvents.map((evt) => {
                  const resolvedAvatar =
                    getSavedAvatar(evt.email, evt.internId, evt.internName) || evt.avatar
                  const isCheckIn = evt.eventType === 'check_in'
                  const isSuccess = evt.status === 'success'

                  return (
                    <tr
                      key={evt.id}
                      className={`realtime-event-row ${evt.isNew ? 'is-new-event' : ''}`}
                      data-testid={`event-row-${evt.id}`}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.86rem', color: 'var(--admin-ink)' }}>
                            {evt.timeFormatted}
                          </strong>
                          {evt.isNew && (
                            <span className="badge-new-pulse">Vừa quẹt</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-muted)' }}>
                          {evt.dateFormatted}
                        </div>
                      </td>

                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar-thumb">
                            {resolvedAvatar ? (
                              <img
                                src={resolvedAvatar}
                                alt={evt.internName}
                                className="admin-avatar-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display = 'flex'
                                  }
                                }}
                              />
                            ) : null}
                            <span
                              className="admin-avatar-initials"
                              style={{ display: resolvedAvatar ? 'none' : 'flex' }}
                            >
                              {getUserInitials(evt.internName)}
                            </span>
                          </div>
                          <div className="admin-user-info">
                            <span className="admin-user-name">{evt.internName}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--admin-muted)' }}>
                              {evt.department}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong className="admin-user-code">{evt.internCode}</strong>
                      </td>

                      <td>
                        {isCheckIn ? (
                          <span
                            className="admin-qr-badge admin-qr-badge--success"
                            style={{ background: '#dcfce7', color: '#15803d' }}
                            data-testid={`badge-event-${evt.id}`}
                          >
                            <LogIn size={13} />
                            <span>Vào ca</span>
                          </span>
                        ) : (
                          <span
                            className="admin-qr-badge"
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                            data-testid={`badge-event-${evt.id}`}
                          >
                            <LogOut size={13} />
                            <span>Tan ca</span>
                          </span>
                        )}
                      </td>

                      <td>
                        {evt.method === 'qr' ? (
                          <span className="admin-qr-code-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Mã QR
                          </span>
                        ) : (
                          <span className="admin-qr-code-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f3e8ff', color: '#6b21a8' }}>
                            Thẻ RFID
                          </span>
                        )}
                      </td>

                      <td>
                        <div>
                          <strong>{evt.gateName}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--admin-muted)' }}>
                            {evt.ipAddress}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {isSuccess ? (
                            <span className="admin-qr-badge admin-qr-badge--success" style={{ width: 'fit-content' }}>
                              <CheckCircle2 size={12} />
                              <span>Thành công</span>
                            </span>
                          ) : (
                            <span className="admin-qr-badge admin-qr-badge--warning" style={{ width: 'fit-content' }}>
                              <AlertTriangle size={12} />
                              <span>Từ chối</span>
                            </span>
                          )}
                          <span style={{ fontSize: '0.74rem', color: isSuccess ? 'var(--admin-muted)' : '#b45309' }}>
                            {evt.message}
                          </span>
                        </div>
                      </td>

                      <td className="admin-table__actions-col">
                        <button
                          type="button"
                          className="admin-btn admin-btn--outline admin-btn--sm"
                          onClick={() => setSelectedEvent(evt)}
                          title="Xem chi tiết kỹ thuật lượt quẹt"
                          data-testid={`view-detail-btn-${evt.id}`}
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal xem chi tiết sự kiện ── */}
      {selectedEvent && (
        <AttendanceEventDetailModal
          event={selectedEvent}
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
