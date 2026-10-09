import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Eye,
  RotateCcw,
  Send,
  Loader2,
  Calendar,
  User,
  Check,
} from 'lucide-react'
import { fetchSupportTickets, respondSupportTicket } from '../../api/operations'
import { emitRealtimeEvent, subscribeRealtimeEvents, SYNC_EVENTS } from '../../utils/realtimeSync'
import { getSavedAvatar } from '../../utils/avatarHelper'
import './SupportTicketManager.css'

// Dữ liệu mẫu khởi tạo phong phú
export const MOCK_SUPPORT_TICKETS = [
  {
    id: 'TK-101',
    title: 'Xin cấp Giấy chứng nhận hoàn thành thực tập để nộp trường ICTU',
    sender: 'Nguyễn Văn An (TTS0001)',
    senderEmail: 'an.nv@ictu.edu.vn',
    createdAt: '2026-10-07 09:30',
    status: 'Pending',
    content:
      'Em đã hoàn thành đủ số giờ thực tập và vượt qua bài bảo vệ đề tài. Em xin HR hỗ trợ cấp Giấy chứng nhận có dấu công ty để nộp về Khoa Công nghệ thông tin trước hạn 15/10/2026.',
    response: '',
  },
  {
    id: 'TK-102',
    title: 'Cấp lại thẻ từ ra vào tòa nhà và tài khoản VPN làm việc từ xa',
    sender: 'Trần Thị Bình (TTS0002)',
    senderEmail: 'binh.tt@ictu.edu.vn',
    createdAt: '2026-10-07 14:15',
    status: 'Pending',
    content:
      'Em vô tình làm rơi mất thẻ từ ra vào sảnh tầng 3 của công ty và tài khoản VPN bị tạm khóa do nhập sai mật khẩu. Kính nhờ HR hỗ trợ cấp lại thẻ từ và mở khóa tài khoản VPN.',
    response: '',
  },
  {
    id: 'TK-103',
    title: 'Thắc mắc đối soát mức trợ cấp thực tập tháng 09/2026',
    sender: 'Lê Hoàng Nam (TTS0003)',
    senderEmail: 'nam.lh@ictu.edu.vn',
    createdAt: '2026-10-06 10:00',
    status: 'Approved',
    content:
      'Em xin đối soát lại bảng công chuyên cần tháng 9 do trong bảng thông báo phụ cấp bị thiếu 2 ngày công thực tế tại văn phòng.',
    response:
      'HR đã đối soát lại bảng chấm công 22 ngày và đã lập phiếu chi bổ sung số tiền còn thiếu vào tài khoản của em trong kỳ thanh toán gần nhất.',
  },
  {
    id: 'TK-104',
    title: 'Đề xuất đổi ca thực tập cố định từ Buổi sáng sang Buổi chiều',
    sender: 'Phạm Minh Đức (TTS0004)',
    senderEmail: 'duc.pm@ictu.edu.vn',
    createdAt: '2026-10-05 16:45',
    status: 'Rejected',
    content:
      'Do nhà trường thay đổi thời khóa biểu học phần kỳ 1 năm cuối, em xin phép HR cho em chuyển toàn bộ lịch thực tập từ ca sáng sang ca chiều từ thứ 2 đến thứ 6.',
    response:
      'Ca chiều hiện tại nhóm dự án Web đã đủ số lượng chỗ ngồi và Mentor phụ trách không bố trí được thời gian kèm. Em vui lòng liên hệ trực tiếp với Mentor để thỏa thuận ca làm việc linh hoạt.',
  },
]

// Hàm chuẩn hóa dữ liệu từ Backend hoặc localStorage
const normalizeTicket = (item, index = 0) => {
  const rawStatus = item.status || item.rawStatus || 'Pending'
  let normalizedStatus = 'Pending'
  if (rawStatus === 'completed' || rawStatus === 'Approved' || rawStatus === 'Đã duyệt') {
    normalizedStatus = 'Approved'
  } else if (rawStatus === 'rejected' || rawStatus === 'Rejected' || rawStatus === 'Từ chối') {
    normalizedStatus = 'Rejected'
  }

  const senderName = item.sender || item.senderName || item.sender_name || `TTS (${item.senderId || 'TTS000' + (index + 1)})`

  return {
    id: String(item.id || item.ticket_code || `TK-${100 + index}`),
    title: item.title || item.categoryLabel || 'Yêu cầu hỗ trợ thực tập sinh',
    sender: senderName,
    senderEmail: item.senderEmail || item.sender_email || '',
    createdAt: item.createdAt || item.created_at || '2026-10-07 09:00',
    status: normalizedStatus,
    content: item.content || item.description || 'Không có mô tả chi tiết.',
    response: item.response || item.responseNote || item.response_note || item.responseContent || '',
  }
}

/**
 * Component Modal Xử lý Ticket (Khi bấm Xem chi tiết)
 */
export function TicketProcessModal({
  ticket,
  isOpen,
  onClose,
  onSubmitAction,
  isSubmitting,
}) {
  const [responseInput, setResponseInput] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen && ticket) {
      setResponseInput(ticket.response || '')
      setErrorMessage('')
    }
  }, [isOpen, ticket])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !ticket) return null

  const isPending = ticket.status === 'Pending'
  const isApproved = ticket.status === 'Approved'
  const isRejected = ticket.status === 'Rejected'

  // Xử lý khi nhấn nút "Từ chối" (Bắt buộc phải nhập phản hồi)
  const handleReject = () => {
    const trimmed = responseInput.trim()
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập nội dung phản hồi / lý do trước khi từ chối yêu cầu.')
      return
    }
    setErrorMessage('')
    onSubmitAction(ticket.id, 'Rejected', trimmed)
  }

  // Xử lý khi nhấn nút "Duyệt yêu cầu"
  const handleApprove = () => {
    const trimmed = responseInput.trim()
    setErrorMessage('')
    onSubmitAction(
      ticket.id,
      'Approved',
      trimmed || 'Yêu cầu hỗ trợ đã được HR phê duyệt và tiếp nhận giải quyết.',
    )
  }

  return (
    <div
      className="stm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stm-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose?.()
        }
      }}
    >
      <div className="stm-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="stm-modal-header">
          <div className="stm-modal-title-group">
            <span className="stm-modal-badge-id">{ticket.id}</span>
            <h2 id="stm-modal-title" className="stm-modal-heading">
              Chi tiết yêu cầu hỗ trợ
            </h2>
          </div>
          <button
            type="button"
            className="stm-modal-close-button"
            onClick={onClose}
            aria-label="Đóng modal"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="stm-modal-body">
          {/* Thông tin Meta: Tiêu đề, Người gửi, Ngày gửi, Trạng thái */}
          <div className="stm-detail-meta-box">
            <div className="stm-detail-field">
              <span className="stm-field-label">Tiêu đề:</span>
              <strong className="stm-field-value stm-field-title">{ticket.title}</strong>
            </div>

            <div className="stm-meta-grid-2">
              <div className="stm-detail-field">
                <span className="stm-field-label">Người gửi:</span>
                <div className="stm-field-sender">
                  <span className="stm-sender-avatar-small">
                    {(ticket.sender || 'T').charAt(0).toUpperCase()}
                  </span>
                  <span className="stm-field-value">{ticket.sender}</span>
                </div>
              </div>

              <div className="stm-detail-field">
                <span className="stm-field-label">Ngày gửi:</span>
                <span className="stm-field-value stm-field-date">
                  <Calendar size={14} />
                  {ticket.createdAt}
                </span>
              </div>
            </div>

            <div className="stm-detail-field">
              <span className="stm-field-label">Trạng thái hiện tại:</span>
              <div>
                {isPending && (
                  <span className="stm-badge stm-badge--pending">
                    <Clock size={13} />
                    Chờ xử lý
                  </span>
                )}
                {isApproved && (
                  <span className="stm-badge stm-badge--approved">
                    <CheckCircle size={13} />
                    Đã duyệt
                  </span>
                )}
                {isRejected && (
                  <span className="stm-badge stm-badge--rejected">
                    <XCircle size={13} />
                    Từ chối
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Banner thông báo nếu yêu cầu đã được xử lý */}
          {!isPending && (
            <div
              className={`stm-notice-banner ${
                isApproved ? 'stm-notice--approved' : 'stm-notice--rejected'
              }`}
            >
              {isApproved ? <CheckCircle size={16} /> : <XCircle size={16} />}
              <span>
                Yêu cầu này đã được <strong>{isApproved ? 'phê duyệt' : 'từ chối'}</strong>.
                Không thể thao tác thay đổi lại trạng thái.
              </span>
            </div>
          )}

          {/* Nội dung yêu cầu chi tiết từ TTS */}
          <div className="stm-request-content-box">
            <label className="stm-content-label">
              <MessageSquare size={16} />
              Nội dung yêu cầu từ TTS:
            </label>
            <div className="stm-content-text" data-testid="ticket-description-content">
              {ticket.content}
            </div>
          </div>

          {/* Ô Textarea phản hồi của HR */}
          <div className="stm-response-form-group">
            <label htmlFor="hr-response-textarea" className="stm-response-label">
              Nội dung phản hồi của HR:
              {isPending && (
                <span className="stm-required-hint"> (Bắt buộc nhập nếu Từ chối)</span>
              )}
            </label>
            <textarea
              id="hr-response-textarea"
              aria-label="Nội dung phản hồi của HR"
              rows={4}
              placeholder={
                isPending
                  ? 'Nhập nội dung phản hồi gửi đến thực tập sinh (Bắt buộc khi từ chối)...'
                  : 'Nội dung phản hồi đã ghi nhận.'
              }
              value={responseInput}
              onChange={(e) => {
                if (!isPending) return
                setResponseInput(e.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              disabled={isSubmitting || !isPending}
              readOnly={!isPending}
              className={`stm-textarea ${errorMessage ? 'has-error' : ''} ${
                !isPending ? 'is-readonly' : ''
              }`}
            />
            {errorMessage && (
              <div role="alert" className="stm-error-message" data-testid="reject-error-msg">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal với 2 nút Duyệt yêu cầu (Màu xanh) và Từ chối (Màu đỏ) */}
        <div className="stm-modal-footer">
          <button
            type="button"
            className="stm-btn stm-btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </button>

          {isPending ? (
            <div className="stm-action-buttons">
              {/* Nút Từ chối (Màu đỏ) */}
              <button
                type="button"
                className="stm-btn stm-btn--reject"
                onClick={handleReject}
                disabled={isSubmitting}
                data-testid="stm-modal-reject-btn"
              >
                {isSubmitting ? <Loader2 size={15} className="stm-spinner" /> : <XCircle size={15} />}
                <span>Từ chối</span>
              </button>

              {/* Nút Duyệt yêu cầu (Màu xanh) */}
              <button
                type="button"
                className="stm-btn stm-btn--approve"
                onClick={handleApprove}
                disabled={isSubmitting}
                data-testid="stm-modal-approve-btn"
              >
                {isSubmitting ? <Loader2 size={15} className="stm-spinner" /> : <Check size={15} />}
                <span>Duyệt yêu cầu</span>
              </button>
            </div>
          ) : (
            <span className="stm-processed-tag">Yêu cầu đã hoàn tất xử lý</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Trang SupportTicketManager dành cho HR
 */
export default function SupportTicketManager({ fetchTicketsApi, respondTicketApi }) {
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState('All') // 'All' | 'Pending' | 'Approved' | 'Rejected'
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Hiển thị toast thông báo
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])

  // Tải danh sách tickets
  const loadTickets = useCallback(async () => {
    setIsLoading(true)

    // 1. Nếu có props mock API truyền vào (dành cho Unit Test)
    if (typeof fetchTicketsApi === 'function') {
      try {
        const data = await fetchTicketsApi()
        const normalized = (Array.isArray(data) ? data : []).map(normalizeTicket)
        setTickets(normalized)
      } catch (err) {
        showToast('Không thể tải danh sách yêu cầu hỗ trợ.', 'danger')
      } finally {
        setIsLoading(false)
      }
      return
    }

    // 2. Thử gọi API Backend thực tế
    try {
      const data = await fetchSupportTickets()
      if (Array.isArray(data) && data.length > 0) {
        const normalized = data.map(normalizeTicket)
        setTickets(normalized)
        setIsLoading(false)
        return
      }
    } catch (e) {
      // Backend offline hoặc chưa có dữ liệu -> chuyển sang bước fallback
    }

    // 3. Fallback đọc từ LocalStorage
    try {
      const localData = localStorage.getItem('ictu_intern_tickets_data')
      if (localData) {
        const parsed = JSON.parse(localData)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTickets(parsed.map(normalizeTicket))
          setIsLoading(false)
          return
        }
      }
    } catch (e) {
      // Bỏ qua lỗi parse
    }

    // 4. Fallback dữ liệu mẫu MOCK_SUPPORT_TICKETS
    setTickets(MOCK_SUPPORT_TICKETS.map(normalizeTicket))
    setIsLoading(false)
  }, [fetchTicketsApi, showToast])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Lắng nghe sự kiện đồng bộ đa cổng Realtime (TTS gửi ticket mới hoặc phản hồi)
  useEffect(() => {
    const handleSync = (event) => {
      if (event?.payload?.source === 'hr_support_ticket_manager') return
      if (
        event?.type === SYNC_EVENTS.SUPPORT_TICKET_CREATED ||
        event?.type === SYNC_EVENTS.SUPPORT_TICKET_RESPONDED
      ) {
        loadTickets()
      }
    }

    const unsubscribe = subscribeRealtimeEvents(handleSync)
    const handleStorageChange = (e) => {
      if (e.key === 'ictu_intern_tickets_data') {
        loadTickets()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
    }

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [loadTickets])

  // Lọc tickets theo Tabs lọc trạng thái
  const filteredTickets = useMemo(() => {
    if (activeTab === 'All') return tickets
    return tickets.filter((t) => t.status === activeTab)
  }, [tickets, activeTab])

  // Tính số lượng tickets cho từng tab
  const tabCounts = useMemo(() => {
    return {
      All: tickets.length,
      Pending: tickets.filter((t) => t.status === 'Pending').length,
      Approved: tickets.filter((t) => t.status === 'Approved').length,
      Rejected: tickets.filter((t) => t.status === 'Rejected').length,
    }
  }, [tickets])

  // Mở modal xem chi tiết
  const handleOpenDetail = (ticket) => {
    setSelectedTicket(ticket)
    setIsModalOpen(true)
  }

  // Đóng modal
  const handleCloseModal = () => {
    if (isSubmitting) return
    setIsModalOpen(false)
    setSelectedTicket(null)
  }

  // Xử lý logic khi HR Duyệt hoặc Từ chối từ Modal
  const handleSubmitProcess = async (ticketId, status, response) => {
    setIsSubmitting(true)

    try {
      // 1. Gọi API đổi trạng thái
      if (typeof respondTicketApi === 'function') {
        await respondTicketApi(ticketId, { status, response })
      } else {
        try {
          await respondSupportTicket(ticketId, { status, response })
        } catch (apiErr) {
          console.warn('Backend API respondSupportTicket failed, using optimistic UI:', apiErr)
        }
      }

      // 2. Cập nhật lại badge trạng thái của dòng đó trong Bảng dữ liệu (Direct State Update)
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: status,
                response: response,
              }
            : t,
        ),
      )

      // 3. Đồng bộ với LocalStorage để các phân hệ khác (TTS, Mentor) cập nhật ngay
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('ictu_intern_tickets_data')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) {
              const updated = parsed.map((item) => {
                if (String(item.id || item.ticket_code) === String(ticketId)) {
                  return {
                    ...item,
                    status: status === 'Approved' ? 'completed' : 'rejected',
                    statusLabel: status === 'Approved' ? 'Đã duyệt' : 'Đã từ chối',
                    responseNote: response,
                  }
                }
                return item
              })
              localStorage.setItem('ictu_intern_tickets_data', JSON.stringify(updated))
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi lưu LocalStorage:', err)
      }

      // 4. Phát sự kiện Realtime Sync
      emitRealtimeEvent(SYNC_EVENTS.SUPPORT_TICKET_RESPONDED, {
        ticketId,
        status,
        response,
        source: 'hr_support_ticket_manager',
      })

      // 5. Đóng Modal
      setIsModalOpen(false)
      setSelectedTicket(null)

      // 6. Hiển thị Toast báo thành công
      const actionName = status === 'Approved' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'
      showToast(`${actionName} "${ticketId}" thành công!`, 'success')
    } catch (error) {
      showToast(error?.message || 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại!', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stm-page-container" data-testid="support-ticket-manager-page">
      {/* Toast Notification */}
      {toast && (
        <div
          role={toast.type === 'danger' ? 'alert' : 'status'}
          aria-label={toast.type === 'danger' ? 'Thông báo lỗi' : 'Thông báo thành công'}
          className={`stm-toast-message stm-toast--${toast.type}`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={18} className="stm-toast-icon" />
          ) : (
            <AlertCircle size={18} className="stm-toast-icon" />
          )}
          <span className="stm-toast-text">{toast.message}</span>
        </div>
      )}

      {/* 1. Header Trang */}
      <header className="stm-page-header">
        <div className="stm-page-title-box">
          <div className="stm-title-icon-badge">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="stm-page-heading">Quản lý Yêu cầu Hỗ trợ (Support Tickets)</h1>
            <p className="stm-page-subheading">
              Tiếp nhận, kiểm tra và phê duyệt hoặc từ chối các yêu cầu, thắc mắc thủ tục từ thực tập sinh.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="stm-btn-refresh"
          onClick={loadTickets}
          disabled={isLoading}
          title="Tải lại danh sách"
          aria-label="Làm mới danh sách"
        >
          <RotateCcw size={15} className={isLoading ? 'stm-spinner' : ''} />
          <span>Làm mới</span>
        </button>
      </header>

      {/* 2. Tabs Lọc Trạng Thái (Tất cả, Chờ xử lý, Đã duyệt, Từ chối) */}
      <div className="stm-filter-tabs-bar" role="tablist" aria-label="Bộ lọc trạng thái yêu cầu hỗ trợ">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'All'}
          className={`stm-tab-item ${activeTab === 'All' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('All')}
        >
          <span>Tất cả</span>
          <span className="stm-tab-counter">{tabCounts.All}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'Pending'}
          className={`stm-tab-item ${activeTab === 'Pending' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('Pending')}
        >
          <span>Chờ xử lý</span>
          <span className="stm-tab-counter stm-counter--pending">{tabCounts.Pending}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'Approved'}
          className={`stm-tab-item ${activeTab === 'Approved' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('Approved')}
        >
          <span>Đã duyệt</span>
          <span className="stm-tab-counter stm-counter--approved">{tabCounts.Approved}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'Rejected'}
          className={`stm-tab-item ${activeTab === 'Rejected' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('Rejected')}
        >
          <span>Từ chối</span>
          <span className="stm-tab-counter stm-counter--rejected">{tabCounts.Rejected}</span>
        </button>
      </div>

      {/* 3. Bảng danh sách các yêu cầu hỗ trợ từ TTS */}
      <div className="stm-table-card">
        <div className="stm-table-responsive">
          <table className="stm-data-table" aria-label="Bảng danh sách yêu cầu hỗ trợ">
            <thead>
              <tr>
                <th scope="col" className="stm-col-title">
                  Tiêu đề
                </th>
                <th scope="col" className="stm-col-sender">
                  Người gửi
                </th>
                <th scope="col" className="stm-col-date">
                  Ngày gửi
                </th>
                <th scope="col" className="stm-col-status" style={{ textAlign: 'center' }}>
                  Trạng thái
                </th>
                <th scope="col" className="stm-col-action" style={{ textAlign: 'center' }}>
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="stm-no-data-cell">
                    <div className="stm-empty-state">
                      <MessageSquare size={32} className="stm-empty-icon" />
                      <p>Không có yêu cầu hỗ trợ nào trong danh mục này.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    data-testid={`stm-row-${ticket.id}`}
                    aria-label={`Yêu cầu ${ticket.id} - ${ticket.title}`}
                    className={`stm-table-row ${ticket.status === 'Rejected' ? 'stm-row--is-rejected' : ''}`}
                  >
                    {/* Cột 1: Tiêu đề */}
                    <td className="stm-cell-title-content">
                      <div className="stm-title-wrapper">
                        <span className="stm-row-id-tag">{ticket.id}</span>
                        <strong className="stm-title-heading" title={ticket.title}>
                          {ticket.title}
                        </strong>
                      </div>
                    </td>

                    {/* Cột 2: Người gửi */}
                    <td className="stm-cell-sender-content">
                      <div className="stm-sender-info-box">
                        <span className="stm-sender-avatar-icon">
                          {(ticket.sender || 'T').charAt(0).toUpperCase()}
                        </span>
                        <span className="stm-sender-name-text" title={ticket.sender}>
                          {ticket.sender}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Ngày gửi */}
                    <td className="stm-cell-date-content">
                      <span className="stm-date-badge">
                        <Calendar size={13} />
                        {ticket.createdAt}
                      </span>
                    </td>

                    {/* Cột 4: Trạng thái (Badge trực quan) */}
                    <td className="stm-cell-status-content" style={{ textAlign: 'center' }}>
                      {ticket.status === 'Pending' && (
                        <span
                          className="stm-badge stm-badge--pending"
                          aria-label="Trạng thái Chờ xử lý"
                          data-testid={`badge-pending-${ticket.id}`}
                        >
                          <Clock size={12} />
                          Chờ xử lý
                        </span>
                      )}
                      {ticket.status === 'Approved' && (
                        <span
                          className="stm-badge stm-badge--approved"
                          aria-label="Trạng thái Đã duyệt"
                          data-testid={`badge-approved-${ticket.id}`}
                        >
                          <CheckCircle size={12} />
                          Đã duyệt
                        </span>
                      )}
                      {ticket.status === 'Rejected' && (
                        <span
                          className="stm-badge stm-badge--rejected"
                          aria-label="Trạng thái Từ chối"
                          data-testid={`badge-rejected-${ticket.id}`}
                        >
                          <XCircle size={12} />
                          Từ chối
                        </span>
                      )}
                    </td>

                    {/* Cột 5: Hành động - Nút Xem chi tiết */}
                    <td className="stm-cell-action-content" style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="stm-btn-view-detail"
                        onClick={() => handleOpenDetail(ticket)}
                        aria-label={`Xem chi tiết ${ticket.id}`}
                        data-testid={`btn-view-detail-${ticket.id}`}
                      >
                        <Eye size={14} />
                        <span>Xem chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer bảng dữ liệu */}
        <div className="stm-table-footer-bar">
          <span className="stm-footer-count-text">
            Hiển thị <strong>{filteredTickets.length}</strong> trên tổng số <strong>{tickets.length}</strong> yêu cầu
          </span>
        </div>
      </div>

      {/* Modal Xử lý Ticket (Khi bấm Xem chi tiết) */}
      <TicketProcessModal
        ticket={selectedTicket}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmitAction={handleSubmitProcess}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

