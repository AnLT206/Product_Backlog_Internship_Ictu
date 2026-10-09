import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  AlertCircle,
  Eye,
  User,
  Filter,
  MessageSquare,
} from 'lucide-react'
import {
  fetchLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from '../../../api/operations'
import { emitRealtimeEvent, subscribeRealtimeEvents, SYNC_EVENTS } from '../../../utils/realtimeSync'
import { getSavedAvatar } from '../../../utils/avatarHelper'
import './LeaveRequestManagement.css'

const INITIAL_FALLBACK_LEAVES = [
  {
    id: 'NP-001',
    requestCode: 'NP-001',
    internName: 'TTS',
    internCode: 'TTS0001',
    internEmail: 'intern@ictu.edu.vn',
    type: 'Nghỉ thi học phần',
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    session: 'Buổi chiều (13:30 - 17:30)',
    duration: '0.5 ngày',
    reason: 'Thi kết thúc học phần Cơ sở dữ liệu nâng cao tại trường Đại học CNTT & TT (ICTU).',
    createdDate: '24/09/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    approver: 'Hr',
    feedback: 'Đã duyệt nghỉ phép. Chúc sinh viên thi tốt.',
  },
  {
    id: 'NP-002',
    requestCode: 'NP-002',
    internName: 'TTS',
    internCode: 'TTS0001',
    internEmail: 'intern@ictu.edu.vn',
    type: 'Nghỉ việc cá nhân',
    startDate: '2026-09-12',
    endDate: '2026-09-12',
    session: 'Cả ngày (08:15 - 17:30)',
    duration: '1.0 ngày',
    reason: 'Có việc gia đình đột xuất tại quê Hải Dương.',
    createdDate: '10/09/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    approver: 'Hr',
    feedback: 'Đã duyệt đơn nghỉ phép. Sau khi trở lại trung tâm tiếp tục theo dõi tiến độ công việc.',
  },
  {
    id: 'NP-003',
    requestCode: 'NP-003',
    internName: 'TTS',
    internCode: 'TTS0001',
    internEmail: 'intern@ictu.edu.vn',
    type: 'Nghỉ ốm / Khám bệnh',
    startDate: '2026-10-06',
    endDate: '2026-10-06',
    session: 'Buổi sáng (08:15 - 12:00)',
    duration: '0.5 ngày',
    reason: 'Đi khám sức khỏe định kỳ theo lịch tại Bệnh viện Đại học Y Dược.',
    createdDate: '01/10/2026',
    status: 'pending',
    statusLabel: 'Chờ duyệt',
    approver: 'Chờ duyệt',
    feedback: 'Đang chuyển đơn tới Phòng Nhân sự (Hr) xem xét & phê duyệt.',
  },
  {
    id: 'NP-004',
    requestCode: 'NP-004',
    internName: 'Lê Hoàng Nam',
    internCode: 'TTS0002',
    internEmail: 'tts02@student.ictu.edu.vn',
    type: 'Nghỉ việc cá nhân',
    startDate: '2026-10-08',
    endDate: '2026-10-08',
    session: 'Cả ngày (08:15 - 17:30)',
    duration: '1.0 ngày',
    reason: 'Về quê xử lý thủ tục giấy tờ công chứng căn cước công dân.',
    createdDate: '06/10/2026',
    status: 'pending',
    statusLabel: 'Chờ duyệt',
    approver: 'Chờ duyệt',
    feedback: 'Đang chờ Phòng Nhân sự phê duyệt.',
  },
]

function getInitialLetter(name) {
  if (!name) return 'T'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function LeaveRequestManagement({ onPendingCountChange }) {
  const [requests, setRequests] = useState(INITIAL_FALLBACK_LEAVES)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'approved' | 'rejected'
  const [toast, setToast] = useState(null)

  // Modal State
  const [activeModal, setActiveModal] = useState(null) // { mode: 'approve' | 'reject' | 'view', item: object }
  const [modalFeedback, setModalFeedback] = useState('')
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ text: msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Tải danh sách đơn xin nghỉ từ backend API & đồng bộ LocalStorage
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchLeaveRequests()
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((item) => ({
          ...item,
          avatar: item.avatar || getSavedAvatar(item.internEmail, item.internId, item.internName),
        }))
        setRequests(mapped)
        // Đồng bộ vào localStorage để phân hệ TTS cũng nhận được ngay
        try {
          localStorage.setItem('intern_leave_requests_v1', JSON.stringify(res.data))
        } catch {}
      } else {
        // Kiểm tra dữ liệu trong LocalStorage nếu API chưa có
        try {
          const raw = localStorage.getItem('intern_leave_requests_v1')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped = parsed.map((item) => ({
                ...item,
                avatar: item.avatar || getSavedAvatar(item.internEmail, item.internId, item.internName),
              }))
              setRequests(mapped)
            }
          } else {
            setRequests(INITIAL_FALLBACK_LEAVES.map((item) => ({
              ...item,
              avatar: item.avatar || getSavedAvatar(item.internEmail, item.internId, item.internName),
            })))
          }
        } catch {}
      }
    } catch {
      // Offline fallback
      setRequests(INITIAL_FALLBACK_LEAVES.map((item) => ({
        ...item,
        avatar: item.avatar || getSavedAvatar(item.internEmail, item.internId, item.internName),
      })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Lắng nghe sự kiện TTS nộp đơn mới hoặc đổi avatar để cập nhật bảng ngay
  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((event) => {
      if (
        event?.type === SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED ||
        event?.type === 'SYNC_LEAVE_REQUEST_SUBMITTED'
      ) {
        loadData()
      }
    })

    const handleAvatarChange = () => {
      loadData()
    }
    const handleStorage = (e) => {
      if (e.key === 'intern_leave_requests_v1') {
        loadData()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('ictu_avatar_changed', handleAvatarChange)
      window.addEventListener('storage', handleStorage)
    }

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('ictu_avatar_changed', handleAvatarChange)
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [loadData])

  // Đếm số lượng theo trạng thái
  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r) => r.status === 'pending').length
    const approved = requests.filter((r) => r.status === 'approved').length
    const rejected = requests.filter((r) => r.status === 'rejected').length
    return { total, pending, approved, rejected }
  }, [requests])

  useEffect(() => {
    if (onPendingCountChange) {
      onPendingCountChange(stats.pending)
    }
  }, [stats.pending, onPendingCountChange])

  // Lọc danh sách
  const filteredRequests = useMemo(() => {
    let list = requests
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (r) =>
          (r.id && r.id.toLowerCase().includes(q)) ||
          (r.requestCode && r.requestCode.toLowerCase().includes(q)) ||
          (r.internName && r.internName.toLowerCase().includes(q)) ||
          (r.internCode && r.internCode.toLowerCase().includes(q)) ||
          (r.type && r.type.toLowerCase().includes(q)) ||
          (r.reason && r.reason.toLowerCase().includes(q)),
      )
    }
    return list
  }, [requests, statusFilter, searchQuery])

  // Mở modal thao tác
  function handleOpenAction(item, mode) {
    if ((item.status === 'approved' || item.status === 'rejected') && mode !== 'view') {
      showToast(`Đơn xin nghỉ [${item.requestCode || item.id}] đã được ${item.status === 'approved' ? 'duyệt' : 'từ chối'}, không thể thao tác lại.`, 'error')
      return
    }

    let defaultFeedback
    if (mode === 'approve') {
      defaultFeedback = 'Đã duyệt đơn nghỉ phép. Chúc sinh viên hoàn thành tốt công việc sau khi trở lại.'
    } else if (mode === 'reject') {
      defaultFeedback = 'Đơn xin nghỉ phép chưa được phê duyệt do yêu cầu tiến độ dự án.'
    } else {
      defaultFeedback = item.feedback || ''
    }

    setActiveModal({ mode, item })
    setModalFeedback(defaultFeedback)
    setModalError('')
  }

  function handleCloseModal() {
    setActiveModal(null)
    setModalFeedback('')
    setModalError('')
    setSubmitting(false)
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!activeModal) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [activeModal])

  // ESC key listener to close modal
  useEffect(() => {
    if (!activeModal) return
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !submitting) {
        handleCloseModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModal, submitting])

  // Xác nhận Duyệt hoặc Từ chối
  async function handleSubmitAction(e) {
    e.preventDefault()
    if (!activeModal || !activeModal.item) return

    const { mode, item } = activeModal
    const targetId = item.requestCode || item.id

    if (mode === 'reject' && !modalFeedback.trim()) {
      setModalError('Vui lòng nhập lý do từ chối để thông báo cho thực tập sinh biết!')
      return
    }

    setSubmitting(true)
    setModalError('')

    try {
      const feedbackText = modalFeedback.trim()
      let res
      if (mode === 'approve') {
        res = await approveLeaveRequest(targetId, feedbackText)
      } else {
        res = await rejectLeaveRequest(targetId, feedbackText)
      }

      const nextStatus = mode === 'approve' ? 'approved' : 'rejected'
      const nextLabel = mode === 'approve' ? 'Đã duyệt' : 'Từ chối'

      // Cập nhật state nội bộ
      const updatedList = requests.map((r) => {
        if ((r.requestCode || r.id) === targetId) {
          return {
            ...r,
            status: nextStatus,
            statusLabel: nextLabel,
            approver: 'Hr',
            feedback: feedbackText,
            reviewedAt: new Date().toLocaleString('vi-VN'),
          }
        }
        return r
      })

      setRequests(updatedList)

      // Đồng bộ vào localStorage cho phân hệ TTS
      try {
        localStorage.setItem('intern_leave_requests_v1', JSON.stringify(updatedList))
      } catch {}

      // Phát sự kiện realtime đồng bộ liên Portal (HR -> TTS & Mentor)
      emitRealtimeEvent('SYNC_LEAVE_STATUS_CHANGED', {
        id: targetId,
        status: nextStatus,
        feedback: feedbackText,
      })
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('intern_data_sync_event'))

      showToast(
        mode === 'approve'
          ? `Đã phê duyệt đơn xin nghỉ [${targetId}]. Thực tập sinh đã được thông báo!`
          : `Đã từ chối đơn xin nghỉ [${targetId}]. Lý do từ chối đã được gửi tới thực tập sinh.`,
        mode === 'approve' ? 'success' : 'error',
      )

      handleCloseModal()
    } catch (err) {
      setModalError(err.message || 'Lỗi khi gửi yêu cầu. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="leave-mgmt-container">
      {/* Toast thông báo */}
      {toast && (
        <div className={`leave-toast leave-toast--${toast.type}`} role="status">
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 4 Thẻ Thống kê nhanh */}
      <section className="leave-kpi-grid">
        <div className="leave-kpi-card" onClick={() => setStatusFilter('all')}>
          <div className="leave-kpi-header">
            <span className="leave-kpi-title">Tổng số đơn xin nghỉ</span>
            <div className="leave-kpi-icon-wrap leave-kpi-icon-wrap--blue">
              <Calendar size={18} />
            </div>
          </div>
          <span className="leave-kpi-val">{stats.total}</span>
          <span className="leave-kpi-hint">Toàn bộ lịch sử các kỳ</span>
        </div>

        <div className="leave-kpi-card" onClick={() => setStatusFilter('pending')}>
          <div className="leave-kpi-header">
            <span className="leave-kpi-title">Đơn đang chờ duyệt</span>
            <div className="leave-kpi-icon-wrap leave-kpi-icon-wrap--amber">
              <Clock size={18} />
            </div>
          </div>
          <span className="leave-kpi-val" style={{ color: '#D97706' }}>
            {stats.pending}
          </span>
          <span className="leave-kpi-hint">
            {stats.pending > 0 ? 'Cần HR phản hồi sớm' : 'Đã xử lý hết đơn'}
          </span>
        </div>

        <div className="leave-kpi-card" onClick={() => setStatusFilter('approved')}>
          <div className="leave-kpi-header">
            <span className="leave-kpi-title">Đơn đã phê duyệt</span>
            <div className="leave-kpi-icon-wrap leave-kpi-icon-wrap--green">
              <CheckCircle size={18} />
            </div>
          </div>
          <span className="leave-kpi-val" style={{ color: '#16A34A' }}>
            {stats.approved}
          </span>
          <span className="leave-kpi-hint">Đã chấp thuận nghỉ phép</span>
        </div>

        <div className="leave-kpi-card" onClick={() => setStatusFilter('rejected')}>
          <div className="leave-kpi-header">
            <span className="leave-kpi-title">Đơn đã từ chối</span>
            <div className="leave-kpi-icon-wrap leave-kpi-icon-wrap--red">
              <XCircle size={18} />
            </div>
          </div>
          <span className="leave-kpi-val" style={{ color: '#DC2626' }}>
            {stats.rejected}
          </span>
          <span className="leave-kpi-hint">Không đủ điều kiện / chưa duyệt</span>
        </div>
      </section>

      {/* Toolbar Tìm kiếm & Bộ lọc */}
      <section className="leave-panel">
        <div className="leave-panel-toolbar">
          <div className="leave-search-wrap">
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, họ tên TTS, mã SV, loại nghỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="leave-search-input"
            />
          </div>

          <div className="leave-filter-group">
            <Filter size={14} color="#64748B" />
            <select
              className="leave-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái ({stats.total})</option>
              <option value="pending">Chờ phê duyệt ({stats.pending})</option>
              <option value="approved">Đã phê duyệt ({stats.approved})</option>
              <option value="rejected">Đã từ chối ({stats.rejected})</option>
            </select>
          </div>
        </div>

        {/* Bảng Danh sách lịch sử đơn xin nghỉ */}
        <div className="leave-table-wrapper">
          <table className="leave-table">
            <thead>
              <tr>
                <th className="th-leave-code" style={{ width: '85px', textAlign: 'center' }}>Mã đơn</th>
                <th className="th-leave-intern" style={{ width: '160px' }}>Thực tập sinh</th>
                <th className="th-leave-type" style={{ width: '130px' }}>Loại nghỉ</th>
                <th className="th-leave-dates" style={{ width: '145px' }}>Thời gian nghỉ</th>
                <th className="th-leave-status" style={{ width: '110px', textAlign: 'center' }}>Trạng thái</th>
                <th className="th-leave-actions" style={{ width: '175px', textAlign: 'center' }}>Thao tác</th>
                <th className="th-leave-reason" style={{ width: '165px' }}>Lý do xin nghỉ</th>
                <th className="th-leave-created" style={{ width: '90px', textAlign: 'center' }}>Ngày nộp</th>
                <th className="th-leave-feedback" style={{ width: '165px' }}>Phản hồi của HR</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    Đang tải danh sách đơn xin nghỉ phép...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    Không tìm thấy đơn xin nghỉ phép nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const reqId = req.requestCode || req.id
                  const isPending = req.status === 'pending'
                  const isApproved = req.status === 'approved'
                  const isRejected = req.status === 'rejected'

                  return (
                    <tr
                      key={reqId}
                      className={isRejected ? 'leave-row--rejected' : ''}
                    >
                      {/* 1. Mã đơn */}
                      <td className="td-leave-code" style={{ textAlign: 'center' }}>
                        <span className="leave-code-tag">{reqId}</span>
                      </td>

                      {/* 2. Thực tập sinh */}
                      <td className="td-leave-intern">
                        <div className="leave-intern-cell">
                          <div className="leave-avatar">
                            {(req.avatar || getSavedAvatar(req.internEmail, req.internId, req.internName)) ? (
                              <img
                                src={req.avatar || getSavedAvatar(req.internEmail, req.internId, req.internName)}
                                alt=""
                                className="leave-avatar-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'
                                }}
                              />
                            ) : null}
                            <span style={{ display: (req.avatar || getSavedAvatar(req.internEmail, req.internId, req.internName)) ? 'none' : 'inline' }}>
                              {getInitialLetter(req.internName)}
                            </span>
                          </div>
                          <div className="leave-intern-meta">
                            <span className="leave-intern-name">{req.internName || 'TTS'}</span>
                            <span className="leave-intern-code">{req.internCode || 'TTS0001'}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Loại nghỉ */}
                      <td className="td-leave-type">
                        <span className="leave-type-tag">{req.type}</span>
                      </td>

                      {/* 4. Thời gian nghỉ */}
                      <td className="td-leave-dates">
                        <div className="leave-date-cell">
                          <span className="leave-date-text">
                            {req.startDate === req.endDate
                              ? req.startDate
                              : `${req.startDate} → ${req.endDate}`}
                          </span>
                          <span className="leave-session-text">
                            {req.session || req.duration} ({req.duration})
                          </span>
                        </div>
                      </td>

                      {/* 5. Trạng thái */}
                      <td className="td-leave-status" style={{ textAlign: 'center' }}>
                        {isPending && (
                          <span className="leave-badge leave-badge--pending">
                            <Clock size={11} />
                            <span>Chờ duyệt</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="leave-badge leave-badge--approved">
                            <CheckCircle size={11} />
                            <span>Đã duyệt</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="leave-badge leave-badge--rejected">
                            <XCircle size={11} />
                            <span>Từ chối</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Thao tác (Chứa 2 nút Duyệt & Từ chối) */}
                      <td className="td-leave-actions" style={{ textAlign: 'center' }}>
                        <div className="leave-actions-cell">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                className="leave-btn leave-btn--approve"
                                onClick={() => handleOpenAction(req, 'approve')}
                                title="Phê duyệt đơn xin nghỉ này"
                              >
                                <Check size={13} />
                                <span>Duyệt</span>
                              </button>
                              <button
                                type="button"
                                className="leave-btn leave-btn--reject"
                                onClick={() => handleOpenAction(req, 'reject')}
                                title="Từ chối đơn xin nghỉ này"
                              >
                                <X size={13} />
                                <span>Từ chối</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={`leave-btn leave-btn--view ${isApproved ? 'leave-btn--view-approved' : 'leave-btn--view-rejected'}`}
                              onClick={() => handleOpenAction(req, 'view')}
                              title="Xem chi tiết đơn và phản hồi"
                            >
                              {isApproved ? <CheckCircle size={13} /> : <XCircle size={13} />}
                              <span>{isApproved ? 'Đã duyệt' : 'Đã từ chối'}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 7. Lý do xin nghỉ */}
                      <td className="td-leave-reason">
                        <p className="leave-reason-text" title={req.reason}>
                          {req.reason}
                        </p>
                      </td>

                      {/* 8. Ngày nộp */}
                      <td className="td-leave-created" style={{ textAlign: 'center' }}>
                        <span className="leave-created-date">{req.createdDate}</span>
                      </td>

                      {/* 9. Phản hồi của HR */}
                      <td className="td-leave-feedback">
                        <div className="leave-feedback-cell">
                          {isPending ? (
                            <span className="leave-feedback-muted">Chờ HR xem xét & phản hồi</span>
                          ) : (
                            <>
                              <span className="leave-feedback-approver">Người duyệt: {req.approver || 'Hr'}</span>
                              <span className="leave-feedback-text" title={req.feedback}>
                                {req.feedback || 'Không có ghi chú'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Duyệt / Từ chối / Xem chi tiết */}
      {activeModal && activeModal.item && (
        <div className="leave-modal-backdrop" onClick={handleCloseModal}>
          <div
            className="leave-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="leave-modal-header">
              <div className="leave-modal-title">
                {activeModal.mode === 'approve' && <CheckCircle size={20} color="#16A34A" />}
                {activeModal.mode === 'reject' && <XCircle size={20} color="#DC2626" />}
                {activeModal.mode === 'view' && <Eye size={20} color="#2563EB" />}
                <h3>
                  {activeModal.mode === 'approve' && 'Phê duyệt đơn xin nghỉ phép'}
                  {activeModal.mode === 'reject' && 'Từ chối đơn xin nghỉ phép'}
                  {activeModal.mode === 'view' && 'Chi tiết đơn xin nghỉ phép'}
                  <span className="leave-modal-badge">{activeModal.item.requestCode || activeModal.item.id}</span>
                </h3>
              </div>
              <button
                type="button"
                className="leave-modal-close"
                onClick={handleCloseModal}
                aria-label="Đóng modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAction}>
              <div className="leave-modal-body">
                {modalError && (
                  <div className="leave-modal-error">
                    <AlertCircle size={15} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Thông tin TTS & Đơn xin nghỉ */}
                <div className="leave-detail-box">
                  <div className="leave-detail-row">
                    <span className="leave-detail-label">Thực tập sinh:</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <div className="leave-avatar" style={{ width: 24, height: 24, fontSize: '11px', borderRadius: '6px' }}>
                        {(activeModal.item.avatar || getSavedAvatar(activeModal.item.internEmail, activeModal.item.internId, activeModal.item.internName)) ? (
                          <img
                            src={activeModal.item.avatar || getSavedAvatar(activeModal.item.internEmail, activeModal.item.internId, activeModal.item.internName)}
                            alt=""
                            className="leave-avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'
                            }}
                          />
                        ) : null}
                        <span style={{ display: (activeModal.item.avatar || getSavedAvatar(activeModal.item.internEmail, activeModal.item.internId, activeModal.item.internName)) ? 'none' : 'inline' }}>
                          {getInitialLetter(activeModal.item.internName)}
                        </span>
                      </div>
                      <strong className="leave-detail-val">
                        {activeModal.item.internName} ({activeModal.item.internCode})
                      </strong>
                    </div>
                  </div>
                  <div className="leave-detail-row">
                    <span className="leave-detail-label">Loại nghỉ phép:</span>
                    <span className="leave-detail-val">{activeModal.item.type}</span>
                  </div>
                  <div className="leave-detail-row">
                    <span className="leave-detail-label">Thời gian:</span>
                    <span className="leave-detail-val">
                      {activeModal.item.startDate === activeModal.item.endDate
                        ? activeModal.item.startDate
                        : `${activeModal.item.startDate} → ${activeModal.item.endDate}`}{' '}
                      - {activeModal.item.session} ({activeModal.item.duration})
                    </span>
                  </div>
                  <div className="leave-detail-row">
                    <span className="leave-detail-label">Lý do xin nghỉ:</span>
                    <p className="leave-detail-val leave-detail-reason">
                      {activeModal.item.reason}
                    </p>
                  </div>
                </div>

                {/* Phản hồi của HR */}
                <div className="leave-form-group">
                  <label htmlFor="leave-feedback-input" className="leave-form-label">
                    <MessageSquare size={14} />
                    <span>
                      {activeModal.mode === 'approve' && 'Ý kiến phê duyệt / Lời nhắn gửi TTS:'}
                      {activeModal.mode === 'reject' && 'Lý do từ chối (bắt buộc thông báo cho TTS):'}
                      {activeModal.mode === 'view' && 'Phản hồi của HR:'}
                    </span>
                  </label>
                  <textarea
                    id="leave-feedback-input"
                    rows="3"
                    className="leave-form-textarea"
                    placeholder={
                      activeModal.mode === 'reject'
                        ? 'Nhập lý do từ chối để thực tập sinh nắm được thông tin...'
                        : 'Nhập ghi chú hoặc lời dặn dò cho thực tập sinh...'
                    }
                    value={modalFeedback}
                    onChange={(e) => setModalFeedback(e.target.value)}
                    readOnly={activeModal.mode === 'view'}
                    disabled={activeModal.mode === 'view'}
                  />
                  {activeModal.mode !== 'view' && (
                    <span className="leave-form-hint">
                      Phản hồi này sẽ được lưu vào hệ thống và hiển thị trực tiếp trên trang Chấm công của TTS.
                    </span>
                  )}
                </div>
              </div>

              <div className="leave-modal-footer">
                <button
                  type="button"
                  className="leave-modal-btn leave-modal-btn--cancel"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Đóng
                </button>

                {activeModal.mode === 'approve' && (
                  <button
                    type="submit"
                    className="leave-modal-btn leave-modal-btn--confirm-approve"
                    disabled={submitting}
                  >
                    <Check size={14} />
                    <span>{submitting ? 'Đang duyệt...' : 'Xác nhận Duyệt đơn'}</span>
                  </button>
                )}

                {activeModal.mode === 'reject' && (
                  <button
                    type="submit"
                    className="leave-modal-btn leave-modal-btn--confirm-reject"
                    disabled={submitting}
                  >
                    <X size={14} />
                    <span>{submitting ? 'Đang từ chối...' : 'Xác nhận Từ chối đơn'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
