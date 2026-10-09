import { useState, useMemo } from 'react'
import {
  Mail,
  Smartphone,
  Monitor,
  Copy,
  Check,
  X,
  Sparkles,
  Download,
} from 'lucide-react'
import {
  getAdmissionApprovedEmailHtml,
  getAdmissionRejectedEmailHtml,
} from './EmailTemplates'
import './EmailTemplatePreviewModal.css'

export default function EmailTemplatePreviewModal({
  open,
  onClose,
  applicant = null,
  initialTab = 'approved', // 'approved' | 'rejected'
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [deviceMode, setDeviceMode] = useState('desktop') // 'desktop' (600px) | 'mobile' (375px)
  const [copied, setCopied] = useState(false)

  // Generate appropriate HTML based on active tab
  const emailHtml = useMemo(() => {
    if (activeTab === 'approved') {
      return getAdmissionApprovedEmailHtml(applicant || {})
    }
    return getAdmissionRejectedEmailHtml(
      applicant || {},
      applicant?.reject_reason || 'Điểm GPA học vụ hoặc tín chỉ tích lũy chưa đạt chuẩn quy chế tiếp nhận đợt Mùa Thu 2026.'
    )
  }, [activeTab, applicant])

  if (!open) return null

  function handleCopyHtml() {
    navigator.clipboard.writeText(emailHtml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleDownloadHtml() {
    const blob = new Blob([emailHtml], { type: 'text/html;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `email_template_${activeTab}_${applicant?.student_code || 'ICTU'}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container email-preview-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="email-preview-header">
          <div className="email-preview-title-wrap">
            <div className="email-icon-box">
              <Mail size={18} />
            </div>
            <div>
              <h3>Mã HTML Email Template Thông Báo Kết Quả</h3>
              <p>Mẫu thư điện tử Responsive gửi tự động tới Thực tập sinh</p>
            </div>
          </div>

          <div className="email-preview-header-actions">
            {/* Template Selector Tabs */}
            <div className="email-template-tabs">
              <button
                type="button"
                className={`email-tab-btn ${activeTab === 'approved' ? 'is-active email-tab-btn--success' : ''}`}
                onClick={() => setActiveTab('approved')}
              >
                <span className="tab-dot tab-dot--green" />
                Mẫu Báo Đậu (Trúng tuyển)
              </button>
              <button
                type="button"
                className={`email-tab-btn ${activeTab === 'rejected' ? 'is-active email-tab-btn--danger' : ''}`}
                onClick={() => setActiveTab('rejected')}
              >
                <span className="tab-dot tab-dot--red" />
                Mẫu Báo Rớt (Từ chối)
              </button>
            </div>

            {/* Device Switcher */}
            <div className="email-device-switcher">
              <button
                type="button"
                className={`device-btn ${deviceMode === 'desktop' ? 'is-active' : ''}`}
                onClick={() => setDeviceMode('desktop')}
                title="Xem giao diện Desktop (Max 600px)"
              >
                <Monitor size={15} />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                className={`device-btn ${deviceMode === 'mobile' ? 'is-active' : ''}`}
                onClick={() => setDeviceMode('mobile')}
                title="Xem giao diện Mobile (375px)"
              >
                <Smartphone size={15} />
                <span>Mobile</span>
              </button>
            </div>

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Đóng popup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="email-meta-strip">
          <div className="email-meta-left">
            <Sparkles size={14} className="text-primary" />
            <span>
              Người nhận mẫu: <strong>{applicant?.full_name || 'Ứng viên'}</strong> ({applicant?.student_code || 'TTS0003'} - {applicant?.email || 'ungvien@ictu.edu.vn'})
            </span>
          </div>
          <div className="email-meta-badge">
            Chuẩn Responsive HTML Email (Desktop: 600px, Mobile: 100%)
          </div>
        </div>

        {/* Viewport Body */}
        <div className="email-preview-body">
          <div
            className={`email-iframe-frame ${
              deviceMode === 'mobile' ? 'frame--mobile' : 'frame--desktop'
            }`}
          >
            <iframe
              title="Email Responsive Preview"
              srcDoc={emailHtml}
              className="email-preview-iframe"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="email-preview-footer">
          <div className="email-footer-hint">
            ✓ Định dạng HTML đã nhúng CSS Inline và tương thích với Outlook, Gmail, Apple Mail, Thunderbird.
          </div>
          <div className="email-footer-btns">
            <button
              type="button"
              className="hr-btn hr-btn--outline"
              onClick={handleDownloadHtml}
            >
              <Download size={14} />
              <span>Tải file .html</span>
            </button>
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={handleCopyHtml}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Đã sao chép mã HTML!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Sao chép mã HTML</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
