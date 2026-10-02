import { useState, useEffect, useMemo } from 'react'
import './InternDashboardPage.css'
import './InternSupportPage.css'

const STORAGE_KEY = 'ictu_intern_tickets_data'

const DOCUMENT_TYPES = [
  { id: 'cert_internship', label: 'Giấy chứng nhận hoàn thành thực tập (Certificate)' },
  { id: 'cert_current', label: 'Giấy xác nhận đang thực tập tại doanh nghiệp (Nộp nhà trường)' },
  { id: 'stamp_report', label: 'Đóng dấu & ký nhận xét Báo cáo thực tập tốt nghiệp' },
  { id: 'transcript_eval', label: 'Bảng điểm & đánh giá năng lực thực tập sinh' },
  { id: 'card_account', label: 'Cấp lại thẻ ra vào / Tài khoản VPN / Email công ty' },
  { id: 'hardware_it', label: 'Hỗ trợ thiết bị máy tính làm việc & phần cứng IT' },
  { id: 'other_request', label: 'Yêu cầu hỗ trợ khác' },
]

const INITIAL_TICKETS = [
  {
    id: 'TK-2026-089',
    category: 'cert_internship',
    categoryLabel: 'Giấy chứng nhận hoàn thành thực tập',
    title: 'Xin cấp Giấy chứng nhận hoàn thành thực tập để nộp trường ICTU',
    priority: 'high',
    priorityLabel: 'Gấp',
    description:
      'Em cần xin giấy chứng nhận hoàn thành thời gian thực tập tại Trung tâm Phần mềm ICTU để nộp về Khoa Công nghệ thông tin trước ngày 15/10/2026 để làm hồ sơ xét điều kiện bảo vệ đồ án tốt nghiệp.',
    copies: 2,
    deliveryMethod: 'Cả bản cứng tại văn phòng HR & Bản scan PDF qua email',
    status: 'in_progress', // 'pending' | 'in_progress' | 'completed' | 'rejected'
    statusLabel: 'Đang xử lý',
    createdAt: '2026-09-28 10:15',
    assignee: 'Trần Thị Thu Thảo (HR Specialist)',
    responseNote:
      'HR đã tiếp nhận yêu cầu và đối soát dữ liệu chấm công. Đang soạn thảo văn bản và trình Trưởng ban ký duyệt. Dự kiến bàn giao bản cứng ngày 03/10/2026 tại tầng 3.',
    attachedFileName: 'Don_xin_xac_nhan_TTS_NguyenVanBinh.pdf',
    currentStep: 2,
  },
  {
    id: 'TK-2026-054',
    category: 'stamp_report',
    categoryLabel: 'Đóng dấu & ký nhận xét Báo cáo tốt nghiệp',
    title: 'Xin đóng dấu bìa và phiếu nhận xét Báo cáo thực tập tốt nghiệp K20',
    priority: 'urgent',
    priorityLabel: 'Rất khẩn cấp',
    description:
      'Báo cáo thực tập của em đã được Mentor Trần Hoàng Quân ký xác nhận và đánh giá đạt 9.5/10. Em gửi hồ sơ để xin đóng dấu pháp nhân công ty.',
    copies: 1,
    deliveryMethod: 'Bản cứng nhận trực tiếp',
    status: 'completed',
    statusLabel: 'Đã hoàn thành',
    createdAt: '2026-09-20 14:00',
    completedAt: '2026-09-22 16:30',
    assignee: 'Vũ Thị Minh Loan (HR Manager)',
    responseNote:
      'Văn phòng Đào tạo đã kiểm tra chữ ký mentor và đóng dấu giáp lai đầy đủ. Bản cứng đã được giao nhận tại quầy Lễ tân ICTU.',
    attachedFileName: 'Bao_cao_thuc_tap_final_sign.pdf',
    currentStep: 4,
  },
  {
    id: 'TK-2026-031',
    category: 'hardware_it',
    categoryLabel: 'Hỗ trợ thiết bị máy tính làm việc',
    title: 'Đổi chuột và cấp thêm bàn phím cơ tại P.302 máy số 12',
    priority: 'normal',
    priorityLabel: 'Bình thường',
    description:
      'Bàn phím màng tại bàn làm việc số 12 phòng 302 bị kẹt cụm phím số và space, chuột quang bị chập chờn click đúp.',
    copies: 1,
    deliveryMethod: 'Bàn giao trực tiếp tại phòng làm việc',
    status: 'completed',
    statusLabel: 'Đã hoàn thành',
    createdAt: '2026-09-15 09:00',
    completedAt: '2026-09-15 11:30',
    assignee: 'Lê Hoàng Nam (IT Helpdesk)',
    responseNote: 'Đã thay mới bộ phím chuột văn phòng tại bàn 12. Vui lòng kiểm tra lại.',
    attachedFileName: '',
    currentStep: 4,
  },
]

export default function InternSupportPage() {
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error(e)
    }
    return INITIAL_TICKETS
  })

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Modal create ticket state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Form states
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

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = t.id.toLowerCase().includes(q)
        const matchTitle = t.title.toLowerCase().includes(q)
        const matchDesc = t.description.toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchDesc) return false
      }
      return true
    })
  }, [tickets, statusFilter, categoryFilter, searchQuery])

  // Stats summary
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      pending: tickets.filter((t) => t.status === 'pending').length,
      inProgress: tickets.filter((t) => t.status === 'in_progress').length,
      completed: tickets.filter((t) => t.status === 'completed').length,
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
    } else if (formTitle.trim().length < 6) {
      errors.title = 'Tiêu đề yêu cầu cần tối thiểu 6 ký tự'
    }
    if (!formDescription.trim()) {
      errors.description = 'Vui lòng nhập mô tả chi tiết lý do và mục đích'
    } else if (formDescription.trim().length < 15) {
      errors.description = 'Mô tả cần tối thiểu 15 ký tự để HR hiểu rõ nhu cầu'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit new ticket
  const handleSubmitTicket = (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    setTimeout(() => {
      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const catObj = DOCUMENT_TYPES.find((d) => d.id === formCategory)
      const priorityLabelMap = {
        normal: 'Bình thường',
        high: 'Gấp',
        urgent: 'Rất khẩn cấp',
      }
      const deliveryMap = {
        physical: 'Bản cứng nhận tại quầy HR tầng 3',
        digital: 'File scan PDF có chữ ký số gửi qua Email',
        both: 'Cả bản cứng tại văn phòng & File scan PDF',
      }

      const randomNum = Math.floor(100 + Math.random() * 900)
      const newTicketId = `TK-2026-${randomNum}`

      const newTicket = {
        id: newTicketId,
        category: formCategory,
        categoryLabel: catObj ? catObj.label : 'Yêu cầu hỗ trợ',
        title: formTitle.trim(),
        priority: formPriority,
        priorityLabel: priorityLabelMap[formPriority] || 'Bình thường',
        description: formDescription.trim(),
        copies: Number(formCopies),
        deliveryMethod: deliveryMap[formDelivery] || formDelivery,
        status: 'pending',
        statusLabel: 'Chờ tiếp nhận',
        createdAt: formattedDate,
        assignee: 'Đang phân công HR tiếp nhận...',
        responseNote: 'Yêu cầu đã được gửi lên hệ thống và chuyển tiếp tới Ban Đào tạo & Nhân sự HR.',
        attachedFileName: formFile ? formFile.name : '',
        currentStep: 1,
      }

      setTickets([newTicket, ...tickets])
      setIsSubmitting(false)
      setIsCreateModalOpen(false)

      // Reset form
      setFormTitle('')
      setFormDescription('')
      setFormCopies(1)
      setFormFile(null)
      setFormErrors({})

      showToast(`Đã gửi yêu cầu ${newTicketId} thành công! HR sẽ phản hồi trong vòng 24h.`)
    }, 600)
  }

  return (
    <div className="intern-dashboard-page intern-support-page">
      {/* ── Toast notification ── */}
      {toastMessage && (
        <div className="spt-toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
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
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ tiếp nhận</option>
                <option value="in_progress">Đang xử lý</option>
                <option value="completed">Đã hoàn thành</option>
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

          <div className="spt-count-info">
            Tìm thấy <strong>{filteredTickets.length}</strong> yêu cầu
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
              <div key={ticket.id} className="spt-ticket-card">
                <div className="spt-card-header">
                  <div className="spt-card-title-group">
                    <span className="spt-ticket-id">{ticket.id}</span>
                    <span className="spt-category-tag">{ticket.categoryLabel}</span>
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
                        Chờ tiếp nhận
                      </span>
                    )}
                    {ticket.status === 'in_progress' && (
                      <span className="spt-status-pill pill-progress">
                        <span className="pill-dot dot-progress" />
                        Đang xử lý
                      </span>
                    )}
                    {ticket.status === 'completed' && (
                      <span className="spt-status-pill pill-completed">
                        <span className="pill-dot dot-completed" />
                        Đã hoàn thành
                      </span>
                    )}
                  </div>
                </div>

                <div className="spt-card-body">
                  <h3 className="spt-ticket-title">{ticket.title}</h3>
                  <p className="spt-ticket-desc">{ticket.description}</p>

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
                    <div className={`step-item ${ticket.currentStep >= 1 ? 'completed' : ''}`}>
                      <div className="step-circle">1</div>
                      <span className="step-text">Đã gửi yêu cầu</span>
                    </div>
                    <div className={`step-line ${ticket.currentStep >= 2 ? 'completed' : ''}`} />
                    <div className={`step-item ${ticket.currentStep >= 2 ? 'completed' : ''} ${ticket.currentStep === 2 ? 'active' : ''}`}>
                      <div className="step-circle">2</div>
                      <span className="step-text">HR tiếp nhận</span>
                    </div>
                    <div className={`step-line ${ticket.currentStep >= 3 ? 'completed' : ''}`} />
                    <div className={`step-item ${ticket.currentStep >= 3 ? 'completed' : ''} ${ticket.currentStep === 3 ? 'active' : ''}`}>
                      <div className="step-circle">3</div>
                      <span className="step-text">Ký & Đóng dấu</span>
                    </div>
                    <div className={`step-line ${ticket.currentStep >= 4 ? 'completed' : ''}`} />
                    <div className={`step-item ${ticket.currentStep >= 4 ? 'completed' : ''}`}>
                      <div className="step-circle">4</div>
                      <span className="step-text">Hoàn tất bàn giao</span>
                    </div>
                  </div>

                  {/* Official Response Note */}
                  {ticket.responseNote && (
                    <div className="spt-response-box">
                      <div className="spt-response-header">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <strong>Phản hồi từ Ban Nhân sự & Quản lý:</strong>
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
                  <button
                    type="button"
                    className="spt-btn-detail"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    Xem chi tiết tiến trình
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Tạo yêu cầu hỗ trợ mới ── */}
      {isCreateModalOpen && (
        <div className="idp-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="idp-modal-content spt-modal-form"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="spt-modal-header">
              <div>
                <h3>Gửi Yêu Cầu Hỗ Trợ & Cấp Giấy Tờ</h3>
                <p>Điền thông tin chi tiết để Ban Nhân sự HR & IT tiếp nhận xử lý nhanh nhất.</p>
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
              {/* Category selection */}
              <div className="spt-form-group">
                <label className="spt-form-label">
                  Loại giấy tờ / Yêu cầu <span className="req">*</span>
                </label>
                <select
                  className={`spt-form-input ${formErrors.category ? 'error' : ''}`}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.label}
                    </option>
                  ))}
                </select>
                {formErrors.category && <span className="spt-form-error">{formErrors.category}</span>}
              </div>

              {/* Title & Priority */}
              <div className="spt-form-row-2">
                <div className="spt-form-group">
                  <label className="spt-form-label">
                    Tiêu đề yêu cầu <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className={`spt-form-input ${formErrors.title ? 'error' : ''}`}
                    placeholder="VD: Xin giấy xác nhận thực tập nộp khoa CNTT"
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

              {/* Description textarea */}
              <div className="spt-form-group">
                <label className="spt-form-label">
                  Mục đích & Mô tả chi tiết <span className="req">*</span>
                </label>
                <textarea
                  className={`spt-form-textarea ${formErrors.description ? 'error' : ''}`}
                  rows="4"
                  placeholder="Ghi rõ thông tin cần thiết: Mã sinh viên, lớp, tên đề tài, mục đích xin giấy tờ, thời hạn nộp cho trường..."
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

              {/* Copies & Delivery Method */}
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
                  <label className="spt-form-label">Phương thức nhận kết quả</label>
                  <select
                    className="spt-form-input"
                    value={formDelivery}
                    onChange={(e) => setFormDelivery(e.target.value)}
                  >
                    <option value="both">Cả bản cứng tại HR & Bản scan PDF</option>
                    <option value="physical">Chỉ bản cứng (Nhận tại quầy HR Tầng 3)</option>
                    <option value="digital">Chỉ bản số (Scan PDF gửi qua Email)</option>
                  </select>
                </div>
              </div>

              {/* File Attachment */}
              <div className="spt-form-group">
                <label className="spt-form-label">Tệp đính kèm (Mẫu đơn, minh chứng nộp về trường nếu có)</label>
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
                        'Nhấn để chọn tệp hoặc kéo thả vào đây (Hỗ trợ PDF, DOCX, JPG, PNG tối đa 10MB)'
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
                  {isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu hỗ trợ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Chi tiết Ticket ── */}
      {selectedTicket && (
        <div className="idp-modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div
            className="idp-modal-content spt-modal-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="spt-modal-header">
              <div>
                <span className="spt-ticket-id">{selectedTicket.id}</span>
                <h3>{selectedTicket.title}</h3>
                <span className="spt-category-tag">{selectedTicket.categoryLabel}</span>
              </div>
              <button
                type="button"
                className="idp-modal-close"
                onClick={() => setSelectedTicket(null)}
              >
                ✕
              </button>
            </div>

            <div className="spt-detail-body">
              <div className="spt-detail-block">
                <h4>Nội dung yêu cầu chi tiết</h4>
                <p className="spt-detail-desc">{selectedTicket.description}</p>
              </div>

              <div className="spt-detail-block">
                <h4>Thông tin xử lý</h4>
                <div className="spt-detail-grid">
                  <div><strong>Người gửi:</strong> Nguyễn Văn Bình (TTS0002)</div>
                  <div><strong>Thời gian gửi:</strong> {selectedTicket.createdAt}</div>
                  <div><strong>Mức ưu tiên:</strong> {selectedTicket.priorityLabel}</div>
                  <div><strong>Số bản yêu cầu:</strong> {selectedTicket.copies} bản</div>
                  <div><strong>Cách thức nhận:</strong> {selectedTicket.deliveryMethod}</div>
                  <div><strong>Chuyên viên phụ trách:</strong> {selectedTicket.assignee}</div>
                </div>
              </div>

              {selectedTicket.responseNote && (
                <div className="spt-detail-block response">
                  <h4>Ghi chú & Phản hồi của HR</h4>
                  <div className="spt-response-text">{selectedTicket.responseNote}</div>
                </div>
              )}
            </div>

            <div className="spt-modal-footer">
              <button
                type="button"
                className="idp-btn-primary"
                onClick={() => setSelectedTicket(null)}
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
