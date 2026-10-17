import { useEffect, useState } from 'react'
import { Printer, Copy, Check, X, ShieldCheck } from 'lucide-react'
import InternQrCard from './InternQrCard'

export default function InternQrViewModal({ intern, isOpen, onClose, onPrint }) {
  const [copied, setCopied] = useState(false)

  // Đóng modal khi bấm Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !intern) return null

  const qrPayload = intern.qr_code || `intern:${intern.code}:${intern.id}`

  function handleCopyPayload() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(qrPayload).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  function handlePrintCard() {
    if (onPrint) {
      onPrint(intern)
    } else if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print()
    }
  }

  return (
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intern-qr-modal-title"
    >
      <button
        type="button"
        className="admin-modal-backdrop"
        aria-label="Đóng hộp thoại"
        onClick={onClose}
      />
      <div className="admin-modal-card intern-qr-modal">
        {/* ── Header Modal ── */}
        <div className="admin-modal-head">
          <div>
            <div className="intern-qr-modal__title-row">
              <ShieldCheck size={20} className="text-primary" />
              <h2 id="intern-qr-modal-title">Mã QR Chấm công Cá nhân</h2>
            </div>
            <p className="admin-modal-subtitle">
              Thẻ định danh điện tử dùng cho quét thẻ tại cửa và đầu đọc máy chấm công IoT.
            </p>
          </div>
          <button
            type="button"
            className="admin-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
            data-testid="modal-close-icon-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Thân Modal: Thẻ QR chuẩn PVC ── */}
        <div className="admin-modal-body intern-qr-modal__body">
          <div className="intern-qr-card-preview-wrapper printable-target-card">
            <InternQrCard intern={intern} size={220} />
          </div>

          <div className="intern-qr-modal__meta-strip">
            <div className="meta-strip-item">
              <span>Định danh máy quét:</span>
              <code>{qrPayload}</code>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm copy-payload-btn"
              onClick={handleCopyPayload}
              title="Sao chép mã định danh chuỗi QR"
            >
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              <span>{copied ? 'Đã chép' : 'Chép mã'}</span>
            </button>
          </div>
        </div>

        {/* ── Footer Modal ── */}
        <div className="admin-modal-foot">
          <div className="intern-qr-modal__footer-tip">
            <span>Bản in được tối ưu chuẩn thẻ đeo nhân viên 86mm x 54mm.</span>
          </div>
          <div className="admin-modal-foot-actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary print-qr-btn"
              onClick={handlePrintCard}
              data-testid="modal-print-btn"
            >
              <Printer size={16} />
              <span>In mã QR này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
