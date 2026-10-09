import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Send,
  Loader2,
  Plus,
} from 'lucide-react'
import { emitRealtimeEvent, subscribeRealtimeEvents, SYNC_EVENTS } from '../../../utils/realtimeSync'
import { fetchSupportTickets, respondSupportTicket, createSupportTicket } from '../../../api/operations'
import { getSavedAvatar } from '../../../utils/avatarHelper'
import './SupportTicketManagement.css'

export function TicketDetailModal({ ticket, isOpen, onClose, onRespond, isSubmitting }) {
  const [responseContent, setResponseContent] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setResponseContent(ticket?.responseContent || '')
      setValidationError('')
    }
  }, [isOpen, ticket])

  if (!isOpen || !ticket) return null

  const isPending = ticket.status === 'Pending'
  const isApproved = ticket.status === 'Approved'
  const isRejected = ticket.status === 'Rejected'
  const isProcessed = !isPending

  const handleAction = async (status) => {
    // Không cho phép duyệt hoặc từ chối lại khi yêu cầu đã được xử lý
    if (isProcessed) return

    // Trim whitespace để kiểm tra nội dung
    const trimmed = responseContent.trim()

    // Nghiệp vụ: Bắt buộc nhập lý do nếu Từ chối
    if (status === 'Rejected' && !trimmed) {
      setValidationError('Vui lòng nhập lý do từ chối trước khi gửi.')
      return
    }

    setValidationError('')
    await onRespond(ticket.id, {
      status,
      response: trimmed,
    })
  }

  return (
    <div className="stm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-ticket-title">
      <div className="stm-modal-card">
        <header className="stm-modal-header">
          <div className="stm-modal-header-info">
            <span className="stm-modal-id">{ticket.id}</span>
            <h2 id="modal-ticket-title" className="stm-modal-title">
              {ticket.title}
            </h2>
          </div>
          <button
            type="button"
            className="stm-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </header>

        <div className="stm-modal-body">
          {/* Banner thông báo khi yêu cầu đã được xử lý xong */}
          {isProcessed && (
            <div
              className={`stm-processed-banner stm-processed-banner--${ticket.status?.toLowerCase()}`}
              role="status"
            >
              {isApproved ? (
                <>
                  <CheckCircle size={16} />
                  <span>
                    Yêu cầu này đã được <strong>phê duyệt</strong>. Không thể thao tác lại hoặc thay đổi trạng thái.
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  <span>
                    Yêu cầu này đã bị <strong>từ chối</strong>. Không thể thao tác lại hoặc thay đổi trạng thái.
                  </span>
                </>
              )}
            </div>
          )}

          <div className="stm-modal-meta-grid">
            <div>
              <span className="stm-meta-label">Người gửi:</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', verticalAlign: 'middle', marginTop: '2px' }}>
                <span className="stm-sender-avatar" aria-hidden="true" style={{ width: 22, height: 22, fontSize: '0.65rem' }}>
                  {(ticket.senderAvatar || getSavedAvatar(ticket.senderEmail, ticket.senderId, ticket.senderName)) ? (
                    <img
                      src={ticket.senderAvatar || getSavedAvatar(ticket.senderEmail, ticket.senderId, ticket.senderName)}
                      alt=""
                      className="stm-sender-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'
                      }}
                    />
                  ) : null}
                  <span style={{ display: (ticket.senderAvatar || getSavedAvatar(ticket.senderEmail, ticket.senderId, ticket.senderName)) ? 'none' : 'inline' }}>
                    {(ticket.senderName || 'T').charAt(0).toUpperCase()}
                  </span>
                </span>
                <strong className="stm-meta-val">{ticket.senderName}</strong>
              </div>
            </div>
            <div>
              <span className="stm-meta-label">Danh mục:</span>
              <span className="stm-meta-val">{ticket.category}</span>
            </div>
            <div>
              <span className="stm-meta-label">Thời gian tạo:</span>
              <span className="stm-meta-val">{ticket.createdAt}</span>
            </div>
            <div>
              <span className="stm-meta-label">Trạng thái:</span>
              <span className={`stm-status-badge stm-status--${ticket.status?.toLowerCase()}`}>
                {ticket.status}
              </span>
            </div>
          </div>

          <div className="stm-desc-box">
            <span className="stm-desc-label">Nội dung yêu cầu từ thực tập sinh:</span>
            <p className="stm-desc-text">{ticket.description}</p>
          </div>

          <div className="stm-form-group">
            <label htmlFor="ticket-response-input" className="stm-label">
              {isProcessed ? 'Nội dung phản hồi / Lý do giải quyết đã gửi:' : 'Nội dung phản hồi / Lý do giải quyết:'}
            </label>
            <textarea
              id="ticket-response-input"
              aria-label="Nội dung phản hồi"
              placeholder={isProcessed ? 'Chưa có nội dung phản hồi.' : 'Nhập nội dung phản hồi hoặc lý do giải quyết...'}
              value={responseContent}
              onChange={(e) => {
                if (isProcessed) return
                setResponseContent(e.target.value)
                if (validationError) setValidationError('')
              }}
              rows={4}
              className={`stm-textarea ${validationError ? 'is-invalid' : ''} ${isProcessed ? 'stm-textarea--readonly' : ''}`}
              disabled={isSubmitting || isProcessed}
              readOnly={isProcessed}
            />
            {validationError && (
              <div role="alert" className="stm-validation-error">
                <AlertCircle size={14} />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        </div>

        <footer className="stm-modal-footer">
          <button
            type="button"
            className="stm-btn stm-btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </button>
          {isPending && (
            <div className="stm-modal-action-btns">
              <button
                type="button"
                className="stm-btn stm-btn--reject"
                onClick={() => handleAction('Rejected')}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 size={14} className="stm-spin" />}
                <span>Từ chối</span>
              </button>
              <button
                type="button"
                className="stm-btn stm-btn--approve"
                onClick={() => handleAction('Approved')}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 size={14} className="stm-spin" />}
                <span>Duyệt</span>
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}

export function CreateTicketModal({ isOpen, onClose, onCreate, isSubmitting }) {
  const [title, setTitle] = useState('')
  const [senderName, setSenderName] = useState('TTS (TTS0001)')
  const [category, setCategory] = useState('Giấy chứng nhận thực tập')
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setSenderName('TTS (TTS0001)')
      setCategory('Giấy chứng nhận thực tập')
      setPriority('normal')
      setDescription('')
      setValidationError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setValidationError('Vui lòng nhập tiêu đề yêu cầu.')
      return
    }
    if (!description.trim()) {
      setValidationError('Vui lòng nhập mô tả chi tiết yêu cầu.')
      return
    }
    setValidationError('')
    onCreate({
      title: title.trim(),
      senderName: senderName.trim() || 'TTS (TTS0001)',
      category,
      categoryLabel: category,
      targetApprover: 'hr',
      priority,
      priorityLabel: priority === 'urgent' ? 'Rất khẩn cấp' : priority === 'high' ? 'Gấp' : 'Bình thường',
      description: description.trim(),
    })
  }

  return (
    <div className="stm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-create-title">
      <div className="stm-modal-card">
        <header className="stm-modal-header">
          <div className="stm-modal-header-info">
            <span className="stm-modal-id">TẠO MỚI</span>
            <h2 id="modal-create-title" className="stm-modal-title">
              Tạo Yêu Cầu Hỗ Trợ Gửi HR
            </h2>
          </div>
          <button
            type="button"
            className="stm-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="stm-modal-body">
            {validationError && (
              <div className="stm-error-banner" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', background: '#fef2f2', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid #fecaca' }}>
                <AlertCircle size={15} />
                <span>{validationError}</span>
              </div>
            )}

            <div className="stm-form-group">
              <label className="stm-label">
                Tiêu đề yêu cầu <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="stm-form-input"
                placeholder="VD: Xin cấp Giấy chứng nhận hoàn thành thực tập"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="stm-form-row">
              <div className="stm-form-group">
                <label className="stm-label">Người gửi yêu cầu</label>
                <input
                  type="text"
                  className="stm-form-input"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>

              <div className="stm-form-group">
                <label className="stm-label">Danh mục yêu cầu</label>
                <select
                  className="stm-form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Giấy chứng nhận thực tập">Giấy chứng nhận thực tập (Certificate)</option>
                  <option value="Cấp thẻ ra vào / VPN">Cấp thẻ ra vào / VPN / Email công ty</option>
                  <option value="Đơn xin nghỉ phép">Đơn xin nghỉ phép / Chuyển ca thực tập</option>
                  <option value="Giấy xác nhận thực tập">Giấy xác nhận đang thực tập tại DN</option>
                  <option value="Chế độ phụ cấp">Thắc mắc chế độ phụ cấp & thanh toán</option>
                  <option value="Thủ tục hành chính khác">Thủ tục hành chính khác</option>
                </select>
              </div>
            </div>

            <div className="stm-form-group">
              <label className="stm-label">Mức độ ưu tiên</label>
              <select
                className="stm-form-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="normal">Bình thường (1 - 2 ngày)</option>
                <option value="high">Gấp (Trong 24h)</option>
                <option value="urgent">Rất khẩn cấp (Cần xử lý trong ngày)</option>
              </select>
            </div>

            <div className="stm-form-group">
              <label className="stm-label">
                Mục đích & Nội dung chi tiết <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="stm-textarea"
                rows="4"
                placeholder="Nhập nội dung chi tiết yêu cầu hỗ trợ gửi tới Ban Nhân sự..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <footer className="stm-modal-footer">
            <button
              type="button"
              className="stm-btn stm-btn--cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="stm-btn stm-btn--approve"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 size={14} className="stm-spin" />}
              <span>Gửi yêu cầu tới HR</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

const FALLBACK_TICKETS = [
  {
    id: 'TK-2026-089',
    title: 'Xin cấp Giấy chứng nhận hoàn thành thực tập để nộp trường ICTU',
    senderName: 'TTS (TTS0001)',
    category: 'Giấy chứng nhận thực tập',
    status: 'Pending',
    createdAt: '2026-09-28 10:15',
    description: 'Em cần xin giấy chứng nhận hoàn thành thời gian thực tập tại Trung tâm Phần mềm ICTU để nộp về Khoa Công nghệ thông tin trước ngày 15/10/2026.',
    responseContent: '',
  },
  {
    id: 'TK-2026-090',
    title: 'Cấp lại thẻ từ ra vào tòa nhà văn phòng và tài khoản VPN',
    senderName: 'TTS (TTS0001)',
    category: 'Cơ sở vật chất & Thẻ ra vào',
    status: 'Pending',
    createdAt: '2026-10-06 08:30',
    description: 'Em bị rơi mất thẻ từ ra vào văn phòng, xin HR cấp lại thẻ mới.',
    responseContent: '',
  },
  {
    id: 'TK-2026-075',
    title: 'Thắc mắc về mức trợ cấp thực tập tháng 09/2026',
    senderName: 'TTS (TTS0001)',
    category: 'Chế độ phụ cấp',
    status: 'Approved',
    createdAt: '2026-10-01 14:00',
    description: 'Em xin kiểm tra lại phụ cấp chuyên cần tháng 9.',
    responseContent: 'HR đã đối soát bảng công 22 ngày và chuyển khoản bổ sung.',
  },
]

export default function SupportTicketManagement({ fetchTicketsApi, respondTicketApi }) {
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState('Pending') // 'Pending' | 'Approved' | 'Rejected' | 'All'
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadTickets = useCallback(async () => {
    if (typeof fetchTicketsApi === 'function') {
      try {
        const data = await fetchTicketsApi()
        const mapped = (Array.isArray(data) ? data : []).map((item) => ({
          ...item,
          senderAvatar: item.senderAvatar || item.avatar || getSavedAvatar(item.senderEmail, item.senderId, item.senderName),
        }))
        setTickets(mapped)
      } catch {
        showToast('Không thể tải danh sách ticket hỗ trợ.', 'danger')
      }
      return
    }

    // 1. Thử tải từ BE API trước
    try {
      const data = await fetchSupportTickets()
      if (Array.isArray(data) && data.length > 0) {
        const cleanSender = (name) => {
          if (!name || name === 'Thực tập sinh' || name.includes('Nguyễn Văn An') || name.includes('HR') || name.includes('Hr')) {
            return 'TTS (TTS0001)'
          }
          return name
        }
        const mapped = data.map((item) => {
          const sName = cleanSender(item.senderName || item.sender_name)
          const sEmail = item.senderEmail || item.sender_email
          const sId = item.senderId || item.sender_id || item.user_id
          const sAvatar = item.senderAvatar || item.avatar || getSavedAvatar(sEmail, sId, sName)
          return {
            id: item.id || item.ticket_code || `TK-${Date.now()}`,
            title: item.title || item.categoryLabel || 'Yêu cầu hỗ trợ',
            senderName: sName,
            senderEmail: sEmail,
            senderId: sId,
            senderAvatar: sAvatar,
            category: item.categoryLabel || item.category || 'Thủ tục hành chính',
            status: item.status === 'completed' || item.status === 'Approved' ? 'Approved' : item.status === 'rejected' || item.status === 'Rejected' ? 'Rejected' : 'Pending',
            createdAt: item.createdAt || item.created_at || '2026-10-06 09:00',
            description: item.description || '',
            responseContent: item.responseNote || item.responseContent || '',
          }
        })
        setTickets(mapped)
        return
      }
    } catch (e) {}

    // 2. Fallback cho live UI: đọc từ localStorage hoặc danh sách mẫu
    try {
      const stored = localStorage.getItem('ictu_intern_tickets_data')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanSender = (name) => {
            if (!name || name === 'Thực tập sinh' || name.includes('Nguyễn Văn An') || name.includes('HR') || name.includes('Hr')) {
              return 'TTS (TTS0001)'
            }
            return name
          }

          const mapped = parsed.map((item) => {
            const sName = cleanSender(item.senderName)
            const sEmail = item.senderEmail
            const sId = item.senderId || item.userId
            const sAvatar = item.senderAvatar || item.avatar || getSavedAvatar(sEmail, sId, sName)
            return {
              id: item.id || `TK-${Date.now()}`,
              title: item.title || item.categoryLabel || 'Yêu cầu hỗ trợ',
              senderName: sName,
              senderEmail: sEmail,
              senderId: sId,
              senderAvatar: sAvatar,
              category: item.categoryLabel || 'Thủ tục hành chính',
              status: item.status === 'completed' || item.status === 'Approved' ? 'Approved' : item.status === 'rejected' || item.status === 'Rejected' ? 'Rejected' : 'Pending',
              createdAt: item.createdAt || '2026-10-06 09:00',
              description: item.description || '',
              responseContent: item.responseNote || '',
            }
          })
          setTickets(mapped)

          // Làm sạch lại localStorage để loại bỏ hoàn toàn tên cũ
          try {
            const cleanedStorage = parsed.map((item) => ({
              ...item,
              senderName: cleanSender(item.senderName),
            }))
            localStorage.setItem('ictu_intern_tickets_data', JSON.stringify(cleanedStorage))
          } catch {}
          return
        }
      }
    } catch {
      // fallback to mock
    }
    setTickets(FALLBACK_TICKETS.map((item) => ({
      ...item,
      senderAvatar: item.senderAvatar || getSavedAvatar(item.senderEmail, item.senderId, item.senderName),
    })))
  }, [fetchTicketsApi])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Lắng nghe sự kiện đồng bộ thời gian thực từ Cổng Thực tập sinh (TTS)
  useEffect(() => {
    const handleSync = (event) => {
      // Tránh re-fetch ghi đè optimistic update khi chính component này phát sự kiện
      if (event?.payload?.source === 'hr_ticket_management') return

      if (
        event?.type === SYNC_EVENTS.SUPPORT_TICKET_CREATED ||
        event?.type === SYNC_EVENTS.SUPPORT_TICKET_RESPONDED
      ) {
        loadTickets()
      }
    }

    const unsubscribe = subscribeRealtimeEvents(handleSync)
    const handleStorage = (e) => {
      if (e.key === 'ictu_intern_tickets_data') {
        loadTickets()
      }
    }
    const handleAvatarChange = () => {
      loadTickets()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
      window.addEventListener('ictu_avatar_changed', handleAvatarChange)
    }

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener('ictu_avatar_changed', handleAvatarChange)
      }
    }
  }, [loadTickets])

  const filteredTickets = useMemo(() => {
    if (activeTab === 'All') return tickets
    return tickets.filter((t) => t.status === activeTab)
  }, [tickets, activeTab])

  const handleOpenDetail = (ticket) => {
    setSelectedTicket(ticket)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isSubmitting) return
    setIsModalOpen(false)
    setSelectedTicket(null)
  }

  const handleRespondSubmit = async (ticketId, payload) => {
    // Bảo vệ: Nếu ticket đã được duyệt hoặc từ chối, không cho phép thao tác lại
    const targetTicket = tickets.find((t) => t.id === ticketId)
    if (targetTicket && targetTicket.status !== 'Pending') {
      showToast('Yêu cầu này đã được xử lý xong, không thể thao tác lại!', 'danger')
      return
    }

    setIsSubmitting(true)
    try {
      if (typeof respondTicketApi === 'function') {
        await respondTicketApi(ticketId, payload)
      } else {
        // Fallback live UI: gọi API backend nếu có
        try {
          await respondSupportTicket(ticketId, payload)
        } catch (err) {
          console.warn('Backend respond ticket failed, using optimistic state & fallback:', err)
        }
      }

      // Cập nhật state trực tiếp ngay lập tức (Instant UI State Update)
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status: payload.status, responseContent: payload.response }
            : t,
        ),
      )

      // Đồng bộ trực tiếp vào LocalStorage của TTS & Mentor
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('ictu_intern_tickets_data')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) {
              const nowTimeStr =
                new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
                ' ' +
                new Date().toLocaleDateString('vi-VN')
              const isApproved = payload.status === 'Approved'

              const updatedList = parsed.map((item) => {
                if (item.id === ticketId) {
                  return {
                    ...item,
                    status: isApproved ? 'completed' : 'rejected',
                    statusLabel: isApproved ? 'Đã hoàn thành' : 'Đã từ chối',
                    responseNote: payload.response,
                    currentStep: isApproved ? 4 : 3,
                    completedAt: nowTimeStr,
                  }
                }
                return item
              })
              localStorage.setItem('ictu_intern_tickets_data', JSON.stringify(updatedList))
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi lưu ticket vào localStorage:', err)
      }

      // Phát sự kiện Realtime Sync đa cổng (HR -> TTS -> Mentor)
      emitRealtimeEvent(SYNC_EVENTS.SUPPORT_TICKET_RESPONDED, {
        ticketId,
        status: payload.status,
        response: payload.response,
        source: 'hr_ticket_management',
      })

      setIsModalOpen(false)
      setSelectedTicket(null)
      showToast(`Cập nhật phản hồi ticket ${ticketId} thành công!`, 'success')
    } catch (err) {
      showToast(err?.message || 'Cập nhật thất bại. Vui lòng thử lại sau.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateTicketSubmit = async (newTicketData) => {
    setIsSubmitting(true)
    try {
      let createdTicket = null
      try {
        createdTicket = await createSupportTicket(newTicketData)
      } catch (err) {
        console.warn('Backend create ticket failed, using local fallback:', err)
      }

      const generatedId = createdTicket?.id || createdTicket?.ticket_code || `TK-${Date.now()}`
      const newTicket = {
        id: generatedId,
        title: newTicketData.title,
        senderName: newTicketData.senderName || 'TTS (TTS0001)',
        category: newTicketData.category,
        categoryLabel: newTicketData.categoryLabel || newTicketData.category,
        status: 'Pending',
        statusLabel: 'Chờ duyệt',
        createdAt:
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
          ' ' +
          new Date().toLocaleDateString('vi-VN'),
        description: newTicketData.description,
        responseContent: '',
      }

      setTickets((prev) => [newTicket, ...prev])

      // Đồng bộ vào LocalStorage
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('ictu_intern_tickets_data')
          const parsed = stored ? JSON.parse(stored) : []
          localStorage.setItem('ictu_intern_tickets_data', JSON.stringify([newTicket, ...parsed]))
        }
      } catch (err) {
        console.warn('Lỗi lưu ticket vào localStorage:', err)
      }

      // Phát Realtime Event
      emitRealtimeEvent(SYNC_EVENTS.SUPPORT_TICKET_CREATED, {
        ticket: newTicket,
        source: 'hr_ticket_management',
      })

      setIsCreateModalOpen(false)
      showToast('Tạo yêu cầu hỗ trợ mới thành công!', 'success')
    } catch (err) {
      showToast('Không thể tạo yêu cầu hỗ trợ. Vui lòng thử lại.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stm-container" data-testid="support-ticket-management">
      {/* Toast Notification */}
      {toast && (
        <div
          role={toast.type === 'danger' ? 'alert' : 'status'}
          aria-label={toast.type === 'danger' ? 'Thông báo lỗi' : 'Thông báo thành công'}
          className={`stm-toast stm-toast--${toast.type}`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <header className="stm-header">
        <div className="stm-title-wrap">
          <h1 className="stm-title">Quản lý Ticket & Yêu cầu Hỗ trợ</h1>
          <p className="stm-subtitle">
            Tiếp nhận, xử lý phê duyệt hoặc từ chối các yêu cầu giấy tờ, thủ tục hành chính từ TTS.
          </p>
        </div>

        <div className="stm-header-actions">
          <div className="stm-tabs" role="tablist" aria-label="Bộ lọc trạng thái ticket">
            {['Pending', 'Approved', 'Rejected', 'All'].map((tab) => {
              const count =
                tab === 'All'
                  ? tickets.length
                  : tickets.filter((t) => t.status === tab).length

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`stm-tab-btn ${activeTab === tab ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <span>{tab === 'Pending' ? 'Chờ xử lý' : tab === 'Approved' ? 'Đã duyệt' : tab === 'Rejected' ? 'Từ chối' : 'Tất cả'}</span>
                  <span className="stm-tab-count">({count})</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="stm-btn-create"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="stm-create-ticket-btn"
          >
            <Plus size={16} />
            <span>Tạo yêu cầu mới</span>
          </button>
        </div>
      </header>

      {/* Ticket Table */}
      <div className="stm-table-wrapper">
        <table className="stm-table" aria-label="Bảng danh sách ticket hỗ trợ">
          <thead>
            <tr>
              <th scope="col" className="stm-th-id">Mã Ticket</th>
              <th scope="col" className="stm-th-title">Tiêu đề yêu cầu</th>
              <th scope="col" className="stm-th-sender">Thực tập sinh</th>
              <th scope="col" className="stm-th-category">Danh mục</th>
              <th scope="col" className="stm-th-date">Ngày tạo</th>
              <th scope="col" className="stm-th-status" style={{ textAlign: 'center' }}>Trạng thái</th>
              <th scope="col" className="stm-th-action" style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr role="row">
                <td colSpan={7} className="stm-empty-cell">
                  Không có ticket nào trong danh mục này.
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  aria-label={`Dòng ticket ${ticket.id}`}
                  data-testid={`ticket-row-${ticket.id}`}
                  className={`stm-row ${ticket.status === 'Rejected' ? 'stm-row--rejected' : ''}`}
                >
                  <td className="stm-cell-id">
                    <span className="stm-id-pill">{ticket.id}</span>
                  </td>
                  <td className="stm-cell-title">
                    <div className="stm-title-wrap-cell">
                      <strong className="stm-title-text" title={ticket.title}>
                        {ticket.title}
                      </strong>
                    </div>
                  </td>
                  <td className="stm-cell-sender">
                    <div className="stm-sender-wrap">
                      <span className="stm-sender-avatar" aria-hidden="true">
                        {(ticket.senderAvatar || getSavedAvatar(ticket.senderEmail, ticket.senderId, ticket.senderName)) ? (
                          <img
                            src={ticket.senderAvatar || getSavedAvatar(ticket.senderEmail, ticket.senderId, ticket.senderName)}
                            alt=""
                            className="stm-sender-avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'
                            }}
                          />
                        ) : null}
                        <span style={{ display: (ticket.senderAvatar || getSavedAvatar(ticket.senderEmail, ticket.senderId, ticket.senderName)) ? 'none' : 'inline' }}>
                          {(ticket.senderName || 'T').charAt(0).toUpperCase()}
                        </span>
                      </span>
                      <span className="stm-sender-name" title={ticket.senderName}>
                        {ticket.senderName}
                      </span>
                    </div>
                  </td>
                  <td className="stm-cell-category">
                    <span className="stm-category-pill" title={ticket.category}>
                      {ticket.category}
                    </span>
                  </td>
                  <td className="stm-cell-date">
                    <span className="stm-date-text">{ticket.createdAt}</span>
                  </td>
                  <td className="stm-cell-status" style={{ textAlign: 'center' }}>
                    <span
                      aria-label={`Trạng thái ${ticket.status}`}
                      className={`stm-status-badge stm-status--${ticket.status?.toLowerCase()}`}
                    >
                      {ticket.status === 'Pending'
                        ? 'Chờ duyệt'
                        : ticket.status === 'Approved'
                        ? 'Đã duyệt'
                        : 'Từ chối'}
                    </span>
                  </td>
                  <td className="stm-cell-action" style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="stm-action-btn"
                      onClick={() => handleOpenDetail(ticket)}
                      aria-label={`Xem chi tiết ticket ${ticket.id}`}
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="stm-table-footer">
          <span className="stm-table-footer-info">
            Hiển thị <strong>{filteredTickets.length}</strong> / <strong>{tickets.length}</strong> ticket
          </span>
        </div>
      </div>

      {/* Modal chi tiết & phản hồi */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onRespond={handleRespondSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Modal tạo ticket mới */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        onCreate={handleCreateTicketSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
