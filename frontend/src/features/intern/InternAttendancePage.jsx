import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useInternMetrics, notifyInternDataChanged, formatVND, getStoredAttendanceHistory, getStoredLeaves } from './utils/internMetrics'
import { emitRealtimeEvent, subscribeRealtimeEvents, SYNC_EVENTS } from '../../utils/realtimeSync'
import { fetchInternLeaveRequests, createLeaveRequest } from '../../api/operations'
import { getSavedAvatar } from '../../utils/avatarHelper'
import './InternDashboardPage.css'
import './InternAttendancePage.css'

function getTodayDateOnly() {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const INITIAL_LEAVE_REQUESTS = [
  {
    id: 'NP-001',
    type: 'Nghỉ thi học phần',
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    session: 'Buổi chiều (13:30 - 17:30)',
    duration: '0.5 ngày',
    reason: 'Thi kết thúc học phần Cơ sở dữ liệu nâng cao tại trường Đại học CNTT & TT (ICTU).',
    createdDate: '24/09/2026',
    status: 'approved',
    approver: 'Hr',
    feedback: 'Đã duyệt nghỉ phép. Chúc sinh viên thi tốt.',
  },
  {
    id: 'NP-002',
    type: 'Nghỉ việc cá nhân',
    startDate: '2026-09-12',
    endDate: '2026-09-12',
    session: 'Cả ngày (08:15 - 17:30)',
    duration: '1.0 ngày',
    reason: 'Có việc gia đình đột xuất tại quê Hải Dương.',
    createdDate: '10/09/2026',
    status: 'approved',
    approver: 'Hr',
    feedback: 'Đã duyệt đơn nghỉ phép. Sau khi trở lại trung tâm tiếp tục theo dõi tiến độ công việc.',
  },
  {
    id: 'NP-003',
    type: 'Nghỉ ốm / Khám bệnh',
    startDate: '2026-10-06',
    endDate: '2026-10-06',
    session: 'Buổi sáng (08:15 - 12:00)',
    duration: '0.5 ngày',
    reason: 'Đi khám sức khỏe định kỳ theo lịch tại Bệnh viện Đại học Y Dược.',
    createdDate: '01/10/2026',
    status: 'pending',
    approver: 'Chờ duyệt',
    feedback: 'Đang chuyển đơn tới Phòng Nhân sự (Hr) xem xét & phê duyệt.',
  },
]

export function formatApproverName(approver) {
  if (!approver || approver === 'Chờ duyệt' || approver.includes('Chờ')) return 'Chờ duyệt'
  const lower = String(approver).toLowerCase()
  if (lower.includes('hr') || approver.includes('Mai') || lower.includes('nhân sự') || lower.includes('mentor')) return 'Hr'
  if (lower.includes('admin')) return 'Admin'
  return 'Hr'
}

function calculateWorkDuration(checkInStr, checkOutStr, checkInTs, checkOutTs) {
  if (!checkInStr || checkInStr === '--:--') return '--'
  if (!checkOutStr || checkOutStr === '--:--') return 'Đang làm việc'

  let diffSeconds = 0

  if (checkInTs && checkOutTs && checkOutTs >= checkInTs) {
    diffSeconds = Math.floor((checkOutTs - checkInTs) / 1000)
  } else {
    const [h1, m1, s1 = 0] = checkInStr.split(':').map(Number)
    const [h2, m2, s2 = 0] = checkOutStr.split(':').map(Number)
    if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
      const sec1 = h1 * 3600 + m1 * 60 + s1
      const sec2 = h2 * 3600 + m2 * 60 + s2
      diffSeconds = Math.max(0, sec2 - sec1)
    }
  }

  // Nếu thời gian làm việc trên 5 tiếng (qua giờ nghỉ trưa), trừ 1 giờ nghỉ trưa theo chuẩn ICTU
  if (diffSeconds >= 5 * 3600) {
    diffSeconds -= 3600
  }

  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60

  if (hours > 0) {
    return `${hours} giờ ${minutes < 10 ? '0' + minutes : minutes} phút`
  }
  if (minutes > 0) {
    return `${minutes} phút ${seconds > 0 ? `${seconds} giây` : ''}`.trim()
  }
  return `${seconds > 0 ? `${seconds} giây` : '1 phút'}`
}

function renderDateCell(dateString) {
  const match = dateString?.match(/^(.*?)\s*\(.*?\)$/)
  const cleanDate = match ? match[1] : dateString
  return <span className="att-date-num">{cleanDate}</span>
}

function getStatusBadgeClass(item) {
  const status = item?.status?.toLowerCase() || ''
  const label = item?.status_label?.toLowerCase() || ''

  // Không check in -> Báo Đỏ
  if (
    status === 'absent' ||
    status === 'not_checked_in' ||
    status === 'no_checkin' ||
    label.includes('không check') ||
    label.includes('chưa check') ||
    label.includes('vắng') ||
    (!item?.check_in || item?.check_in === '--:--')
  ) {
    return 'att-status-badge--absent'
  }

  // Đi muộn -> Báo Vàng
  if (status === 'late' || label.includes('muộn') || label.includes('trễ')) {
    return 'att-status-badge--late'
  }

  // Đúng giờ -> Báo Xanh biển
  return 'att-status-badge--ontime'
}

export default function InternAttendancePage() {
  const { user } = useAuth()
  const { metrics, refreshMetrics } = useInternMetrics(user)
  const [toast, setToast] = useState(null)
  const [leaveModal, setLeaveModal] = useState(false)
  const [rulesModal, setRulesModal] = useState(false)
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

  // Khóa scroll body và bắt sự kiện phím ESC khi mở modal
  useEffect(() => {
    const isAnyModalOpen = rulesModal || leaveModal || Boolean(selectedLeaveDetail)
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (rulesModal) setRulesModal(false)
          if (leaveModal) setLeaveModal(false)
          if (selectedLeaveDetail) setSelectedLeaveDetail(null)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = prevOverflow
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [rulesModal, leaveModal, selectedLeaveDetail])
  const [history, setHistory] = useState(() => {
    const list = getStoredAttendanceHistory(user)
    return list.map((item) => {
      if (item.total_hours === 'Đã hoàn thành ca' || !item.total_hours) {
        const calculated = calculateWorkDuration(
          item.check_in,
          item.check_out,
          item.checkInTs,
          item.checkOutTs
        )
        return { ...item, total_hours: calculated }
      }
      return item
    })
  })

  // Đồng bộ danh sách chấm công khi có cập nhật mới
  useEffect(() => {
    const updateList = () => {
      const list = getStoredAttendanceHistory()
      setHistory(
        list.map((item) => {
          if (item.total_hours === 'Đã hoàn thành ca' || !item.total_hours) {
            const calculated = calculateWorkDuration(
              item.check_in,
              item.check_out,
              item.checkInTs,
              item.checkOutTs
            )
            return { ...item, total_hours: calculated }
          }
          return item
        })
      )
    }
    const unsubscribe = subscribeRealtimeEvents((event) => {
      if (
        event?.type === SYNC_EVENTS.ATTENDANCE_APPROVED ||
        event?.type === SYNC_EVENTS.ATTENDANCE_CHECKED_IN ||
        event?.type === SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED
      ) {
        updateList()
      }

      if (
        event?.type === 'SYNC_LEAVE_STATUS_CHANGED' ||
        event?.type === SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED ||
        event?.type === 'SYNC_LEAVE_REQUEST_SUBMITTED'
      ) {
        if (event?.payload?.id && event?.payload?.status) {
          const targetId = event.payload.id
          const newStatus = event.payload.status
          const newFeedback = event.payload.feedback || ''

          setLeaveRequests((prev) => {
            const next = prev.map((item) =>
              (item.id === targetId || item.requestCode === targetId)
                ? {
                    ...item,
                    status: newStatus,
                    statusLabel: newStatus === 'approved' ? 'Đã duyệt' : 'Từ chối',
                    approver: 'Hr',
                    feedback: newFeedback || item.feedback,
                  }
                : item
            )
            try {
              localStorage.setItem('intern_leave_requests_v1', JSON.stringify(next))
            } catch {}
            return next
          })

          setSelectedLeaveDetail((prev) => {
            if (prev && (prev.id === targetId || prev.requestCode === targetId)) {
              return {
                ...prev,
                status: newStatus,
                statusLabel: newStatus === 'approved' ? 'Đã duyệt' : 'Từ chối',
                approver: 'Hr',
                feedback: newFeedback || prev.feedback,
              }
            }
            return prev
          })

          if (newStatus === 'approved') {
            showToast(`🎉 Phòng Nhân sự (Hr) đã DUYỆT đơn xin nghỉ phép [${targetId}] của bạn!`)
          } else if (newStatus === 'rejected') {
            showToast(`⚠️ Phòng Nhân sự (Hr) đã TỪ CHỐI đơn xin nghỉ phép [${targetId}]. Hãy xem phản hồi của HR.`, 'error')
          }
        }
      }
    })
    window.addEventListener('intern_data_sync_event', updateList)
    window.addEventListener('storage', updateList)
    return () => {
      unsubscribe()
      window.removeEventListener('intern_data_sync_event', updateList)
      window.removeEventListener('storage', updateList)
    }
  }, [])

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── QUẢN LÝ NGHỈ PHÉP (Story 5) ──
  const [activeTab, setActiveTab] = useState('attendance') // 'attendance' | 'leave'
  const [leaveRequests, setLeaveRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('intern_leave_requests_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((item) => {
            const approver = item.status === 'approved' ? 'Hr' : formatApproverName(item.approver)
            const feedback = (item.feedback && item.feedback.includes('Mentor'))
              ? item.feedback.replace(/và Mentor phụ trách/g, '').replace(/Mentor phụ trách/g, 'Phòng Nhân sự (Hr)').replace(/Mentor/g, 'Hr')
              : item.feedback
            return {
              ...item,
              id: item.id ? item.id.replace('2026-', '') : item.id,
              targetApprover: 'hr',
              approver,
              feedback,
            }
          })
          try {
            localStorage.setItem('intern_leave_requests_v1', JSON.stringify(sanitized))
          } catch {
            // ignore
          }
          return sanitized
        }
      }
    } catch {
      // fallback
    }
    return getStoredLeaves(user)
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('intern_leave_requests_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((item) => {
            const approver = item.status === 'approved' ? 'Hr' : formatApproverName(item.approver)
            const feedback = (item.feedback && item.feedback.includes('Mentor'))
              ? item.feedback.replace(/và Mentor phụ trách/g, '').replace(/Mentor phụ trách/g, 'Phòng Nhân sự (Hr)').replace(/Mentor/g, 'Hr')
              : item.feedback
            return {
              ...item,
              id: item.requestCode || (item.id ? item.id.replace('2026-', '') : item.id),
              targetApprover: 'hr',
              approver,
              feedback,
            }
          })
          localStorage.setItem('intern_leave_requests_v1', JSON.stringify(sanitized))
          setLeaveRequests(sanitized)
        }
      }
    } catch {
      // ignore
    }

    async function loadApiLeaves() {
      try {
        const res = await fetchInternLeaveRequests()
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          const formatted = res.data.map((item) => {
            const approver = item.status === 'approved' ? 'Hr' : formatApproverName(item.approver)
            return {
              ...item,
              id: item.requestCode || item.id,
              targetApprover: 'hr',
              approver,
              feedback: item.feedback || '',
            }
          })
          setLeaveRequests(formatted)
          try {
            localStorage.setItem('intern_leave_requests_v1', JSON.stringify(formatted))
          } catch {}
        }
      } catch {
        // fallback to localStorage/mock
      }
    }
    loadApiLeaves()
  }, [])
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null)
  const [leaveForm, setLeaveForm] = useState({
    type: 'Nghỉ thi học phần',
    startDate: '',
    endDate: '',
    session: 'Cả ngày (08:15 - 17:30)',
    reason: '',
  })
  const [leaveError, setLeaveError] = useState('')

  async function handleCreateLeaveRequest(e) {
    e.preventDefault()
    setLeaveError('')

    if (!leaveForm.startDate || !leaveForm.endDate) {
      setLeaveError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc!')
      return
    }
    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
      setLeaveError('Ngày kết thúc không được trước ngày bắt đầu nghỉ!')
      return
    }
    if (!leaveForm.reason.trim() || leaveForm.reason.trim().length < 5) {
      setLeaveError('Vui lòng nhập lý do xin nghỉ rõ ràng (tối thiểu 5 ký tự)!')
      return
    }

    const start = new Date(leaveForm.startDate)
    const end = new Date(leaveForm.endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    const durationLabel = leaveForm.session.includes('Buổi') ? '0.5 ngày' : `${diffDays}.0 ngày`

    const senderFullName = user?.role === 'intern' ? (user?.full_name || 'TTS') : 'TTS'
    const senderCode = user?.role === 'intern' ? (user?.code || 'TTS0001') : 'TTS0001'
    const senderEmail = user?.email || 'intern@ictu.edu.vn'
    const senderId = user?.id || 5
    const senderAvatar = user?.avatar || getSavedAvatar(senderEmail, senderId, senderFullName)

    const newReq = {
      id: `NP-${String(leaveRequests.length + 1).padStart(3, '0')}`,
      requestCode: `NP-${String(leaveRequests.length + 1).padStart(3, '0')}`,
      internName: senderFullName,
      internCode: senderCode,
      internEmail: senderEmail,
      internId: senderId,
      avatar: senderAvatar,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      session: leaveForm.session,
      duration: durationLabel,
      reason: leaveForm.reason.trim(),
      createdDate: getTodayDateOnly(),
      status: 'pending',
      statusLabel: 'Chờ duyệt',
      targetApprover: 'hr',
      approver: 'Chờ duyệt',
      feedback: 'Đang chuyển đơn tới Phòng Nhân sự (Hr) xem xét & phê duyệt.',
    }

    setIsSubmittingLeave(true)
    const updated = [newReq, ...leaveRequests]
    setLeaveRequests(updated)
    try {
      localStorage.setItem('intern_leave_requests_v1', JSON.stringify(updated))
    } catch {
      // fallback
    }
    notifyInternDataChanged()
    refreshMetrics()

    // Gửi lên Backend API để lưu vào CSDL
    try {
      await createLeaveRequest({
        request_code: newReq.id,
        intern_name: senderFullName,
        intern_code: senderCode,
        intern_email: senderEmail,
        intern_id: senderId,
        type: newReq.type,
        start_date: newReq.startDate,
        end_date: newReq.endDate,
        session: newReq.session,
        duration: newReq.duration,
        reason: newReq.reason,
      }).catch(() => {})
    } catch {
      // ignore
    } finally {
      setIsSubmittingLeave(false)
    }

    // Phát sự kiện Realtime Sync báo cho HR Portal
    emitRealtimeEvent(SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED, { leaveRequest: newReq })

    setLeaveModal(false)
    setLeaveForm({
      type: 'Nghỉ thi học phần',
      startDate: '',
      endDate: '',
      session: 'Cả ngày (08:15 - 17:30)',
      reason: '',
    })
    setActiveTab('leave')
    showToast(`✓ Đã gửi đơn xin nghỉ phép ${newReq.id} thành công!`)
  }

  // Hủy/xóa đơn xin nghỉ phép khi chưa được duyệt
  const handleDeleteLeave = (id, e) => {
    if (e) e.stopPropagation()
    const req = leaveRequests.find((r) => r.id === id)
    if (!req) return

    if (req.status === 'approved') {
      showToast('Đơn xin nghỉ phép đã được phê duyệt, không thể xóa.', 'error')
      return
    }

    if (window.confirm(`Bạn có chắc chắn muốn hủy / xóa đơn xin nghỉ phép [${req.id}] (${req.type}) không?`)) {
      const next = leaveRequests.filter((r) => r.id !== id)
      setLeaveRequests(next)
      try {
        localStorage.setItem('intern_leave_requests_v1', JSON.stringify(next))
      } catch {
        // ignore
      }
      notifyInternDataChanged()
      refreshMetrics()
      emitRealtimeEvent(SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED, { leaveRequestId: id, deleted: true })
      if (selectedLeaveDetail?.id === id) {
        setSelectedLeaveDetail(null)
      }
      showToast(`✓ Đã xóa đơn xin nghỉ phép [${req.id}] thành công!`)
    }
  }



  return (
    <div className="intern-dashboard-container att-page-container">
      {/* Toast thông báo */}
      {toast && (
        <div className={`intern-toast intern-toast--${toast.type}`} role="alert">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── BANNER TIÊU ĐỀ TRANG ── */}
      <header className="intern-top-banner">
        <div className="intern-top-banner-main">
          {/* Phía bên trái: Tiêu đề Chấm công hàng ngày và mô tả */}
          <div className="intern-welcome-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div className="intern-welcome-title-row" style={{ margin: 0 }}>
              <h1>Lịch sử chấm công - nghỉ phép</h1>
              <span className="intern-badge-official">AI Camera & Vân tay</span>
            </div>
            <p className="intern-welcome-sub" style={{ margin: 0 }}>
              Ghi nhận thời gian làm việc tự động tại Trung tâm Công nghệ & Phần mềm ICTU.
            </p>
          </div>

          {/* Phía bên phải: Cụm chức năng (Quy định công việc & Xin nghỉ phép) - Check-in/Check-out đã tích hợp vào Dashboard */}
          <div
            className="intern-action-cluster"
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {/* Quy định công việc */}
            <button
              type="button"
              className="intern-btn intern-btn--outline"
              onClick={() => setRulesModal(true)}
              title="Xem quy định chấm công và khung giờ làm việc chuẩn tại ICTU"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Quy định công việc</span>
            </button>

            {/* Tạo đơn xin nghỉ phép mới */}
            <button
              type="button"
              className="intern-btn intern-btn--primary"
              onClick={() => {
                setLeaveError('')
                setLeaveModal(true)
              }}
              title="Tạo đơn xin nghỉ phép trực tuyến mới"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Tạo đơn xin nghỉ phép mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── CÁC THẺ CHỈ SỐ TỔNG HỢP CHẤM CÔNG THÁNG 10/2026 (TỰ ĐỘNG LIÊN KẾT) ── */}
      <section className="att-kpi-summary-grid" aria-label="Chỉ số chấm công tháng 10">
        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Ngày công thực tế (T10/2026)</span>
            <div className="att-kpi-value">
              {metrics.actualWorkDays} <span className="att-kpi-unit">/ {metrics.standardWorkDays} ngày</span>
            </div>
            <span className="att-kpi-sub">Tỷ lệ chuyên cần đạt {metrics.attendanceRate}% chuẩn ICTU</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Đi muộn / Trễ giờ</span>
            <div className="att-kpi-value">
              {metrics.lateDays} <span className="att-kpi-unit">lần</span>
            </div>
            <span className="att-kpi-sub">
              {metrics.lateDays > 0 ? `Khấu trừ ${formatVND(metrics.deductionAmount)} vào phiếu lương` : 'Không có vi phạm giờ giấc'}
            </span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Nghỉ phép đã duyệt</span>
            <div className="att-kpi-value">
              {metrics.approvedLeaveDays} <span className="att-kpi-unit">ngày</span>
            </div>
            <span className="att-kpi-sub">Phòng Nhân sự (HR) phê duyệt</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Trợ cấp ăn trưa tích lũy</span>
            <div className="att-kpi-value">{formatVND(metrics.lunchAllowance)}</div>
            <span className="att-kpi-sub">{metrics.actualWorkDays} ngày công x 30.000 ₫/ngày</span>
          </div>
        </div>
      </section>

      {/* ── THANH CHUYỂN TAB: CHẤM CÔNG & NGHỈ PHÉP (Story 5) ── */}
      <div className="att-tab-switcher">
        <button
          type="button"
          className={`att-tab-btn ${activeTab === 'attendance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Lịch sử chấm công hàng ngày</span>
        </button>

        <button
          type="button"
          className={`att-tab-btn ${activeTab === 'leave' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('leave')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Lịch sử đơn xin nghỉ phép</span>
        </button>
      </div>

      {/* ── TAB 1: BẢNG LỊCH SỬ CHẤM CÔNG HÀNG NGÀY ── */}
      {activeTab === 'attendance' && (
        <section className="att-panel">
          <div className="att-panel-header">
            <div className="att-panel-title-group">
              <h2 className="att-panel-title">Lịch sử chấm công</h2>
            </div>
          </div>

        <div className="att-table-wrapper">
          <table className="att-table">
            <thead>
              <tr>
                <th>Ngày làm việc</th>
                <th>Giờ Check-in</th>
                <th>Giờ Check-out</th>
                <th>Tổng thời gian</th>
                <th>Thiết bị ghi nhận</th>
                <th>Ghi chú / Công việc</th>
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  {/* Cột 1: Ngày làm việc */}
                  <td>{renderDateCell(item.date)}</td>

                  {/* Cột 2: Check-in */}
                  <td>
                    <span className="att-time-cell">
                      <span className="att-time-dot att-time-dot--in" title="Giờ vào ca" />
                      <span>{item.check_in}</span>
                    </span>
                  </td>

                  {/* Cột 3: Check-out */}
                  <td>
                    {item.check_out && item.check_out !== '--:--' ? (
                      <span className="att-time-cell">
                        <span className="att-time-dot att-time-dot--out" title="Giờ tan ca" />
                        <span>{item.check_out}</span>
                      </span>
                    ) : (
                      <span className="att-time-dash">--:--</span>
                    )}
                  </td>

                  {/* Cột 4: Tổng thời gian */}
                  <td>
                    {item.total_hours === 'Đang làm việc' || (!item.check_out || item.check_out === '--:--') ? (
                      <span className="att-duration-badge--working">
                        <span className="att-time-dot att-time-dot--in" />
                        <span>Đang làm việc</span>
                      </span>
                    ) : (
                      <span className="att-duration-cell">
                        {item.total_hours && item.total_hours !== 'Đã hoàn thành ca'
                          ? item.total_hours
                          : calculateWorkDuration(item.check_in, item.check_out, item.checkInTs, item.checkOutTs)}
                      </span>
                    )}
                  </td>

                  {/* Cột 5: Thiết bị ghi nhận */}
                  <td>
                    <span className="att-device-pill">
                      {item.method?.includes('Camera') || item.method?.includes('AI') ? (
                        <svg className="att-device-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      ) : (
                        <svg className="att-device-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                          <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                          <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                          <path d="M2 12a10 10 0 0 1 18-6" />
                          <path d="M2 16h.01" />
                          <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                          <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
                        </svg>
                      )}
                      <span>{item.method}</span>
                    </span>
                  </td>

                  {/* Cột 6: Ghi chú / Công việc */}
                  <td>
                    <div className="att-note-cell" title={item.note}>
                      {item.note}
                    </div>
                  </td>

                  {/* Cột 7: Trạng thái: Đúng giờ (Xanh biển) - Đi muộn (Vàng) - Không check-in (Đỏ) */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`att-status-badge ${getStatusBadgeClass(item)}`}>
                      <span className="att-status-dot" />
                      <span>{item.status_label || (item.check_in && item.check_in !== '--:--' ? 'Đúng giờ' : 'Không check-in')}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* ── TAB 2: BẢNG DANH SÁCH LỊCH SỬ ĐƠN NGHỈ PHÉP (Story 5) ── */}
      {activeTab === 'leave' && (
        <section className="att-panel">
          <div className="att-panel-header">
            <div className="att-panel-title-group">
              <h2 className="att-panel-title">Lịch sử đơn xin nghỉ phép</h2>
            </div>
          </div>

          <div className="att-table-wrapper">
            <table className="att-table leave-history-table">
              <thead>
                <tr>
                  <th className="th-leave-code">Mã đơn</th>
                  <th className="th-leave-type">Loại nghỉ phép</th>
                  <th className="th-leave-dates">Thời gian nghỉ</th>
                  <th className="th-leave-session">Ca nghỉ</th>
                  <th className="th-leave-duration" style={{ textAlign: 'center' }}>Số ngày</th>
                  <th className="th-leave-created">Ngày gửi</th>
                  <th className="th-leave-status" style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th className="th-leave-approver">Người duyệt</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                      Chưa có đơn xin nghỉ phép nào được tạo.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((req) => {
                    const sessionParts = req.session.match(/^(.*?)\s*(\(.*?\))$/)
                    const sessionTitle = sessionParts ? sessionParts[1] : req.session
                    const sessionTime = sessionParts ? sessionParts[2] : ''

                    return (
                      <tr
                        key={req.id}
                        className={`leave-table-row ${req.status === 'rejected' ? 'leave-table-row--rejected' : ''}`}
                        onClick={() => setSelectedLeaveDetail(req)}
                        title="Nhấp để xem chi tiết đơn xin nghỉ phép"
                      >
                        {/* Cột 1: Mã đơn */}
                        <td className="td-leave-code">
                          <span className="leave-code-badge">{req.id}</span>
                        </td>

                        {/* Cột 2: Loại nghỉ phép */}
                        <td className="td-leave-type">
                          <span className="leave-type-name">{req.type}</span>
                        </td>

                        {/* Cột 3: Thời gian nghỉ */}
                        <td className="td-leave-dates">
                          <span className="leave-date-range">
                            {req.startDate === req.endDate
                              ? req.startDate.split('-').reverse().join('/')
                              : `${req.startDate.split('-').reverse().join('/')} ➔ ${req.endDate.split('-').reverse().join('/')}`}
                          </span>
                        </td>

                        {/* Cột 4: Ca nghỉ */}
                        <td className="td-leave-session">
                          <div className="leave-session-box">
                            <span className="leave-session-title">{sessionTitle}</span>
                            {sessionTime && <span className="leave-session-time">{sessionTime}</span>}
                          </div>
                        </td>

                        {/* Cột 5: Số ngày */}
                        <td className="td-leave-duration" style={{ textAlign: 'center' }}>
                          <span className="leave-duration-badge">{req.duration}</span>
                        </td>

                        {/* Cột 6: Ngày gửi */}
                        <td className="td-leave-created">
                          <span className="leave-created-date">{req.createdDate}</span>
                        </td>

                        {/* Cột 7: Trạng thái */}
                        <td className="td-leave-status" style={{ textAlign: 'center' }}>
                          {req.status === 'approved' ? (
                            <span className="att-status-badge att-status-badge--ontime">
                              <span className="att-status-badge__dot" />
                              Đã phê duyệt
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="att-status-badge att-status-badge--absent">
                              <span className="att-status-badge__dot" />
                              Từ chối
                            </span>
                          ) : (
                            <span className="att-status-badge att-status-badge--late">
                              <span className="att-status-badge__dot" />
                              Chờ Hr duyệt
                            </span>
                          )}
                        </td>

                        {/* Cột 8: Người duyệt */}
                        <td className="td-leave-approver">
                          <div className="leave-approver-box">
                            <strong className="leave-approver-name">{formatApproverName(req.approver)}</strong>
                          </div>
                        </td>

                        {/* Cột 9: Thao tác (Xem lại / Xóa khi chưa duyệt) */}
                        <td className="td-leave-actions" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedLeaveDetail(req)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#2563EB',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                              title="Xem lại chi tiết đơn"
                            >
                              Xem
                            </button>
                            {req.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLeave(req.id, e)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#DC2626',
                                  backgroundColor: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                }}
                                title="Hủy / Xóa đơn xin nghỉ phép khi chưa được duyệt"
                              >
                                Xóa
                              </button>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  backgroundColor: '#F1F5F9',
                                  color: '#94A3B8',
                                  cursor: 'not-allowed',
                                  fontSize: '11px',
                                }}
                                title="Đã có kết quả duyệt — không thể xóa"
                              >
                                🔒
                              </span>
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
      )}


      {/* ── MODAL QUY ĐỊNH CÔNG VIỆC (TÍCH HỢP TỪ ẢNH 1) ── */}
      {rulesModal && (
        <div className="modal-overlay" onClick={() => setRulesModal(false)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              width: '100%',
              fontFamily: "var(--fb-font, 'Be Vietnam Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2.5px 8px',
                    borderRadius: '4px',
                    border: '1px solid #BFDBFE',
                    fontFamily: 'inherit',
                  }}
                >
                  ICTU
                </span>
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700, color: '#0F172A', fontFamily: 'inherit' }}>
                  Quy định công việc
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRulesModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px', fontFamily: 'inherit' }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '20px 24px',
                  fontFamily: 'inherit',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '15px',
                    color: '#0F172A',
                    fontWeight: '700',
                    fontFamily: 'inherit',
                    lineHeight: '1.4',
                  }}
                >
                  Quy định chấm công & Khung giờ làm việc chuẩn tại ICTU
                </h4>

                <p
                  style={{
                    margin: 0,
                    fontSize: '13.5px',
                    color: '#475569',
                    lineHeight: '1.65',
                    fontFamily: 'inherit',
                  }}
                >
                  - <strong style={{ color: '#0F172A', fontWeight: 600 }}>Buổi sáng:</strong> 08:15 – 12:00 (Check-in trước 08:30 được tính đúng giờ).
                  <br />
                  - <strong style={{ color: '#0F172A', fontWeight: 600 }}>Buổi chiều:</strong> 13:30 – 17:30 (Check-out sau 17:30 để hoàn thành ca làm việc).
                  <br />
                  - Trường hợp có lịch thi kết thúc học phần hoặc việc đột xuất tại Trường, sinh viên cần gửi đơn xin nghỉ phép trực tuyến trước tối thiểu 24 giờ để Mentor và Hr phê duyệt.
                </p>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="intern-btn intern-btn--primary"
                onClick={() => setRulesModal(false)}
                style={{ minWidth: '100px', justifyContent: 'center' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XIN NGHỈ PHÉP (Story 5: DateRange Picker & Validate) ── */}
      {leaveModal && (
        <div className="modal-overlay">
          <div
            className="modal-container"
            style={{
              maxWidth: '560px',
              fontFamily: "var(--fb-font, 'Be Vietnam Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
            }}
          >
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700 }}>Đơn xin nghỉ phép trực tuyến</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Đơn sẽ được chuyển thẳng tới Phòng Nhân sự (Hr) xem xét & phê duyệt (chỉ Hr có thẩm quyền duyệt)</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setLeaveModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeaveRequest}>
              <div className="modal-body">
                {leaveError && (
                  <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '14px' }}>
                    ⚠️ {leaveError}
                  </div>
                )}

                {/* 1. Loại nghỉ phép */}
                <div className="modal-field">
                  <label htmlFor="leave-type" style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
                    Loại nghỉ phép <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="leave-type"
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                    className="modal-input"
                    style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  >
                    <option value="Nghỉ thi học phần">Nghỉ thi kết thúc học phần tại Trường</option>
                    <option value="Nghỉ việc cá nhân">Nghỉ việc cá nhân / Gia đình</option>
                    <option value="Nghỉ ốm / Khám bệnh">Nghỉ ốm / Đi khám bệnh</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                {/* 2. DateRange Picker: Từ ngày - Đến ngày */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="modal-field" style={{ margin: 0 }}>
                    <label htmlFor="leave-start-date" style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
                      Từ ngày <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      id="leave-start-date"
                      type="date"
                      required
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="modal-input"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                    />
                  </div>

                  <div className="modal-field" style={{ margin: 0 }}>
                    <label htmlFor="leave-end-date" style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
                      Đến ngày <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      id="leave-end-date"
                      type="date"
                      required
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="modal-input"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                    />
                  </div>
                </div>

                {/* 3. Ca nghỉ */}
                <div className="modal-field">
                  <label htmlFor="leave-session" style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
                    Ca nghỉ làm việc
                  </label>
                  <select
                    id="leave-session"
                    value={leaveForm.session}
                    onChange={(e) => setLeaveForm({ ...leaveForm, session: e.target.value })}
                    className="modal-input"
                    style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                  >
                    <option value="Cả ngày (08:15 - 17:30)">Cả ngày (08:15 – 17:30) [1.0 công]</option>
                    <option value="Buổi sáng (08:15 - 12:00)">Buổi sáng (08:15 – 12:00) [0.5 công]</option>
                    <option value="Buổi chiều (13:30 - 17:30)">Buổi chiều (13:30 – 17:30) [0.5 công]</option>
                  </select>
                </div>

                {/* 4. Lý do xin nghỉ */}
                <div className="modal-field">
                  <label htmlFor="leave-reason" style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
                    Lý do xin nghỉ phép chi tiết <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    id="leave-reason"
                    rows={3}
                    required
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Ví dụ: Em có lịch thi kết thúc học phần Hệ quản trị Cơ sở dữ liệu tại phòng C.204 cơ sở 1 ICTU từ 13:30..."
                    className="modal-textarea"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #F1F5F9', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="intern-btn intern-btn--cancel"
                  onClick={() => setLeaveModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="intern-btn intern-btn--primary"
                  disabled={isSubmittingLeave}
                >
                  {isSubmittingLeave ? 'Đang gửi...' : 'Gửi đơn xin nghỉ phép'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CHI TIẾT ĐƠN XIN NGHỈ PHÉP (Click vào đơn từ bảng lịch sử) ── */}
      {selectedLeaveDetail && (
        <div className="modal-overlay" onClick={() => setSelectedLeaveDetail(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '580px',
              width: '100%',
              fontFamily: "var(--fb-font, 'Be Vietnam Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="leave-code-badge" style={{ fontSize: '13.5px', padding: '3px 10px' }}>
                  {selectedLeaveDetail.id}
                </span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                  Chi tiết đơn xin nghỉ phép
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedLeaveDetail(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Trạng thái đơn */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Trạng thái xử lý:</span>
                <div>
                  {selectedLeaveDetail.status === 'approved' ? (
                    <span className="att-status-badge att-status-badge--ontime" style={{ fontSize: '13px' }}>
                      <span className="att-status-badge__dot" />
                      Đã phê duyệt
                    </span>
                  ) : selectedLeaveDetail.status === 'rejected' ? (
                    <span className="att-status-badge att-status-badge--absent" style={{ fontSize: '13px' }}>
                      <span className="att-status-badge__dot" />
                      Từ chối
                    </span>
                  ) : (
                    <span className="att-status-badge att-status-badge--late" style={{ fontSize: '13px' }}>
                      <span className="att-status-badge__dot" />
                      Chờ Hr duyệt
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin thời gian và ca nghỉ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px 16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                }}
              >
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Loại nghỉ phép</span>
                  <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{selectedLeaveDetail.type}</strong>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Số ngày nghỉ</span>
                  <span className="leave-duration-badge">{selectedLeaveDetail.duration}</span>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Thời gian nghỉ</span>
                  <strong style={{ fontSize: '13px', color: '#334155' }}>
                    {selectedLeaveDetail.startDate === selectedLeaveDetail.endDate
                      ? selectedLeaveDetail.startDate.split('-').reverse().join('/')
                      : `${selectedLeaveDetail.startDate.split('-').reverse().join('/')} ➔ ${selectedLeaveDetail.endDate.split('-').reverse().join('/')}`}
                  </strong>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Ca nghỉ</span>
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>{selectedLeaveDetail.session}</span>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Ngày gửi đơn</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{selectedLeaveDetail.createdDate}</span>
                </div>
              </div>

              {/* Chi tiết lý do xin nghỉ */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Lý do xin nghỉ phép
                </div>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    color: '#334155',
                  }}
                >
                  {selectedLeaveDetail.reason}
                </div>
              </div>

              {/* Thông tin người duyệt và phản hồi */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Người duyệt</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>{formatApproverName(selectedLeaveDetail.approver)}</span>
                </div>
                <div
                  style={{
                    backgroundColor: selectedLeaveDetail.status === 'approved' ? '#F0FDF4' : selectedLeaveDetail.status === 'rejected' ? '#FEF2F2' : '#FEFCE8',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    border: `1px solid ${selectedLeaveDetail.status === 'approved' ? '#BBF7D0' : selectedLeaveDetail.status === 'rejected' ? '#FECACA' : '#FEF08A'}`,
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: selectedLeaveDetail.status === 'approved' ? '#166534' : selectedLeaveDetail.status === 'rejected' ? '#991B1B' : '#854D0E',
                  }}
                >
                  {selectedLeaveDetail.feedback ? (
                    <div>
                      <strong style={{ display: 'block', marginBottom: '3px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Phản hồi từ người duyệt:
                      </strong>
                      <span style={{ fontStyle: 'italic' }}>{selectedLeaveDetail.feedback}</span>
                    </div>
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#64748B' }}>Chưa có phản hồi từ người duyệt.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #F1F5F9', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedLeaveDetail.status === 'pending' ? (
                <button
                  type="button"
                  onClick={() => handleDeleteLeave(selectedLeaveDetail.id)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                  title="Hủy / Xóa đơn xin nghỉ phép khi chưa được duyệt"
                >
                  Hủy / Xóa đơn này
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                className="intern-btn intern-btn--primary"
                onClick={() => setSelectedLeaveDetail(null)}
                style={{ minWidth: '95px', justifyContent: 'center' }}
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
