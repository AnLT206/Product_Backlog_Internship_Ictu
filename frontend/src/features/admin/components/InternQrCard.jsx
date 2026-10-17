import { getSavedAvatar } from '../../../utils/avatarHelper'
import QrCodeSvg from './QrCodeSvg'

function getUserInitials(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'TTS'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * InternQrCard - Thẻ nhận diện & mã QR chấm công thực tập sinh chuẩn PVC
 * Tái sử dụng được cả trong Modal xem chi tiết lẫn chế độ In ấn (@media print)
 */
export default function InternQrCard({ intern, size = 200, className = '' }) {
  if (!intern) return null

  const resolvedAvatar =
    getSavedAvatar(intern.email, intern.id, intern.full_name) || intern.avatar
  const qrPayload = intern.qr_code || `intern:${intern.code}:${intern.id}`

  return (
    <div className={`intern-qr-card ${className}`} data-testid={`qr-card-${intern.code}`}>
      {/* ── Đầu thẻ (Header Thẻ Đeo Doanh Nghiệp) ── */}
      <div className="intern-qr-card__header">
        <div className="intern-qr-card__brand">
          <span className="intern-qr-card__org">ICTU ENTERPRISE INTERNSHIP</span>
          <span className="intern-qr-card__subtitle">TRƯỜNG ĐH CÔNG NGHỆ THÔNG TIN & TRUYỀN THÔNG</span>
        </div>
        <div className="intern-qr-card__badge-type">THẺ CHẤM CÔNG IoT</div>
      </div>

      {/* ── Thân thẻ: Avatar + Thông tin nhận diện ── */}
      <div className="intern-qr-card__body">
        <div className="intern-qr-card__profile">
          <div className="intern-qr-card__avatar-wrap">
            {resolvedAvatar ? (
              <img
                src={resolvedAvatar}
                alt={intern.full_name || ''}
                className="intern-qr-card__avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex'
                  }
                }}
              />
            ) : null}
            <div
              className="intern-qr-card__avatar-fallback"
              style={{ display: resolvedAvatar ? 'none' : 'flex' }}
            >
              {getUserInitials(intern.full_name)}
            </div>
          </div>

          <div className="intern-qr-card__info">
            <h3 className="intern-qr-card__name">{intern.full_name}</h3>
            <div className="intern-qr-card__code-pill">
              <span>Mã TTS:</span>
              <strong>{intern.code}</strong>
            </div>
            <p className="intern-qr-card__detail">
              <strong>Email:</strong> {intern.email}
            </p>
            <p className="intern-qr-card__detail">
              <strong>Chuyên ngành:</strong> {intern.major || 'Công nghệ thông tin'}
            </p>
            <p className="intern-qr-card__detail">
              <strong>Bộ phận:</strong> {intern.department || 'Phát triển Phần mềm'}
            </p>
            <p className="intern-qr-card__detail">
              <strong>Đợt:</strong> {intern.batch || 'Kỳ Thu 2026'}
            </p>
          </div>
        </div>

        {/* ── Khối mã QR kích thước chuẩn máy quét đọc ── */}
        <div className="intern-qr-card__qr-section">
          <div className="intern-qr-card__qr-frame">
            <QrCodeSvg
              value={qrPayload}
              size={size}
              margin={2}
              title={`Mã QR chấm công của ${intern.full_name} (${intern.code})`}
            />
          </div>
          <div className="intern-qr-card__payload-tag">
            <code>{qrPayload}</code>
          </div>
        </div>
      </div>

      {/* ── Chân thẻ: Hướng dẫn quét và chỉ dẫn bảo mật ── */}
      <div className="intern-qr-card__footer">
        <div className="intern-qr-card__instruction">
          <span>• Đưa mã này vào ô quét camera của cổng tự động hoặc máy chấm công IoT</span>
          <span>• Tiêu chuẩn FastHRM v3.4 • Hạn thẻ: 31/12/2026</span>
        </div>
        <div className="intern-qr-card__security-mark">
          <span>SECURITY ENCRYPTED</span>
        </div>
      </div>
    </div>
  )
}
