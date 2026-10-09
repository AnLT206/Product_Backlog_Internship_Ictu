/**
 * MeetingCreateModal.jsx
 * Modal form tạo lịch họp dành cho HR và Mentor (SCRUM-179).
 *
 * US: "Là hệ thống, tôi muốn gửi email tự động khi có lịch họp để thông báo cho thực tập sinh."
 *
 * Tính năng chính:
 * - Đầy đủ các trường lịch họp theo backend MeetingCreate schema:
 *   + Tiêu đề / Tên cuộc họp (bắt buộc)
 *   + Ngày họp (bắt buộc)
 *   + Thời gian bắt đầu / kết thúc (bắt buộc)
 *   + Địa điểm hoặc link họp trực tuyến (tùy chọn)
 *   + Danh sách người tham gia / thực tập sinh (bắt buộc)
 *   + Nội dung / Mô tả cuộc họp (tùy chọn)
 * - Tùy chọn Checkbox bắt buộc:
 *   "Gửi email thông báo tự động cho người tham gia"
 *   state: send_email_notification (boolean, mặc định: false)
 * - Tương thích thiết kế cho cả 2 role:
 *   + role='hr': Badge HR màu xanh dương, phong cách quản trị
 *   + role='mentor': Badge Mentor màu xanh lá, phong cách hướng dẫn
 * - Hoạt động độc lập ở mức UI/state (không gọi API gửi email thật).
 */

import { useCallback, useEffect, useState } from 'react'
import { getInterns } from '../../api/interns'
import { getAssignedInterns } from '../../api/mentors'
import './MeetingCreateModal.css'

const INITIAL_FORM = {
  title: '',
  meeting_date: '',
  start_time: '',
  end_time: '',
  meeting_link: '',
  intern_ids: [],
  description: '',
  send_email_notification: false,
}

const FALLBACK_INTERNS = [
  { id: 1, intern_name: 'Nguyễn Văn An', intern_email: 'an.nv@ictu.edu.vn', intern_code: 'TTS-001' },
  { id: 2, intern_name: 'Trần Thị Bình', intern_email: 'binh.tt@ictu.edu.vn', intern_code: 'TTS-002' },
  { id: 3, intern_name: 'Lê Hoàng Cường', intern_email: 'cuong.lh@ictu.edu.vn', intern_code: 'TTS-003' },
  { id: 4, intern_name: 'Phạm Minh Đức', intern_email: 'duc.pm@ictu.edu.vn', intern_code: 'TTS-004' },
]

export default function MeetingCreateModal({
  isOpen = true,
  onClose,
  onSuccess,
  role = 'hr',
  initialInternIds = [],
}) {
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    intern_ids: Array.isArray(initialInternIds) && initialInternIds.length > 0 ? initialInternIds : [],
  }))

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [interns, setInterns] = useState([])
  const [loadingInterns, setLoadingInterns] = useState(true)

  const handleClose = useCallback(() => {
    if (!submitting) {
      onClose?.()
    }
  }, [submitting, onClose])

  // Tải danh sách thực tập sinh phù hợp theo role (HR lấy toàn bộ, Mentor lấy TTS phụ trách)
  useEffect(() => {
    let active = true

    async function loadAttendees() {
      try {
        if (role === 'mentor') {
          const res = await getAssignedInterns()
          if (!active) return
          if (res?.ok && Array.isArray(res.data?.items) && res.data.items.length > 0) {
            const mapped = res.data.items.map((i) => ({
              id: i.intern_id || i.id,
              intern_name: i.intern_name || i.full_name || 'Thực tập sinh',
              intern_email: i.intern_email || i.email || '',
              intern_code: i.intern_code || '',
            }))
            setInterns(mapped)
          } else {
            setInterns(FALLBACK_INTERNS)
          }
        } else {
          const res = await getInterns()
          if (!active) return
          const items = res?.data?.items || (Array.isArray(res?.data) ? res.data : [])
          if (res?.ok && items.length > 0) {
            const mapped = items.map((i) => ({
              id: i.id,
              intern_name: i.full_name || i.name || 'Thực tập sinh',
              intern_email: i.email || '',
              intern_code: i.intern_code || '',
            }))
            setInterns(mapped)
          } else {
            setInterns(FALLBACK_INTERNS)
          }
        }
      } catch {
        if (active) {
          setInterns(FALLBACK_INTERNS)
        }
      } finally {
        if (active) {
          setLoadingInterns(false)
        }
      }
    }

    if (isOpen) {
      void loadAttendees()
    }

    return () => {
      active = false
    }
  }, [isOpen, role])

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  function handleCheckboxChange(e) {
    const { name, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  function handleInternToggle(internId) {
    setForm((prev) => {
      const exists = prev.intern_ids.includes(internId)
      const nextIds = exists
        ? prev.intern_ids.filter((id) => id !== internId)
        : [...prev.intern_ids, internId]
      return { ...prev, intern_ids: nextIds }
    })
    if (errors.intern_ids) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.intern_ids
        return next
      })
    }
  }

  function handleSelectAllInterns() {
    setForm((prev) => {
      const allSelected = prev.intern_ids.length === interns.length
      return {
        ...prev,
        intern_ids: allSelected ? [] : interns.map((i) => i.id),
      }
    })
    if (errors.intern_ids) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.intern_ids
        return next
      })
    }
  }

  function validate() {
    const nextErrors = {}
    if (!form.title.trim()) {
      nextErrors.title = 'Vui lòng nhập tên cuộc họp.'
    } else if (form.title.trim().length > 255) {
      nextErrors.title = 'Tên cuộc họp không được vượt quá 255 ký tự.'
    }

    if (!form.meeting_date) {
      nextErrors.meeting_date = 'Vui lòng chọn ngày họp.'
    }

    if (!form.start_time) {
      nextErrors.start_time = 'Vui lòng chọn thời gian bắt đầu.'
    }

    if (!form.end_time) {
      nextErrors.end_time = 'Vui lòng chọn thời gian kết thúc.'
    } else if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      nextErrors.end_time = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
    }

    if (!Array.isArray(form.intern_ids) || form.intern_ids.length === 0) {
      nextErrors.intern_ids = 'Vui lòng chọn ít nhất một người tham gia.'
    }

    return nextErrors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)

    // Chuẩn bị payload chuẩn khớp backend schema MeetingCreate + frontend state
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      meeting_date: form.meeting_date,
      start_time: `${form.meeting_date}T${form.start_time}:00`,
      end_time: `${form.meeting_date}T${form.end_time}:00`,
      meeting_link: form.meeting_link.trim() || null,
      intern_ids: form.intern_ids,
      send_email_notification: Boolean(form.send_email_notification),
    }

    // Mô phỏng thành công ở mức UI/state (không gọi API gửi email thật)
    setTimeout(() => {
      setSubmitting(false)
      onSuccess?.(payload)
      onClose?.()
    }, 200)
  }

  const isMentor = role === 'mentor'

  return (
    <div
      className={`mc-modal-backdrop${isMentor ? ' mc-role-mentor' : ' mc-role-hr'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          handleClose()
        }
      }}
    >
      <div className="mc-modal-dialog">
        {/* ── Modal Header ── */}
        <div className="mc-modal-header">
          <div className="mc-modal-title-wrap">
            <span className="mc-modal-badge">
              {isMentor ? 'Mentor' : 'HR'}
            </span>
            <h2 id="mc-modal-title">
              {isMentor ? 'Đặt' : 'Tạo'} <span>lịch họp</span> mới
            </h2>
          </div>
          <button
            id="mc-modal-close-btn"
            type="button"
            className="mc-modal-close"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Đóng popup"
          >
            &times;
          </button>
        </div>

        <hr className="mc-modal-divider" />

        {/* ── Modal Body / Form ── */}
        <form
          id="mc-meeting-form"
          className="mc-modal-body"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting}
        >
          {/* Tên cuộc họp * */}
          <div className={`mc-form-group${errors.title ? ' mc-form-group--error' : ''}`}>
            <label htmlFor="mc-title">
              Tên cuộc họp <span className="mc-required">*</span>
            </label>
            <input
              id="mc-title"
              name="title"
              type="text"
              placeholder="VD: Họp định hướng Sprint 2 & Đánh giá tiến độ"
              value={form.title}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="off"
              aria-describedby={errors.title ? 'err-mc-title' : undefined}
            />
            {errors.title && (
              <span id="err-mc-title" className="mc-form-error" role="alert">
                {errors.title}
              </span>
            )}
          </div>

          {/* Hàng ngày họp và thời gian */}
          <div className="mc-form-grid-3">
            {/* Ngày họp * */}
            <div className={`mc-form-group${errors.meeting_date ? ' mc-form-group--error' : ''}`}>
              <label htmlFor="mc-meeting-date">
                Ngày họp <span className="mc-required">*</span>
              </label>
              <input
                id="mc-meeting-date"
                name="meeting_date"
                type="date"
                value={form.meeting_date}
                onChange={handleChange}
                disabled={submitting}
                aria-describedby={errors.meeting_date ? 'err-mc-date' : undefined}
              />
              {errors.meeting_date && (
                <span id="err-mc-date" className="mc-form-error" role="alert">
                  {errors.meeting_date}
                </span>
              )}
            </div>

            {/* Thời gian bắt đầu * */}
            <div className={`mc-form-group${errors.start_time ? ' mc-form-group--error' : ''}`}>
              <label htmlFor="mc-start-time">
                Bắt đầu <span className="mc-required">*</span>
              </label>
              <input
                id="mc-start-time"
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
                disabled={submitting}
                aria-describedby={errors.start_time ? 'err-mc-start' : undefined}
              />
              {errors.start_time && (
                <span id="err-mc-start" className="mc-form-error" role="alert">
                  {errors.start_time}
                </span>
              )}
            </div>

            {/* Thời gian kết thúc * */}
            <div className={`mc-form-group${errors.end_time ? ' mc-form-group--error' : ''}`}>
              <label htmlFor="mc-end-time">
                Kết thúc <span className="mc-required">*</span>
              </label>
              <input
                id="mc-end-time"
                name="end_time"
                type="time"
                value={form.end_time}
                onChange={handleChange}
                disabled={submitting}
                aria-describedby={errors.end_time ? 'err-mc-end' : undefined}
              />
              {errors.end_time && (
                <span id="err-mc-end" className="mc-form-error" role="alert">
                  {errors.end_time}
                </span>
              )}
            </div>
          </div>

          {/* Địa điểm hoặc Link họp trực tuyến */}
          <div className="mc-form-group">
            <label htmlFor="mc-meeting-link">
              Địa điểm hoặc Link họp online
            </label>
            <input
              id="mc-meeting-link"
              name="meeting_link"
              type="text"
              placeholder="VD: Phòng 302 - Nhà C1 hoặc https://meet.google.com/abc-xyz"
              value={form.meeting_link}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="off"
            />
            <span className="mc-form-hint">
              Nhập phòng họp trực tiếp hoặc đường dẫn Google Meet / Zoom nếu họp trực tuyến.
            </span>
          </div>

          {/* Danh sách người tham gia * */}
          <div className={`mc-form-group${errors.intern_ids ? ' mc-form-group--error' : ''}`}>
            <div className="mc-attendee-head">
              <label htmlFor="mc-attendees-wrap">
                Người tham gia (Thực tập sinh) <span className="mc-required">*</span>
              </label>
              {interns.length > 0 && (
                <button
                  type="button"
                  className="mc-btn-select-all"
                  onClick={handleSelectAllInterns}
                  disabled={submitting}
                >
                  {form.intern_ids.length === interns.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              )}
            </div>

            <div id="mc-attendees-wrap" className="mc-attendees-box">
              {loadingInterns ? (
                <div className="mc-attendees-loading">Đang tải danh sách người tham gia…</div>
              ) : interns.length === 0 ? (
                <div className="mc-attendees-empty">Không có thực tập sinh nào khả dụng.</div>
              ) : (
                <ul className="mc-attendees-list">
                  {interns.map((intern) => {
                    const isChecked = form.intern_ids.includes(intern.id)
                    return (
                      <li key={intern.id} className="mc-attendee-item">
                        <label className="mc-attendee-check" htmlFor={`intern-chk-${intern.id}`}>
                          <input
                            type="checkbox"
                            id={`intern-chk-${intern.id}`}
                            checked={isChecked}
                            onChange={() => handleInternToggle(intern.id)}
                            disabled={submitting}
                          />
                          <div className="mc-attendee-info">
                            <span className="mc-attendee-name">
                              {intern.intern_name}
                              {intern.intern_code && (
                                <span className="mc-attendee-code">({intern.intern_code})</span>
                              )}
                            </span>
                            {intern.intern_email && (
                              <span className="mc-attendee-email">{intern.intern_email}</span>
                            )}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="mc-attendees-summary">
              Đã chọn <strong>{form.intern_ids.length}</strong> người tham gia.
            </div>

            {errors.intern_ids && (
              <span id="err-mc-interns" className="mc-form-error" role="alert">
                {errors.intern_ids}
              </span>
            )}
          </div>

          {/* Mô tả / Ghi chú */}
          <div className="mc-form-group">
            <label htmlFor="mc-description">Nội dung / Mô tả cuộc họp</label>
            <textarea
              id="mc-description"
              name="description"
              rows={3}
              placeholder="Ghi chú nội dung trao đổi, tài liệu cần chuẩn bị trước buổi họp (tùy chọn)"
              value={form.description}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* ══════════════════════════════════════════════════════════
              BƯỚC 3: CHECKBOX BẮT BUỘC CỦA TASK
              "Gửi email thông báo tự động cho người tham gia"
              ══════════════════════════════════════════════════════════ */}
          <div className="mc-checkbox-group">
            <label
              className={`mc-checkbox-card${form.send_email_notification ? ' is-checked' : ''}`}
              htmlFor="mc-send-email-notification"
            >
              <div className="mc-checkbox-input-wrap">
                <input
                  type="checkbox"
                  id="mc-send-email-notification"
                  name="send_email_notification"
                  checked={form.send_email_notification}
                  onChange={handleCheckboxChange}
                  disabled={submitting}
                />
              </div>
              <div className="mc-checkbox-content">
                <span className="mc-checkbox-title">
                  Gửi email thông báo tự động cho người tham gia
                </span>
                <span className="mc-checkbox-desc">
                  Khi bật, hệ thống sẽ gửi email thông báo lịch họp đến người tham gia.
                </span>
              </div>
            </label>
          </div>
        </form>

        {/* ── Modal Footer ── */}
        <div className="mc-modal-footer">
          <button
            id="mc-modal-cancel-btn"
            type="button"
            className="mc-btn mc-btn--cancel"
            onClick={handleClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            id="mc-modal-submit-btn"
            type="submit"
            form="mc-meeting-form"
            className="mc-btn mc-btn--submit"
            disabled={submitting}
          >
            {submitting ? 'Đang tạo…' : 'Lưu lịch họp'}
          </button>
        </div>
      </div>
    </div>
  )
}
