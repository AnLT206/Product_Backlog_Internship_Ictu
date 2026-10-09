import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { emitRealtimeEvent, subscribeRealtimeEvents, SYNC_EVENTS } from '../../utils/realtimeSync'
import { fetchSupportTickets, createSupportTicket, deleteSupportTicket } from '../../api/operations'
import { getSavedAvatar } from '../../utils/avatarHelper'
import './InternDashboardPage.css'
import './InternSupportPage.css'

const STORAGE_KEY = 'ictu_intern_tickets_data'

const DOCUMENT_TYPES = [
  // Ban Nhân sự (HR)
  { id: 'leave_request', label: 'Đơn xin nghỉ phép / Chuyển ca thực tập', target: 'hr' },
  { id: 'cert_internship', label: 'Giấy chứng nhận hoàn thành thực tập (Certificate)', target: 'hr' },
  { id: 'cert_current', label: 'Giấy xác nhận đang thực tập tại DN (Nộp trường)', target: 'hr' },
  { id: 'card_account', label: 'Cấp lại thẻ ra vào / Tài khoản VPN / Email công ty', target: 'hr' },
  { id: 'allowance_support', label: 'Thắc mắc chế độ phụ cấp & thanh toán thực tập', target: 'hr' },
  { id: 'hr_other', label: 'Yêu cầu hành chính / Giấy tờ khác gửi HR', target: 'hr' },

  // Mentor hướng dẫn
  { id: 'stamp_report', label: 'Ký nhận xét & Đóng dấu Báo cáo thực tập tốt nghiệp', target: 'mentor' },
  { id: 'transcript_eval', label: 'Đánh giá năng lực & Điểm quá trình thực tập', target: 'mentor' },
  { id: 'project_support', label: 'Hỗ trợ kỹ thuật dự án & Đổi đề tài thực tập', target: 'mentor' },
  { id: 'mentor_other', label: 'Yêu cầu hỗ trợ chuyên môn khác gửi Mentor', target: 'mentor' },
]

const INITIAL_TICKETS = [
  {
    id: 'TK-2026-089',
    category: 'cert_internship',
    categoryLabel: 'Giấy chứng nhận hoàn thành thực tập',
    targetApprover: 'hr',
    senderName: 'TTS (TTS0001)',
    title: 'Xin cấp Giấy chứng nhận hoàn thành thực tập để nộp trường ICTU',
    priority: 'high',
    priorityLabel: 'Gấp',
    description:
      'Em cần xin giấy chứng nhận hoàn thành thời gian thực tập tại Trung tâm Phần mềm ICTU để nộp về Khoa Công nghệ thông tin trước ngày 15/10/2026 để làm hồ sơ xét điều kiện bảo vệ đồ án tốt nghiệp.',
    copies: 2,
    deliveryMethod: 'Cả bản cứng tại văn phòng Hr & Bản scan PDF qua email',
    status: 'in_progress', // 'pending' | 'in_progress' | 'completed' | 'rejected'
    statusLabel: 'Đang xử lý',
    createdAt: '2026-09-28 10:15',
    assignee: 'Hr',
    responseNote:
      'Hr đã tiếp nhận yêu cầu và đối soát dữ liệu chấm công. Đang soạn thảo văn bản và trình Trưởng ban ký duyệt. Dự kiến bàn giao bản cứng ngày 03/10/2026 tại tầng 3.',
    attachedFileName: 'Don_xin_xac_nhan_TTS.pdf',
    currentStep: 2,
  },
  {
    id: 'TK-2026-054',
    category: 'stamp_report',
    categoryLabel: 'Ký nhận xét & Đóng dấu Báo cáo tốt nghiệp',
    targetApprover: 'mentor',
    senderName: 'TTS (TTS0001)',
    title: 'Xin đóng dấu bìa và phiếu nhận xét Báo cáo thực tập tốt nghiệp K20',
    priority: 'urgent',
    priorityLabel: 'Rất khẩn cấp',
    description:
      'Báo cáo thực tập của em đã được hoàn thiện. Em gửi hồ sơ kính trình Mentor hướng dẫn xem xét ký duyệt nhận xét và chuyển đóng dấu.',
    copies: 1,
    deliveryMethod: 'Bản cứng nhận trực tiếp',
    status: 'completed',
    statusLabel: 'Đã hoàn thành',
    createdAt: '2026-09-20 14:00',
    completedAt: '2026-09-22 16:30',
    assignee: 'Mentor',
    responseNote:
      'Mentor đã kiểm tra báo cáo và ký xác nhận. Ban Đào tạo & Hr đã đóng dấu giáp lai đầy đủ. Bản cứng đã được giao nhận tại quầy Lễ tân ICTU.',
    attachedFileName: 'Bao_cao_thuc_tap_final_sign.pdf',
    currentStep: 4,
  },
  {
    id: 'TK-2026-031',
    category: 'project_support',
    categoryLabel: 'Hỗ trợ kỹ thuật dự án & Đổi đề tài thực tập',
    targetApprover: 'mentor',
    senderName: 'TTS (TTS0001)',
    title: 'Thảo luận giải pháp tích hợp Microservices cho phân hệ Quản lý hồ sơ',
    priority: 'normal',
    priorityLabel: 'Bình thường',
    description:
      'Em gặp vướng mắc về cấu hình RabbitMQ kết nối giữa Service Auth và Service Notification, xin Mentor sắp xếp buổi code review.',
    copies: 1,
    deliveryMethod: 'Bàn giao trực tiếp tại phòng làm việc',
    status: 'completed',
    statusLabel: 'Đã hoàn thành',
    createdAt: '2026-09-15 09:00',
    completedAt: '2026-09-15 11:30',
    assignee: 'Mentor',
    responseNote: 'Mentor đã hướng dẫn giải quyết config RabbitMQ và review PR branch feature/rabbitmq thành công.',
    attachedFileName: '',
    currentStep: 4,
  },
]

export default function InternSupportPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((item) => {
            let assignee = item.assignee || 'Hr'
            let targetApprover = item.targetApprover
            if (!targetApprover) {
              if (assignee.toLowerCase().includes('mentor')) {
                targetApprover = 'mentor'
                assignee = 'Mentor'
              } else if (assignee.toLowerCase().includes('admin') || assignee.toLowerCase().includes('it')) {
                targetApprover = 'hr'
                assignee = 'Admin'
              } else {
                targetApprover = 'hr'
                assignee = 'Hr'
              }
            }
            const cleanSender = (name) => {
              if (
                !name ||
                name === 'Thực tập sinh' ||
                name.includes('Nguyễn Văn An') ||
                name.includes('HR') ||
                name.includes('Hr')
              ) {
                return 'TTS (TTS0001)'
              }
              return name
            }
            const senderName = cleanSender(item.senderName)
            return { ...item, assignee, targetApprover, senderName }
          })
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
          } catch {}
          return cleaned
        }
      }
    } catch (e) {
      console.error(e)
    }
    return INITIAL_TICKETS
  })

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('all')
  const [approverFilter, setApproverFilter] = useState('all') // 'all' | 'hr' | 'mentor'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Modal create ticket state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Form states
  const [formRecipient, setFormRecipient] = useState('hr') // 'hr' | 'mentor'
  const [formCategory, setFormCategory] = useState('cert_internship')
  const [formPriority, setFormPriority] = useState('normal')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCopies, setFormCopies] = useState(1)
  const [formDelivery, setFormDelivery] = useState('both')
  const [formFile, setFormFile] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  // Persist tickets
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
    } catch (e) {
      console.error(e)
    }
  }, [tickets])

  // Lắng nghe sự kiện phản hồi từ Ban Nhân sự (HR) hoặc Mentor theo thời gian thực
  useEffect(() => {
    const handleSync = (event) => {
      if (
        event?.type === SYNC_EVENTS.SUPPORT_TICKET_RESPONDED ||
        event?.type === SYNC_EVENTS.SUPPORT_TICKET_CREATED
      ) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTickets(parsed)
              setSelectedTicket((prev) => {
                if (!prev) return null
                return parsed.find((p) => p.id === prev.id) || prev
              })
            }
          }
        } catch (e) {
          console.error('Lỗi đọc tickets từ storage:', e)
        }

        // Báo ngay lập tức cho TTS khi yêu cầu được duyệt hoặc bị từ chối
        if (event?.type === SYNC_EVENTS.SUPPORT_TICKET_RESPONDED) {
          if (event?.payload?.status === 'Rejected') {
            showToast(`⚠️ Yêu cầu ${event?.payload?.ticketId} của bạn đã bị từ chối: "${event?.payload?.response || 'Không có lý do chi tiết'}"`)
          } else if (event?.payload?.status === 'Approved') {
            showToast(`🎉 Yêu cầu ${event?.payload?.ticketId} của bạn đã được Ban Nhân sự (HR) phê duyệt thành công!`)
          }
        }
      }
    }

    const unsubscribe = subscribeRealtimeEvents(handleSync)
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) {
            setTickets(parsed)
            setSelectedTicket((prev) => {
              if (!prev) return null
              return parsed.find((p) => p.id === prev.id) || prev
            })
          }
        } catch {}
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
    }

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [])

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (approverFilter !== 'all') {
        const isMentor = t.targetApprover === 'mentor' || t.assignee?.toLowerCase().includes('mentor')
        if (approverFilter === 'mentor' && !isMentor) return false
        if (approverFilter === 'hr' && isMentor) return false
      }
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = t.id.toLowerCase().includes(q)
        const matchTitle = t.title.toLowerCase().includes(q)
        const matchDesc = t.description.toLowerCase().includes(q)
        const matchAssignee = t.assignee?.toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchDesc && !matchAssignee) return false
      }
      return true
    })
  }, [tickets, statusFilter, approverFilter, categoryFilter, searchQuery])

  // Stats summary
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      pending: tickets.filter((t) => t.status === 'pending').length,
      inProgress: tickets.filter((t) => t.status === 'in_progress').length,
      completed: tickets.filter((t) => t.status === 'completed').length,
      rejected: tickets.filter((t) => t.status === 'rejected').length,
    }
  }, [tickets])

  // Form validation
  const validateForm = () => {
    const errors = {}
    if (!formCategory) {
      errors.category = 'Vui lòng chọn loại giấy tờ / yêu cầu'
    }
    if (!formTitle.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề yêu cầu'
    }
    if (!formDescription.trim()) {
      errors.description = 'Vui lòng nhập mô tả chi tiết lý do và mục đích'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      showToast('⚠️ Vui lòng nhập đầy đủ tiêu đề và nội dung yêu cầu trước khi gửi.')
      return false
    }
    return true
  }

  // Submit new ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    const now = new Date()
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const catObj = DOCUMENT_TYPES.find((d) => d.id === formCategory)
    const priorityLabelMap = {
      normal: 'Bình thường',
      high: 'Gấp',
      urgent: 'Rất khẩn cấp',
    }
    const deliveryMap = {
      physical: 'Bản cứng nhận tại văn phòng',
      digital: 'File scan PDF có chữ ký số gửi qua Email',
      both: 'Cả bản cứng tại văn phòng & File scan PDF',
    }

    const isMentor = formRecipient === 'mentor'
    const randomNum = Math.floor(100 + Math.random() * 900)
    const newTicketId = `TK-2026-${randomNum}`

    const isActualIntern = user?.role === 'intern'
    const senderFullName = isActualIntern ? (user?.full_name || 'TTS') : 'TTS'
    const senderCode = isActualIntern ? (user?.code || 'TTS0001') : 'TTS0001'
    const senderEmail = user?.email || 'intern@ictu.edu.vn'
    const senderId = user?.id || 5
    const senderAvatar = user?.avatar || getSavedAvatar(senderEmail, senderId, senderFullName)

    const newTicket = {
      id: newTicketId,
      senderName: `${senderFullName} (${senderCode})`,
      senderEmail: senderEmail,
      senderId: senderId,
      senderAvatar: senderAvatar,
      category: formCategory,
      categoryLabel: catObj ? catObj.label : (isMentor ? 'Yêu cầu gửi Mentor' : 'Yêu cầu gửi HR'),
      targetApprover: formRecipient,
      title: formTitle.trim(),
      priority: formPriority,
      priorityLabel: priorityLabelMap[formPriority] || 'Bình thường',
      description: formDescription.trim(),
      copies: Number(formCopies),
      deliveryMethod: isMentor
        ? (formDelivery === 'digital' ? 'Phê duyệt & ký số trực tuyến' : 'Ký duyệt bản cứng & trao đổi trực tiếp')
        : (deliveryMap[formDelivery] || formDelivery),
      status: 'pending',
      statusLabel: isMentor ? 'Chờ Mentor duyệt' : 'Chờ HR duyệt',
      createdAt: formattedDate,
      assignee: isMentor ? 'Mentor' : 'Hr',
      responseNote: isMentor
        ? 'Yêu cầu đã được gửi lên hệ thống và chuyển tiếp tới Mentor hướng dẫn để xem xét và duyệt.'
        : 'Yêu cầu đã được gửi lên hệ thống và chuyển tiếp tới Ban Đào tạo & Nhân sự Hr.',
      attachedFileName: formFile ? formFile.name : '',
      currentStep: 1,
    }

    // 1. Gửi lên BE API
    try {
      await createSupportTicket(newTicket)
    } catch (err) {
      console.warn('Lỗi gọi API createSupportTicket (dùng local):', err)
    }

    // 2. Cập nhật state & localStorage
    const updatedTickets = [newTicket, ...tickets]
    setTickets(updatedTickets)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTickets))
    } catch (e) {}

    // 3. Phát sự kiện Realtime Sync cho HR và Mentor
    emitRealtimeEvent(SYNC_EVENTS.SUPPORT_TICKET_CREATED, { ticket: newTicket })

    // Đưa filter về 'all' để ticket mới hiển thị ngay lập tức
    setStatusFilter('all')

    setIsSubmitting(false)
    setIsCreateModalOpen(false)

    // Reset form
    setFormRecipient('hr')
    setFormCategory('cert_internship')
    setFormTitle('')
    setFormDescription('')
    setFormCopies(1)
    setFormDelivery('both')
    setFormFile(null)
    setFormErrors({})

    showToast(`🎉 Đã gửi yêu cầu ${newTicketId} thành công! Đã chuyển tiếp tới ${isMentor ? 'Mentor hướng dẫn' : 'Ban Nhân sự (HR)'} để xem xét duyệt.`)
  }

  // Delete/Cancel ticket when not yet approved
  const handleDeleteTicket = (id, e) => {
    if (e) e.stopPropagation()
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return

    const isApproved = ticket.status === 'completed' || ticket.currentStep >= 3
    if (isApproved) {
      showToast('Yêu cầu đã được phê duyệt hoàn tất, không thể xóa.', 'error')
      return
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa yêu cầu "${ticket.title}" (Mã: ${ticket.id}) không?`)) {
      try {
        deleteSupportTicket(id)
      } catch (err) {}
      setTickets((prev) => {
        const next = prev.filter((t) => t.id !== id)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // fallback
        }
        return next
      })
      emitRealtimeEvent(SYNC_EVENTS.SUPPORT_TICKET_CREATED, { ticketId: id, deleted: true })
      if (selectedTicket?.id === id) {
        setSelectedTicket(null)
      }
      showToast(`Đã xóa yêu cầu [${ticket.id}] thành công!`)
    }
  }

  return (
    <div className="intern-dashboard-page intern-support-page">
      {/* ── Toast notification ── */}
      {toastMessage && (
        <div className={`spt-toast ${toastMessage.includes('từ chối') || toastMessage.includes('⚠️') ? 'spt-toast--rejected' : ''}`}>
          {toastMessage.includes('từ chối') || toastMessage.includes('⚠️') ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="idp-page-header">
        <div className="idp-header-left">
          <h1 className="idp-header-title">Yêu Cầu Hỗ Trợ & Giấy Tờ (Tickets)</h1>
          <p className="idp-header-sub">
            Gửi yêu cầu cấp giấy chứng nhận thực tập, giấy xác nhận sinh viên, đóng dấu báo cáo tốt nghiệp hoặc hỗ trợ kỹ thuật.
          </p>
        </div>
        <div className="idp-header-actions">
          <button
            type="button"
            className="idp-btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tạo yêu cầu mới
          </button>
        </div>
      </div>

      {/* ── Stats Summary Row ── */}
      <div className="spt-stats-grid">
        <div className="spt-stat-card">
          <div className="spt-stat-icon-wrap gray">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="spt-stat-info">
            <span className="spt-stat-label">Tổng số yêu cầu</span>
            <span className="spt-stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="spt-stat-card">
          <div className="spt-stat-icon-wrap amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="spt-stat-info">
            <span className="spt-stat-label">Chờ tiếp nhận</span>
            <span className="spt-stat-value text-amber">{stats.pending}</span>
          </div>
        </div>

        <div className="spt-stat-card">
          <div className="spt-stat-icon-wrap blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
          </div>
          <div className="spt-stat-info">
            <span className="spt-stat-label">Đang xử lý</span>
            <span className="spt-stat-value text-blue">{stats.inProgress}</span>
          </div>
        </div>

        <div className="spt-stat-card">
          <div className="spt-stat-icon-wrap green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="spt-stat-info">
            <span className="spt-stat-label">Đã hoàn thành</span>
            <span className="spt-stat-value text-green">{stats.completed}</span>
          </div>
        </div>

        <div className="spt-stat-card">
          <div className="spt-stat-icon-wrap red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="spt-stat-info">
            <span className="spt-stat-label">Bị từ chối</span>
            <span className="spt-stat-value text-red">{stats.rejected}</span>
          </div>
        </div>
      </div>

      {/* ── Main List & Filter Card ── */}
      <div className="idp-card spt-main-card">
        {/* Filter bar */}
        <div className="spt-filter-bar">
          <div className="spt-filter-group">
            <div className="spt-filter-item">
              <label htmlFor="spt-filter-status">Trạng thái</label>
              <select
                id="spt-filter-status"
                className="spt-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái ({stats.total})</option>
                <option value="pending">Chờ tiếp nhận ({stats.pending})</option>
                <option value="in_progress">Đang xử lý ({stats.inProgress})</option>
                <option value="completed">Đã hoàn thành ({stats.completed})</option>
                <option value="rejected">Bị từ chối ({stats.rejected})</option>
              </select>
            </div>

            <div className="spt-filter-item">
              <label htmlFor="spt-filter-approver">Nơi tiếp nhận duyệt</label>
              <select
                id="spt-filter-approver"
                className="spt-select"
                value={approverFilter}
                onChange={(e) => setApproverFilter(e.target.value)}
              >
                <option value="all">Tất cả (HR & Mentor)</option>
                <option value="hr">Ban Nhân sự (HR)</option>
                <option value="mentor">Mentor hướng dẫn</option>
              </select>
            </div>

            <div className="spt-filter-item">
              <label htmlFor="spt-filter-category">Loại giấy tờ / Yêu cầu</label>
              <select
                id="spt-filter-category"
                className="spt-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="spt-filter-item spt-search-wrap">
              <label htmlFor="spt-search">Tìm kiếm</label>
              <div className="spt-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="spt-search"
                  type="text"
                  placeholder="Mã ticket, tiêu đề, từ khóa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ticket List */}
        {filteredTickets.length === 0 ? (
          <div className="spt-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3>Chưa có yêu cầu hỗ trợ nào phù hợp</h3>
            <p>Không tìm thấy ticket nào khớp với bộ lọc. Bạn có thể gửi yêu cầu hỗ trợ mới ngay bây giờ.</p>
            <button
              type="button"
              className="idp-btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              + Tạo yêu cầu mới
            </button>
          </div>
        ) : (
          <div className="spt-tickets-list">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`spt-ticket-card ${ticket.status === 'rejected' ? 'spt-ticket-card--rejected' : ''}`}
                onClick={() => setSelectedTicket(ticket)}
                style={{ cursor: 'pointer' }}
              >
                <div className="spt-card-header">
                  <div className="spt-card-title-group">
                    <span className="spt-ticket-id">{ticket.id}</span>
                    <span className="spt-category-tag">{ticket.categoryLabel}</span>
                    {ticket.targetApprover === 'mentor' || ticket.assignee?.toLowerCase().includes('mentor') ? (
                      <span className="spt-approver-badge mentor">Mentor duyệt</span>
                    ) : (
                      <span className="spt-approver-badge hr">HR duyệt</span>
                    )}
                    {ticket.priority === 'urgent' && (
                      <span className="spt-priority-badge priority-urgent">Rất gấp</span>
                    )}
                    {ticket.priority === 'high' && (
                      <span className="spt-priority-badge priority-high">Gấp</span>
                    )}
                  </div>

                  <div className="spt-card-status">
                    {ticket.status === 'pending' && (
                      <span className="spt-status-pill pill-pending">
                        <span className="pill-dot dot-pending" />
                        {ticket.statusLabel || 'Chờ tiếp nhận'}
                      </span>
                    )}
                    {ticket.status === 'in_progress' && (
                      <span className="spt-status-pill pill-progress">
                        <span className="pill-dot dot-progress" />
                        {ticket.statusLabel || 'Đang xử lý'}
                      </span>
                    )}
                    {ticket.status === 'completed' && (
                      <span className="spt-status-pill pill-completed">
                        <span className="pill-dot dot-completed" />
                        {ticket.statusLabel || 'Đã hoàn thành'}
                      </span>
                    )}
                    {ticket.status === 'rejected' && (
                      <span className="spt-status-pill pill-rejected">
                        <span className="pill-dot dot-rejected" />
                        {ticket.statusLabel || 'Bị từ chối'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="spt-card-body">
                  <h3 className="spt-ticket-title">{ticket.title}</h3>
                  <p className="spt-ticket-desc">{ticket.description}</p>

                  {/* Báo lại cho TTS khi yêu cầu bị từ chối */}
                  {ticket.status === 'rejected' && (
                    <div className="spt-rejected-notice" role="alert">
                      <div className="spt-rejected-notice-header">
                        <AlertTriangle size={16} className="spt-rejected-icon" />
                        <strong>Yêu cầu này đã bị Ban Nhân sự (HR) từ chối</strong>
                      </div>
                      <p className="spt-rejected-notice-body">
                        <strong>Lý do từ chối:</strong>{' '}
                        {ticket.responseNote || 'Không đạt điều kiện xét duyệt hoặc hồ sơ chưa hợp lệ.'}
                      </p>
                      <div className="spt-rejected-notice-hint">
                        Vui lòng kiểm tra lại lý do nêu trên hoặc liên hệ trực tiếp Ban Nhân sự (HR) để được hướng dẫn nộp lại.
                      </div>
                    </div>
                  )}

                  <div className="spt-ticket-meta-grid">
                    <div className="spt-meta-col">
                      <span className="meta-label">Ngày gửi:</span>
                      <span className="meta-val">{ticket.createdAt}</span>
                    </div>
                    <div className="spt-meta-col">
                      <span className="meta-label">Số lượng:</span>
                      <span className="meta-val">{ticket.copies} bản in</span>
                    </div>
                    <div className="spt-meta-col">
                      <span className="meta-label">Hình thức nhận:</span>
                      <span className="meta-val">{ticket.deliveryMethod}</span>
                    </div>
                    <div className="spt-meta-col">
                      <span className="meta-label">Người xử lý:</span>
                      <span className="meta-val highlight">{ticket.assignee}</span>
                    </div>
                  </div>

                  {/* Visual Progress Stepper */}
                  <div className="spt-stepper">
                    <div className="step-item completed">
                      <div className="step-circle">✓</div>
                      <span className="step-text">Đã gửi yêu cầu</span>
                    </div>
                    <div className={`step-line ${ticket.status === 'rejected' ? 'line-rejected' : ticket.currentStep >= 2 ? 'completed' : ''}`} />
                    {ticket.status === 'rejected' ? (
                      <>
                        <div className="step-item rejected">
                          <div className="step-circle">✕</div>
                          <span className="step-text">Bị từ chối</span>
                        </div>
                        <div className="step-line line-dimmed" />
                        <div className="step-item dimmed">
                          <div className="step-circle">3</div>
                          <span className="step-text">Đã dừng xử lý</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`step-item ${ticket.currentStep >= 2 ? 'completed' : ''} ${ticket.currentStep === 2 ? 'active' : ''}`}>
                          <div className="step-circle">2</div>
                          <span className="step-text">
                            {ticket.targetApprover === 'mentor' || ticket.assignee?.toLowerCase().includes('mentor')
                              ? 'Mentor tiếp nhận'
                              : 'Hr tiếp nhận'}
                          </span>
                        </div>
                        <div className={`step-line ${ticket.currentStep >= 3 ? 'completed' : ''}`} />
                        <div className={`step-item ${ticket.currentStep >= 3 ? 'completed' : ''} ${ticket.currentStep === 3 ? 'active' : ''}`}>
                          <div className="step-circle">3</div>
                          <span className="step-text">
                            {ticket.targetApprover === 'mentor' || ticket.assignee?.toLowerCase().includes('mentor')
                              ? 'Mentor ký duyệt'
                              : 'Ký & Đóng dấu'}
                          </span>
                        </div>
                        <div className={`step-line ${ticket.currentStep >= 4 ? 'completed' : ''}`} />
                        <div className={`step-item ${ticket.currentStep >= 4 ? 'completed' : ''}`}>
                          <div className="step-circle">4</div>
                          <span className="step-text">Hoàn tất bàn giao</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Official Response Note khi không phải bị từ chối (hoặc hiển thị bổ sung) */}
                  {ticket.responseNote && ticket.status !== 'rejected' && (
                    <div className="spt-response-box">
                      <div className="spt-response-header">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <strong>
                          {ticket.targetApprover === 'mentor' || ticket.assignee?.toLowerCase().includes('mentor')
                            ? 'Phản hồi từ Mentor hướng dẫn:'
                            : 'Phản hồi từ Ban Nhân sự & Quản lý (Hr):'}
                        </strong>
                      </div>
                      <div className="spt-response-text">{ticket.responseNote}</div>
                    </div>
                  )}
                </div>

                <div className="spt-card-footer">
                  {ticket.attachedFileName && (
                    <div className="spt-attach-file">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span>Tệp đính kèm: {ticket.attachedFileName}</span>
                    </div>
                  )}
                  <div className="spt-card-actions">
                    {ticket.status !== 'completed' && ticket.currentStep < 3 && (
                      <button
                        type="button"
                        className="spt-btn-delete"
                        onClick={(e) => handleDeleteTicket(ticket.id, e)}
                        title="Hủy / Xóa yêu cầu khi chưa được duyệt"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Xóa yêu cầu
                      </button>
                    )}
                    <button
                      type="button"
                      className="spt-btn-detail"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      Xem chi tiết tiến trình
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Tạo yêu cầu hỗ trợ mới ── */}
      {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="idp-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="idp-modal-content spt-modal-form"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="spt-modal-header">
              <div>
                <h3>Tạo Yêu Cầu Hỗ Trợ & Xét Duyệt</h3>
                <p>Chọn gửi tới Ban Nhân sự (HR) hoặc Mentor hướng dẫn để được hỗ trợ và phê duyệt nhanh chóng.</p>
              </div>
              <button
                type="button"
                className="idp-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="spt-form-body">
              {/* Chọn đối tượng xét duyệt (HR hoặc Mentor) */}
              <div className="spt-form-group">
                <label className="spt-form-label">
                  Gửi yêu cầu tới ai xét duyệt? <span className="req">*</span>
                </label>
                <div className="spt-recipient-cards">
                  <div
                    className={`spt-recipient-card ${formRecipient === 'hr' ? 'selected' : ''}`}
                    onClick={() => {
                      setFormRecipient('hr')
                      setFormCategory('cert_internship')
                    }}
                  >
                    <div className="spt-rc-icon hr">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div className="spt-rc-content">
                      <div className="spt-rc-title-row">
                        <strong>Ban Nhân sự (HR)</strong>
                        {formRecipient === 'hr' && <span className="spt-rc-check">✓</span>}
                      </div>
                      <p className="spt-rc-desc">Duyệt đơn xin nghỉ phép, cấp chứng nhận, giấy xác nhận nộp trường, phụ cấp & thủ tục.</p>
                    </div>
                  </div>

                  <div
                    className={`spt-recipient-card ${formRecipient === 'mentor' ? 'selected' : ''}`}
                    onClick={() => {
                      setFormRecipient('mentor')
                      setFormCategory('stamp_report')
                    }}
                  >
                    <div className="spt-rc-icon mentor">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                    <div className="spt-rc-content">
                      <div className="spt-rc-title-row">
                        <strong>Mentor hướng dẫn</strong>
                        {formRecipient === 'mentor' && <span className="spt-rc-check">✓</span>}
                      </div>
                      <p className="spt-rc-desc">Ký nhận xét Báo cáo thực tập, đánh giá điểm, hỗ trợ dự án & kỹ thuật chuyên môn.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loại giấy tờ / Yêu cầu lọc theo đối tượng đã chọn */}
              <div className="spt-form-group">
                <label className="spt-form-label">
                  Loại yêu cầu / Danh mục hỗ trợ <span className="req">*</span>
                </label>
                <select
                  className={`spt-form-input ${formErrors.category ? 'error' : ''}`}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {DOCUMENT_TYPES.filter((dt) => dt.target === formRecipient).map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.label}
                    </option>
                  ))}
                </select>
                {formErrors.category && <span className="spt-form-error">{formErrors.category}</span>}
              </div>

              {/* Tiêu đề & Mức độ ưu tiên */}
              <div className="spt-form-row-2">
                <div className="spt-form-group">
                  <label className="spt-form-label">
                    Tiêu đề yêu cầu <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className={`spt-form-input ${formErrors.title ? 'error' : ''}`}
                    placeholder={
                      formRecipient === 'hr'
                        ? 'VD: Xin giấy xác nhận thực tập nộp khoa CNTT'
                        : 'VD: Ký nhận xét và đánh giá Báo cáo thực tập tốt nghiệp'
                    }
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                  {formErrors.title && <span className="spt-form-error">{formErrors.title}</span>}
                </div>

                <div className="spt-form-group">
                  <label className="spt-form-label">Mức độ ưu tiên</label>
                  <select
                    className="spt-form-input"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                  >
                    <option value="normal">Bình thường (1 - 2 ngày)</option>
                    <option value="high">Gấp (Trong 24h)</option>
                    <option value="urgent">Rất khẩn cấp (Cần xử lý trong ngày)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="spt-form-group">
                <label className="spt-form-label">
                  Mục đích & Nội dung chi tiết <span className="req">*</span>
                </label>
                <textarea
                  className={`spt-form-textarea ${formErrors.description ? 'error' : ''}`}
                  rows="4"
                  placeholder={
                    formRecipient === 'hr'
                      ? 'Ghi rõ thông tin cần thiết: Mã sinh viên, lớp, tên đề tài, mục đích xin giấy tờ, thời hạn nộp cho trường...'
                      : 'Ghi rõ nội dung cần Mentor hỗ trợ: Tên đề tài, tiến độ dự án, mục cần ký xác nhận, lý do xin phép...'
                  }
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
                <span className="spt-char-counter">
                  {formDescription.length} ký tự (tối thiểu 15 ký tự)
                </span>
                {formErrors.description && (
                  <span className="spt-form-error">{formErrors.description}</span>
                )}
              </div>

              {/* Số lượng bản in & Phương thức nhận */}
              <div className="spt-form-row-2">
                <div className="spt-form-group">
                  <label className="spt-form-label">Số lượng bản in</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="spt-form-input"
                    value={formCopies}
                    onChange={(e) => setFormCopies(e.target.value)}
                  />
                </div>

                <div className="spt-form-group">
                  <label className="spt-form-label">Hình thức nhận kết quả / Phê duyệt</label>
                  <select
                    className="spt-form-input"
                    value={formDelivery}
                    onChange={(e) => setFormDelivery(e.target.value)}
                  >
                    {formRecipient === 'hr' ? (
                      <>
                        <option value="both">Cả bản cứng tại VP & Bản scan PDF</option>
                        <option value="physical">Chỉ bản cứng (Nhận tại quầy HR Tầng 3)</option>
                        <option value="digital">Chỉ bản số (Scan PDF gửi qua Email)</option>
                      </>
                    ) : (
                      <>
                        <option value="digital">Phê duyệt & ký số trực tuyến trên hệ thống</option>
                        <option value="physical">Ký trực tiếp trên bản cứng & trao đổi</option>
                        <option value="both">Ký bản cứng & xác nhận qua hệ thống</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Tệp đính kèm */}
              <div className="spt-form-group">
                <label className="spt-form-label">
                  Tệp đính kèm {formRecipient === 'mentor' ? '(File báo cáo, đơn xin phép, tài liệu...)' : '(Mẫu đơn, minh chứng...)'}
                </label>
                <div className="spt-upload-zone">
                  <input
                    type="file"
                    id="spt-file-input"
                    className="spt-file-input"
                    onChange={(e) => setFormFile(e.target.files[0] || null)}
                  />
                  <label htmlFor="spt-file-input" className="spt-upload-label">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {formFile ? (
                        <strong>{formFile.name} ({(formFile.size / 1024).toFixed(1)} KB)</strong>
                      ) : (
                        'Nhấn để chọn tệp hoặc kéo thả vào đây (Hỗ trợ PDF, DOCX, XLSX, JPG, PNG tối đa 15MB)'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              <div className="spt-modal-footer">
                <button
                  type="button"
                  className="idp-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="idp-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spt-spinner" />
                      <span>Đang gửi yêu cầu...</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      <span>{formRecipient === 'mentor' ? 'Gửi yêu cầu tới Mentor' : 'Gửi yêu cầu tới HR'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Chi tiết Tiến trình & Yêu cầu Hỗ trợ TTS ── */}
      {selectedTicket && typeof document !== 'undefined' && createPortal(
        <div className="idp-modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div
            className="idp-modal-content spt-modal-detail"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="spt-detail-header">
              <div>
                <div className="spt-detail-badges-row">
                  <span className="spt-ticket-id">{selectedTicket.id}</span>
                  <span className="spt-category-tag">{selectedTicket.categoryLabel}</span>
                  {selectedTicket.targetApprover === 'mentor' || selectedTicket.assignee?.toLowerCase().includes('mentor') ? (
                    <span className="spt-approver-badge mentor">Mentor duyệt</span>
                  ) : (
                    <span className="spt-approver-badge hr">HR duyệt</span>
                  )}
                  <span className={`spt-priority-badge priority-${selectedTicket.priority}`}>
                    {selectedTicket.priorityLabel}
                  </span>
                  <span className={`spt-status-pill pill-${selectedTicket.status}`}>
                    <span className={`status-dot dot-${selectedTicket.status}`} />
                    {selectedTicket.statusLabel}
                  </span>
                </div>
                <h3 className="spt-detail-modal-title">{selectedTicket.title}</h3>
              </div>
              <button
                type="button"
                className="idp-modal-close"
                onClick={() => setSelectedTicket(null)}
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="spt-detail-body">
              {/* Stepper tiến trình xử lý trực quan */}
              <div className="spt-detail-stepper-box">
                <div className="spt-detail-stepper-header">
                  <span>Tiến trình xử lý hồ sơ</span>
                  <span className="spt-current-step-label">
                    Trạng thái: <strong>{selectedTicket.statusLabel}</strong>
                  </span>
                </div>

                {selectedTicket.status === 'rejected' && (
                  <div className="spt-rejected-notice in-modal" role="alert">
                    <div className="spt-rejected-notice-header">
                      <AlertTriangle size={18} className="spt-rejected-icon" />
                      <strong>Hồ sơ yêu cầu này đã bị Ban Nhân sự (HR) từ chối</strong>
                    </div>
                    <p className="spt-rejected-notice-body">
                      <strong>Lý do từ chối:</strong>{' '}
                      {selectedTicket.responseNote || selectedTicket.rejectReason || 'Không đạt điều kiện xét duyệt hoặc hồ sơ chưa hợp lệ.'}
                    </p>
                    <div className="spt-rejected-notice-hint">
                      Vui lòng kiểm tra lại lý do nêu trên hoặc liên hệ Ban Nhân sự (HR) để được hướng dẫn bổ sung/nộp lại hồ sơ.
                    </div>
                  </div>
                )}

                {selectedTicket.status === 'rejected' ? (
                  <div className="spt-stepper in-modal">
                    {/* Bước 1 */}
                    <div className="step-item completed">
                      <div className="step-circle">✓</div>
                      <span className="step-text">Đã gửi yêu cầu</span>
                      <span className="step-sub">{selectedTicket.createdAt}</span>
                    </div>

                    <div className="step-line line-rejected" />

                    {/* Bước 2: Bị từ chối */}
                    <div className="step-item rejected">
                      <div className="step-circle">✕</div>
                      <span className="step-text">Bị từ chối</span>
                      <span className="step-sub">{selectedTicket.completedAt || 'HR đã từ chối'}</span>
                    </div>

                    <div className="step-line line-dimmed" />

                    {/* Bước 3: Đã dừng */}
                    <div className="step-item dimmed">
                      <div className="step-circle">3</div>
                      <span className="step-text">Dừng xét duyệt</span>
                      <span className="step-sub">Không tiếp tục</span>
                    </div>
                  </div>
                ) : (
                  <div className="spt-stepper in-modal">
                    {/* Bước 1 */}
                    <div className={`step-item ${selectedTicket.currentStep >= 1 ? 'completed' : ''} ${selectedTicket.currentStep === 1 ? 'active' : ''}`}>
                      <div className="step-circle">{selectedTicket.currentStep > 1 ? '✓' : '1'}</div>
                      <span className="step-text">Đã gửi yêu cầu</span>
                      <span className="step-sub">{selectedTicket.createdAt}</span>
                    </div>

                    <div className={`step-line ${selectedTicket.currentStep >= 2 ? 'completed' : ''}`} />

                    {/* Bước 2 */}
                    <div className={`step-item ${selectedTicket.currentStep >= 2 ? 'completed' : ''} ${selectedTicket.currentStep === 2 ? 'active' : ''}`}>
                      <div className="step-circle">{selectedTicket.currentStep > 2 ? '✓' : '2'}</div>
                      <span className="step-text">
                        {selectedTicket.targetApprover === 'mentor' || selectedTicket.assignee?.toLowerCase().includes('mentor')
                          ? 'Mentor tiếp nhận'
                          : 'Hr tiếp nhận'}
                      </span>
                      <span className="step-sub">{selectedTicket.assignee || 'Hr'}</span>
                    </div>

                    <div className={`step-line ${selectedTicket.currentStep >= 3 ? 'completed' : ''}`} />

                    {/* Bước 3 */}
                    <div className={`step-item ${selectedTicket.currentStep >= 3 ? 'completed' : ''} ${selectedTicket.currentStep === 3 ? 'active' : ''}`}>
                      <div className="step-circle">{selectedTicket.currentStep > 3 ? '✓' : '3'}</div>
                      <span className="step-text">
                        {selectedTicket.targetApprover === 'mentor' || selectedTicket.assignee?.toLowerCase().includes('mentor')
                          ? 'Mentor ký duyệt'
                          : 'Ký & Đóng dấu'}
                      </span>
                      <span className="step-sub">
                        {selectedTicket.targetApprover === 'mentor' || selectedTicket.assignee?.toLowerCase().includes('mentor')
                          ? 'Người hướng dẫn'
                          : 'Ban Đào tạo ICTU'}
                      </span>
                    </div>

                    <div className={`step-line ${selectedTicket.currentStep >= 4 ? 'completed' : ''}`} />

                    {/* Bước 4 */}
                    <div className={`step-item ${selectedTicket.currentStep >= 4 ? 'completed' : ''} ${selectedTicket.currentStep === 4 ? 'active' : ''}`}>
                      <div className="step-circle">{selectedTicket.currentStep >= 4 ? '✓' : '4'}</div>
                      <span className="step-text">
                        {selectedTicket.targetApprover === 'mentor' || selectedTicket.assignee?.toLowerCase().includes('mentor')
                          ? 'Hoàn tất phê duyệt'
                          : 'Hoàn tất bàn giao'}
                      </span>
                      <span className="step-sub">{selectedTicket.completedAt || 'Chờ hoàn tất'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin hồ sơ & người gửi */}
              <div className="spt-detail-block">
                <h4>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Thông tin Thực tập sinh & Tiếp nhận
                </h4>
                <div className="spt-detail-card-grid">
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Người gửi yêu cầu:</span>
                    <span className="spt-detail-value highlight-name">
                      {selectedTicket.senderName || (user?.role === 'intern' ? `${user?.full_name || 'TTS'} (${user?.code || 'TTS0001'})` : 'TTS (TTS0001)')}
                    </span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Email liên hệ:</span>
                    <span className="spt-detail-value">{user?.role === 'intern' ? (user?.email || 'intern@ictu.edu.vn') : 'intern@ictu.edu.vn'}</span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Đơn vị xét duyệt:</span>
                    <span className="spt-detail-value highlight-assignee">
                      {selectedTicket.targetApprover === 'mentor' || selectedTicket.assignee?.toLowerCase().includes('mentor')
                        ? 'Mentor hướng dẫn'
                        : 'Ban Nhân sự (HR)'}
                    </span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Chuyên viên phụ trách:</span>
                    <span className="spt-detail-value highlight-assignee">{selectedTicket.assignee}</span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Thời gian gửi:</span>
                    <span className="spt-detail-value">{selectedTicket.createdAt}</span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Thời gian hoàn thành:</span>
                    <span className="spt-detail-value">{selectedTicket.completedAt || 'Dự kiến 24 - 48h làm việc'}</span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Mức độ ưu tiên:</span>
                    <span className="spt-detail-value">
                      <span className={`spt-priority-badge priority-${selectedTicket.priority}`}>
                        {selectedTicket.priorityLabel}
                      </span>
                    </span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Số lượng bản in:</span>
                    <span className="spt-detail-value">{selectedTicket.copies} bản in</span>
                  </div>
                  <div className="spt-detail-card-item">
                    <span className="spt-detail-label">Hình thức nhận / Phê duyệt:</span>
                    <span className="spt-detail-value">{selectedTicket.deliveryMethod}</span>
                  </div>
                </div>
              </div>

              {/* Nội dung yêu cầu chi tiết */}
              <div className="spt-detail-block">
                <h4>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Mục đích & Nội dung chi tiết
                </h4>
                <p className="spt-detail-desc">{selectedTicket.description}</p>
              </div>

              {/* Tệp tài liệu đính kèm */}
              <div className="spt-detail-block">
                <h4>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  Tệp tài liệu đính kèm
                </h4>
                {selectedTicket.attachedFileName ? (
                  <div className="spt-attach-file in-modal">
                    <div className="spt-attach-file-info">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span>{selectedTicket.attachedFileName}</span>
                    </div>
                    <button
                      type="button"
                      className="spt-attach-download-btn"
                      onClick={() => showToast(`Đang tải xuống tệp: ${selectedTicket.attachedFileName}`)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Tải xuống
                    </button>
                  </div>
                ) : (
                  <p className="spt-no-attachment">Không có tệp đính kèm nào kèm theo yêu cầu này.</p>
                )}
              </div>

              {/* Ghi chú & Phản hồi của Hr / Mentor */}
              {selectedTicket.responseNote && (
                <div className={`spt-detail-block response ${selectedTicket.status === 'rejected' ? 'response--rejected' : ''}`}>
                  <h4>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {selectedTicket.status === 'rejected'
                      ? 'Lý do từ chối & Phản hồi từ Ban Nhân sự (HR)'
                      : selectedTicket.targetApprover === 'mentor' || selectedTicket.assignee?.toLowerCase().includes('mentor')
                      ? 'Chỉ dẫn & Phản hồi từ Mentor hướng dẫn'
                      : 'Chỉ dẫn & Phản hồi từ Ban Quản lý / Hr'}
                  </h4>
                  <div className="spt-response-text">{selectedTicket.responseNote}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="spt-modal-footer">
              {selectedTicket.status !== 'completed' && selectedTicket.currentStep < 3 && (
                <button
                  type="button"
                  className="idp-btn-danger"
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  style={{ marginRight: 'auto' }}
                  title="Xóa yêu cầu khi chưa được duyệt"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  Hủy / Xóa yêu cầu này
                </button>
              )}
              <button
                type="button"
                className="idp-btn-secondary"
                onClick={() => window.print()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                In phiếu tiếp nhận
              </button>
              <button
                type="button"
                className="idp-btn-primary"
                onClick={() => setSelectedTicket(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
