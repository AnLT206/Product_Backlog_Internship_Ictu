import { useEffect } from 'react'
import {
  X,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  CreditCard,
  Cpu,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { getSavedAvatar } from '../../../utils/avatarHelper'

function getUserInitials(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'TTS'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AttendanceEventDetailModal({ event, isOpen, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  const resolvedAvatar =
    getSavedAvatar(event.email, event.internId, event.internName) || event.avatar
  const isCheckIn = event.eventType === 'check_in'
  const isSuccess = event.status === 'success'

  return (
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-event-detail-title"
    >
      <button
        type="button"
        className="admin-modal-backdrop"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="admin-modal-card attendance-event-modal">
        {/* ── Header ── */}
        <div className="admin-modal-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isSuccess ? (
                <CheckCircle2 size={20} className="text-success" />
              ) : (
                <AlertTriangle size={20} className="text-warning" />
              )}
              <h2 id="attendance-event-detail-title" style={{ fontSize: '1.15rem', fontWeight: 750, margin: 0 }}>
                Chi tiết Lượt Quẹt thẻ Chấm công
              </h2>
            </div>
            <p className="admin-modal-subtitle">
              Mã giao dịch phần cứng IoT: <code>{event.id}</code>
            </p>
          </div>
          <button
            type="button"
            className="admin-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
            data-testid="event-modal-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="admin-modal-body" style={{ gap: '16px' }}>
          {/* Thông tin thực tập sinh */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div className="admin-avatar-thumb admin-avatar-thumb--lg">
              {resolvedAvatar ? (
                <img
                  src={resolvedAvatar}
                  alt={event.internName}
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
                {getUserInitials(event.internName)}
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '1.05rem', color: 'var(--admin-ink)' }}>
                  {event.internName}
                </strong>
                <span className="admin-user-code">{event.internCode}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--admin-muted)', marginTop: '2px' }}>
                {event.department} • {event.major}
              </div>
            </div>
          </div>

          {/* Chi tiết thông số quẹt thẻ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <div className="event-detail-field">
              <span className="event-detail-field__label">Loại sự kiện:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 650 }}>
                {isCheckIn ? (
                  <>
                    <LogIn size={15} className="text-success" />
                    <span style={{ color: '#15803d' }}>Vào ca (Check-in)</span>
                  </>
                ) : (
                  <>
                    <LogOut size={15} className="text-primary" />
                    <span style={{ color: '#1d4ed8' }}>Tan ca (Check-out)</span>
                  </>
                )}
              </div>
            </div>

            <div className="event-detail-field">
              <span className="event-detail-field__label">Phương thức:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 650 }}>
                {event.method === 'qr' ? (
                  <>
                    <QrCode size={15} className="text-primary" />
                    <span>Mã QR cá nhân</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={15} style={{ color: '#7c3aed' }} />
                    <span>Thẻ từ RFID / NFC</span>
                  </>
                )}
              </div>
            </div>

            <div className="event-detail-field">
              <span className="event-detail-field__label">Thời gian quẹt:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} className="text-muted" />
                <strong>{event.timeFormatted}</strong> • {event.dateFormatted}
              </div>
            </div>

            <div className="event-detail-field">
              <span className="event-detail-field__label">Trạng thái ghi nhận:</span>
              <div>
                {isSuccess ? (
                  <span className="admin-qr-badge admin-qr-badge--success">
                    <CheckCircle2 size={12} />
                    <span>Thành công (Hợp lệ)</span>
                  </span>
                ) : (
                  <span className="admin-qr-badge admin-qr-badge--warning">
                    <AlertTriangle size={12} />
                    <span>Từ chối / Cảnh báo</span>
                  </span>
                )}
              </div>
            </div>

            <div className="event-detail-field" style={{ gridColumn: 'span 2' }}>
              <span className="event-detail-field__label">Cổng quét & Thiết bị:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={15} className="text-primary" />
                <strong>{event.gateName}</strong>
                <span style={{ color: 'var(--admin-muted)', fontSize: '0.8rem' }}>
                  ({event.deviceName} • IP: {event.ipAddress})
                </span>
              </div>
              {event.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: 'var(--admin-muted)', marginTop: '3px' }}>
                  <MapPin size={12} />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            <div className="event-detail-field" style={{ gridColumn: 'span 2' }}>
              <span className="event-detail-field__label">Thông điệp phản hồi từ máy chấm công:</span>
              <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: isSuccess ? '#1e293b' : '#b45309' }}>
                {event.message}
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '0.76rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={16} className="text-primary" />
            <span>Chống dội quét quẹt thẻ &lt; 60s: Kích hoạt bảo vệ phần cứng IoT</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="admin-modal-foot" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
