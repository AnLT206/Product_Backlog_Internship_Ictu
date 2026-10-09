import React, { useState } from 'react'
import {
  Mail,
  Copy,
  Check,
  Eye,
  Code2,
  Calendar,
  Clock,
  Video,
  User,
  FileText,
  ExternalLink,
} from 'lucide-react'
import './MeetingEmailNotificationCheckbox.css'

/**
 * MÃ NGUỒN EMAIL TEMPLATE HTML + INLINE CSS TĨNH
 * Dành cho Backend (Python FastAPI/Jinja2, Node.js, v.v.) làm Template gửi mail tự động.
 * Đảm bảo 100% chuẩn Email Responsive, hỗ trợ Gmail, Outlook, Apple Mail.
 */
export const MEETING_EMAIL_TEMPLATE_HTML = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Thông báo Lịch họp Thực tập Doanh nghiệp</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .header-title { font-size: 20px !important; line-height: 26px !important; }
      .info-label { width: 35% !important; font-size: 13px !important; }
      .btn-cta { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center style="width: 100%; background-color: #f1f5f9;">
    <!-- Bảng chính Max 600px -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      
      <!-- 1. Header Logo & Banner Thương hiệu -->
      <tr>
        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;" class="fluid-padding">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <!-- Logo Header -->
                <div style="background-color: #ffffff; display: inline-block; padding: 6px 14px; border-radius: 8px; margin-bottom: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                  <img src="https://ictu.edu.vn/wp-content/uploads/2021/04/logo-ictu.png" alt="ICTU Portal" width="130" style="display: block; max-width: 130px; height: auto; border: 0;" />
                </div>
                <div style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #dbeafe; margin-bottom: 8px;">
                  HỆ THỐNG QUẢN LÝ THỰC TẬP DOANH NGHIỆP ICTU
                </div>
                <h1 class="header-title" style="margin: 0; font-size: 22px; font-weight: 800; line-height: 28px; letter-spacing: -0.5px; color: #ffffff;">
                  THÔNG BÁO LỊCH HỌP MỚI
                </h1>
                <p style="margin: 8px 0 0 0; font-size: 13.5px; color: #bfdbfe; font-weight: 500;">
                  Thư mời tham gia buổi họp đánh giá &amp; trao đổi chuyên môn
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- 2. Thân Email: Lời chào & Bảng thông tin chi tiết cuộc họp -->
      <tr>
        <td style="padding: 28px 28px 20px;" class="fluid-padding">
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 22px; color: #334155;">
            Xin chào <strong>{{recipient_name}}</strong>,
          </p>
          <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 22px; color: #475569;">
            Bạn nhận được email này vì đã được thêm vào danh sách người tham gia buổi họp thực tập với thông tin cụ thể như sau:
          </p>

          <!-- Card Thông tin cuộc họp -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px; overflow: hidden;">
            <tr>
              <td style="padding: 18px 20px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Chủ đề cuộc họp</span>
                <h3 style="margin: 4px 0 0; font-size: 17px; font-weight: 700; color: #0f172a; line-height: 24px;">
                  {{meeting_title}}
                </h3>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px;">
                <table role="presentation" border="0" cellpadding="6" cellspacing="0" width="100%">
                  <tr>
                    <td class="info-label" width="30%" style="font-size: 13.5px; font-weight: 600; color: #64748b; vertical-align: top;">
                      ⏰ Thời gian:
                    </td>
                    <td style="font-size: 14px; font-weight: 700; color: #1e293b; vertical-align: top;">
                      {{meeting_time}}
                    </td>
                  </tr>
                  <tr>
                    <td class="info-label" width="30%" style="font-size: 13.5px; font-weight: 600; color: #64748b; vertical-align: top;">
                      📍 Hình thức / Địa điểm:
                    </td>
                    <td style="font-size: 14px; font-weight: 600; color: #2563eb; vertical-align: top;">
                      {{meeting_location}}
                    </td>
                  </tr>
                  <tr>
                    <td class="info-label" width="30%" style="font-size: 13.5px; font-weight: 600; color: #64748b; vertical-align: top;">
                      👤 Người chủ trì (Host):
                    </td>
                    <td style="font-size: 14px; color: #334155; vertical-align: top;">
                      {{host_name}}
                    </td>
                  </tr>
                  <tr>
                    <td class="info-label" width="30%" style="font-size: 13.5px; font-weight: 600; color: #64748b; vertical-align: top;">
                      📝 Nội dung họp (Agenda):
                    </td>
                    <td style="font-size: 13.5px; color: #475569; line-height: 20px; vertical-align: top;">
                      {{agenda}}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- 3. Nút Call To Action (Link họp trực tuyến) -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
            <tr>
              <td align="center">
                <a href="{{meeting_link}}" target="_blank" class="btn-cta" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35); letter-spacing: 0.3px;">
                  👉 Tham Gia Cuộc Họp (Join Meeting)
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 10px;">
                <span style="font-size: 12px; color: #64748b;">
                  Hoặc truy cập trực tiếp: <a href="{{meeting_link}}" style="color: #2563eb; word-break: break-all; text-decoration: underline;">{{meeting_link}}</a>
                </span>
              </td>
            </tr>
          </table>

          <!-- Ghi chú nhắc nhở -->
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin-top: 20px;">
            <p style="margin: 0; font-size: 12.5px; color: #92400e; line-height: 18px;">
              💡 <strong>Lưu ý:</strong> Vui lòng có mặt trước giờ họp 5 phút, chuẩn bị webcam &amp; micro ổn định và tài liệu báo cáo tiến độ tuần để buổi làm việc đạt hiệu quả cao nhất.
            </p>
          </div>
        </td>
      </tr>

      <!-- 4. Footer Email -->
      <tr>
        <td style="background-color: #f8fafc; padding: 22px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 18px;" class="fluid-padding">
          <p style="margin: 0 0 6px;">
            Email này được gửi tự động từ <strong>Hệ thống Quản lý Thực tập ICTU</strong>.
          </p>
          <p style="margin: 0 0 8px; color: #94a3b8;">
            Vui lòng không trả lời trực tiếp email này. Mọi thắc mắc xin liên hệ bộ phận Điều phối hoặc Mentor phụ trách.
          </p>
          <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
            © 2026 Trường Đại học Công nghệ Thông tin &amp; Truyền thông (ICTU) · Thái Nguyên.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`

/**
 * Hàm helper thay thế placeholders bằng dữ liệu thực tế
 */
export function generateMeetingEmailHtml(data = {}) {
  const recipientName = data.recipientName || 'Thực tập sinh'
  const meetingTitle = data.title || 'Đánh giá Tiến độ Thực tập Sprint 2 & Q&A'
  const meetingTime = data.time || '09:00 - 10:30, Thứ Sáu, Ngày 10/10/2026'
  const meetingLocation = data.location || 'Trực tuyến qua Google Meet (meet.google.com/xyz-abcd-efg)'
  const hostName = data.host || 'Mentor Nguyễn Văn Tuấn (Tech Lead)'
  const agenda = data.agenda || 'Review kết quả công việc tuần 4, demo tính năng hoàn thành và giải đáp vướng mắc kỹ thuật.'
  const meetingLink = data.link || 'https://meet.google.com/xyz-abcd-efg'

  return MEETING_EMAIL_TEMPLATE_HTML
    .replace(/{{recipient_name}}/g, recipientName)
    .replace(/{{meeting_title}}/g, meetingTitle)
    .replace(/{{meeting_time}}/g, meetingTime)
    .replace(/{{meeting_location}}/g, meetingLocation)
    .replace(/{{host_name}}/g, hostName)
    .replace(/{{agenda}}/g, agenda)
    .replace(/{{meeting_link}}/g, meetingLink)
}

/**
 * Thành phần 2: Email Checkbox & Template HTML
 * Checkbox độc lập để gắn vào bất kỳ Form tạo Lịch họp nào.
 *
 * @param {boolean} checked - Trạng thái checkbox (nếu dùng controlled)
 * @param {Function} onChange - Callback khi thay đổi trạng thái checkbox
 * @param {Object} meetingData - Dữ liệu cuộc họp để hiển thị live preview
 */
export default function MeetingEmailNotificationCheckbox({
  checked: controlledChecked,
  onChange,
  meetingData,
}) {
  const [internalChecked, setInternalChecked] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [activeTab, setActiveTab] = useState('preview') // 'preview' | 'code'
  const [copied, setCopied] = useState(false)

  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked

  const handleCheckboxChange = (e) => {
    const nextVal = e.target.checked
    setInternalChecked(nextVal)
    if (typeof onChange === 'function') {
      onChange(e)
    }
  }

  const generatedHtml = generateMeetingEmailHtml(meetingData)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(MEETING_EMAIL_TEMPLATE_HTML)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      // Fallback copy
      const textarea = document.createElement('textarea')
      textarea.value = MEETING_EMAIL_TEMPLATE_HTML
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="meeting-email-checkbox-wrapper" data-testid="meeting-email-checkbox-root">
      {/* 1. Checkbox "Gửi email tự động thông báo cho người tham gia" */}
      <div className={`email-checkbox-card ${isChecked ? 'is-checked' : ''}`}>
        <label className="email-checkbox-label">
          <input
            type="checkbox"
            className="email-checkbox-input"
            checked={isChecked}
            onChange={handleCheckboxChange}
            data-testid="send-email-notification-checkbox"
          />
          <span className="email-checkbox-custom">
            <Check size={14} className="email-check-icon" />
          </span>

          <div className="email-checkbox-text-group">
            <span className="email-checkbox-title">
              <Mail size={16} className="email-title-icon" />
              Gửi email tự động thông báo cho người tham gia
            </span>
            <span className="email-checkbox-desc">
              Hệ thống sẽ tự động gửi email thư mời chuẩn Responsive kèm link họp Google Meet/MS Teams đến tất cả thành viên khi lịch họp được tạo.
            </span>
          </div>
        </label>

        {/* Nút Xem trước & Sao chép mã HTML cho Backend */}
        {isChecked && (
          <div className="email-checkbox-actions" data-testid="email-template-action-bar">
            <button
              type="button"
              className="btn-preview-email"
              onClick={() => setShowPreviewModal(true)}
              data-testid="btn-preview-email-template"
            >
              <Eye size={14} />
              <span>Xem trước Template Email</span>
            </button>

            <button
              type="button"
              className={`btn-copy-code ${copied ? 'is-copied' : ''}`}
              onClick={handleCopyCode}
              data-testid="btn-copy-html-template"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Đã sao chép HTML!' : 'Copy Template cho Backend'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Modal Xem trước & Lấy mã nguồn Email Template cho Backend */}
      {showPreviewModal && (
        <div className="email-template-modal-backdrop" role="dialog" aria-modal="true">
          <div className="email-template-modal-card">
            {/* Modal Header */}
            <div className="email-template-modal-header">
              <div className="email-modal-title-group">
                <Mail size={20} className="email-modal-header-icon" />
                <div>
                  <h3 className="email-modal-title">Template Email Lịch Họp (Responsive HTML)</h3>
                  <p className="email-modal-subtitle">
                    Thiết kế tối ưu cho Gmail, Outlook, Apple Mail kèm Inline CSS để Backend ném vào hàm gửi mail.
                  </p>
                </div>
              </div>

              <div className="email-modal-header-actions">
                <button
                  type="button"
                  className={`btn-copy-code-modal ${copied ? 'is-copied' : ''}`}
                  onClick={handleCopyCode}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Đã sao chép!' : 'Copy HTML cho Backend'}</span>
                </button>

                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setShowPreviewModal(false)}
                  aria-label="Đóng modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Tabs: Live Preview vs Mã nguồn HTML */}
            <div className="email-modal-tabs">
              <button
                type="button"
                className={`email-modal-tab ${activeTab === 'preview' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('preview')}
                data-testid="tab-preview-email"
              >
                <Eye size={15} />
                <span>Xem trước giao diện (Live Preview)</span>
              </button>

              <button
                type="button"
                className={`email-modal-tab ${activeTab === 'code' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('code')}
                data-testid="tab-code-email"
              >
                <Code2 size={15} />
                <span>Mã nguồn HTML / Inline CSS tĩnh</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="email-modal-body">
              {activeTab === 'preview' ? (
                <div className="email-preview-frame-wrap" data-testid="email-live-preview-container">
                  <iframe
                    title="Live Email Preview"
                    srcDoc={generatedHtml}
                    className="email-preview-iframe"
                  />
                </div>
              ) : (
                <div className="email-code-container" data-testid="email-code-block">
                  <pre className="email-code-block">
                    <code>{MEETING_EMAIL_TEMPLATE_HTML}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="email-modal-footer">
              <span className="email-modal-footer-note">
                💡 <strong>Gợi ý cho Backend Developer:</strong> Bạn có thể dùng chuỗi HTML tĩnh này với Jinja2 <code>Environment</code> (FastAPI / Flask) hoặc Nodemailer/Handlebars và thay thế các placeholder <code>&#123;&#123;meeting_title&#125;&#125;</code>, <code>&#123;&#123;meeting_time&#125;&#125;</code>, <code>&#123;&#123;meeting_link&#125;&#125;</code>.
              </span>
              <button
                type="button"
                className="btn-modal-done"
                onClick={() => setShowPreviewModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

