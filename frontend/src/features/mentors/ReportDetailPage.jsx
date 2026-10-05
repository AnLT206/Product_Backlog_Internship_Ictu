/**
 * ReportDetailPage.jsx
 * Route: /mentor/reports/:id
 *
 * Màn hình chi tiết báo cáo tuần kèm form textarea để Mentor viết phản hồi.
 * CHƯA gọi API ở task này (Task 1: Mock UI; Task 2 sẽ kết nối POST /api/mentor/reports/:id/feedback).
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMockReportById, addMockFeedback } from './mockReports'
import './ReportDetailPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */
function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPeriod(start, end) {
  if (!start || !end) return '—'
  const s = new Date(start).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const e = new Date(end).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${s} đến ${e}`
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
export default function ReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [prevId, setPrevId] = useState(id)
  const [report, setReport] = useState(() => getMockReportById(id))

  if (prevId !== id) {
    setPrevId(id)
    setReport(getMockReportById(id))
  }

  const [comment, setComment] = useState('')
  const [score, setScore] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [toast, setToast] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  if (!report) {
    return (
      <div className="rdp-page">
        <div className="rdp-notfound">
          <h2>Không tìm thấy báo cáo</h2>
          <p>Báo cáo tuần yêu cầu không tồn tại hoặc đã bị xoá.</p>
          <button type="button" className="rdp-btn rdp-btn--primary" onClick={() => navigate('/mentor/reports')}>
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    )
  }

  function handleSubmitFeedback(e) {
    e.preventDefault()

    if (!comment.trim()) {
      setFieldError('Vui lòng nhập nội dung nhận xét, góp ý cho thực tập sinh.')
      return
    }

    if (score !== '' && (Number(score) < 0 || Number(score) > 10)) {
      setFieldError('Điểm đánh giá phải nằm trong khoảng từ 0 đến 10.')
      return
    }

    setFieldError('')
    setIsSubmitting(true)

    // Simulate feedback submission (Task 1: Mock UI; Task 2 will call POST /api/mentor/reports/:id/feedback)
    const result = addMockFeedback(report.id, {
      score: score !== '' ? Number(score) : null,
      comment: comment.trim(),
      mentorName: user?.full_name || 'Mentor Nguyễn Tiến Dũng',
    })

    if (result.ok) {
      setReport(result.data)
      setComment('')
      setScore('')
      setToast({
        type: 'success',
        message: 'Đã gửi phản hồi và chấm điểm thành công cho báo cáo này!',
      })
    } else {
      setToast({
        type: 'error',
        message: result.error || 'Có lỗi xảy ra khi lưu phản hồi.',
      })
    }

    setIsSubmitting(false)
  }

  const isReviewed = report.status === 'reviewed'

  return (
    <div className="rdp-page">
      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`rdp-toast rdp-toast--${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button type="button" className="rdp-toast__close" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}

      {/* ── Navigation & Header ── */}
      <div className="rdp-header">
        <div className="rdp-header__left">
          <Link to="/mentor/reports" className="rdp-back-link">
            ← Quay lại danh sách
          </Link>
          <div className="rdp-header__title-row">
            <span className="rdp-week-tag">Tuần {report.week_number}</span>
            <h1>{report.title}</h1>
          </div>
        </div>

        <div className="rdp-header__badge">
          <span className={`rdp-status-badge ${isReviewed ? 'rdp-status-badge--reviewed' : 'rdp-status-badge--submitted'}`}>
            {isReviewed ? 'Đã phản hồi' : 'Chưa đọc / Cần duyệt'}
          </span>
        </div>
      </div>

      <div className="rdp-layout">
        {/* ── Left Column: Report Contents ── */}
        <div className="rdp-col-main">
          {/* Card: Thông tin cơ bản */}
          <div className="rdp-card rdp-meta-card">
            <div className="rdp-meta-grid">
              <div className="rdp-meta-item">
                <span className="rdp-meta-item__label">Thực tập sinh</span>
                <span className="rdp-meta-item__val rdp-meta-item__val--bold">
                  {report.user_name} ({report.user_code})
                </span>
              </div>
              <div className="rdp-meta-item">
                <span className="rdp-meta-item__label">Chương trình</span>
                <span className="rdp-meta-item__val">{report.program_name || 'Chương trình thực tập'}</span>
              </div>
              <div className="rdp-meta-item">
                <span className="rdp-meta-item__label">Khoảng thời gian</span>
                <span className="rdp-meta-item__val">{formatPeriod(report.start_date, report.end_date)}</span>
              </div>
              <div className="rdp-meta-item">
                <span className="rdp-meta-item__label">Ngày giờ nộp</span>
                <span className="rdp-meta-item__val">{formatDate(report.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Card: Nội dung báo cáo */}
          <div className="rdp-card">
            <h2 className="rdp-card__title">1. Chi tiết công việc đã thực hiện trong tuần</h2>
            <div className="rdp-prose">
              {report.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {report.difficulties && (
              <>
                <div className="rdp-divider" />
                <h2 className="rdp-card__title">2. Khó khăn, vướng mắc gặp phải</h2>
                <div className="rdp-prose">
                  {report.difficulties.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </>
            )}

            {report.next_week_plan && (
              <>
                <div className="rdp-divider" />
                <h2 className="rdp-card__title">3. Kế hoạch công việc tuần tiếp theo</h2>
                <div className="rdp-prose">
                  {report.next_week_plan.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Card: Lịch sử phản hồi trước đó (nếu có) */}
          {report.feedbacks && report.feedbacks.length > 0 && (
            <div className="rdp-card rdp-card--history">
              <h2 className="rdp-card__title">Lịch sử nhận xét của Mentor</h2>
              <div className="rdp-feedback-list">
                {report.feedbacks.map((fb) => (
                  <div key={fb.id} className="rdp-feedback-item">
                    <div className="rdp-feedback-item__head">
                      <div className="rdp-feedback-mentor">
                        <strong>{fb.mentor_name || 'Mentor'}</strong>
                        <span className="rdp-feedback-date">{formatDate(fb.created_at)}</span>
                      </div>
                      {fb.score !== null && fb.score !== undefined && (
                        <span className="rdp-feedback-score">Điểm: {fb.score}/10</span>
                      )}
                    </div>
                    <p className="rdp-feedback-comment">{fb.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Feedback Form ── */}
        <div className="rdp-col-side">
          <div className="rdp-card rdp-form-card">
            <div className="rdp-form-card__head">
              <h2 className="rdp-card__title">Viết phản hồi cho Thực tập sinh</h2>
              <p className="rdp-card__desc">
                Nhận xét đóng góp ý kiến về kết quả công việc và định hướng cho tuần làm việc tiếp theo.
              </p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="rdp-form">
              {/* Điểm đánh giá (thang 10) */}
              <div className="rdp-form-group">
                <label htmlFor="feedback-score" className="rdp-label">
                  Điểm đánh giá (thang 10) <span className="rdp-opt">(tuỳ chọn)</span>
                </label>
                <div className="rdp-score-input-wrap">
                  <input
                    id="feedback-score"
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    className="rdp-input rdp-input--score"
                    placeholder="VD: 8.5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                  <span className="rdp-score-unit">/ 10</span>
                </div>
              </div>

              {/* Textarea viết phản hồi */}
              <div className="rdp-form-group">
                <label htmlFor="feedback-comment" className="rdp-label">
                  Nội dung nhận xét, góp ý <span className="rdp-req">*</span>
                </label>
                <textarea
                  id="feedback-comment"
                  className={`rdp-textarea ${fieldError ? 'rdp-textarea--error' : ''}`}
                  rows={6}
                  placeholder="Nhập nội dung nhận xét chi tiết, lời khuyên hoặc hướng dẫn khắc phục khó khăn..."
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value)
                    if (fieldError) setFieldError('')
                  }}
                />
                {fieldError && <p className="rdp-field-error">{fieldError}</p>}
              </div>

              {/* Action Button */}
              <div className="rdp-form-actions">
                <button
                  type="submit"
                  className="rdp-btn rdp-btn--primary rdp-btn--block"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
