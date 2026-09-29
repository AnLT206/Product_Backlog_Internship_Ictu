import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getContract, confirmContract, getDocumentDownloadUrl } from '../../api/documents'
import './InternDashboardPage.css'

// Dữ liệu mẫu ban đầu bám sát software-specification.md và product-backlog.md
const INITIAL_MY_TASKS = [
  {
    id: 1,
    title: 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh',
    description: 'Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.',
    due_at: '2026-10-02',
    priority: 'high',
    status: 'doing',
    progress: 70,
    note: 'Đã hoàn thành controller và validate schema Pydantic, đang viết route test.',
  },
  {
    id: 2,
    title: 'Nghiên cứu tài liệu Software Specification v2.1',
    description: 'Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.',
    due_at: '2026-09-24',
    priority: 'medium',
    status: 'done',
    progress: 100,
    note: 'Đã nắm vững luồng xử lý và cấu trúc cơ sở dữ liệu MySQL.',
  },
  {
    id: 3,
    title: 'Viết tài liệu hướng dẫn sử dụng API Swagger',
    description: 'Bổ sung mô tả tóm tắt cho từng endpoint và status code 200, 201, 400, 409.',
    due_at: '2026-10-06',
    priority: 'medium',
    status: 'todo',
    progress: 0,
    note: '',
  },
]

const INITIAL_MY_REPORTS = [
  {
    id: 101,
    week_range: 'Tuần 3 (20/09 - 26/09/2026)',
    submitted_at: '26/09/2026 17:30',
    summary: 'Đã hoàn thành module đăng nhập auth, tích hợp JWT token và xử lý phân quyền theo role admin/hr/mentor/intern.',
    issues: 'Gặp chút khó khăn khi cấu hình CORS giữa Vite frontend port 8080 và FastAPI port 8000, đã fix xong.',
    plan: 'Tuần tới tập trung làm giao diện form thêm hồ sơ thực tập sinh cho HR.',
    file_name: 'BaoCaoTuan3_NguyenVanAn.docx',
    feedback: 'Làm rất tốt! Chú ý thêm các trường hợp biên khi token hết hạn nhé.',
    status: 'reviewed',
  },
  {
    id: 102,
    week_range: 'Tuần 2 (13/09 - 19/09/2026)',
    submitted_at: '19/09/2026 17:15',
    summary: 'Tìm hiểu kiến trúc dự án, cài đặt môi trường Docker Compose và kiểm thử API auth/register.',
    issues: 'Không có vướng mắc.',
    plan: 'Phát triển tiếp tính năng login và lưu trữ JWT session.',
    file_name: 'BaoCaoTuan2_NguyenVanAn.docx',
    feedback: 'Báo cáo đầy đủ, tiến độ đạt yêu cầu.',
    status: 'reviewed',
  },
]

const INITIAL_ATTENDANCE_LOGS = [
  { date: '28/09/2026 (Hôm nay)', check_in: '08:15', check_out: '—', status: 'on_time' },
  { date: '25/09/2026', check_in: '08:22', check_out: '17:35', status: 'on_time' },
  { date: '24/09/2026', check_in: '08:28', check_out: '17:30', status: 'on_time' },
  { date: '23/09/2026', check_in: '08:50', check_out: '17:40', status: 'late' },
  { date: '22/09/2026', check_in: '08:10', check_out: '17:32', status: 'on_time' },
]

const INITIAL_MY_LEAVES = [
  {
    id: 1,
    dates: '29/09/2026 - 30/09/2026 (2 ngày)',
    reason: 'Trùng lịch thi kết thúc học phần tại trường ICTU',
    created_at: '28/09/2026 08:30',
    status: 'pending',
  },
]

const INITIAL_MY_TICKETS = [
  {
    id: 1,
    type: 'Cấp giấy chứng nhận thực tập',
    content: 'Em cần xin giấy xác nhận đang thực tập tại công ty để nộp về khoa CNTT trường ICTU.',
    created_at: '27/09/2026',
    status: 'resolved',
    hr_response: 'Phòng Nhân sự đã ký và đóng dấu giấy xác nhận. Em có thể qua phòng HR (P.302) nhận bản cứng nhé.',
  },
]

export default function InternDashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' | 'reports' | 'attendance' | 'contract' | 'support'
  const [tasks, setTasks] = useState(INITIAL_MY_TASKS)
  const [reports, setReports] = useState(INITIAL_MY_REPORTS)
  const [leaves, setLeaves] = useState(INITIAL_MY_LEAVES)
  const [tickets, setTickets] = useState(INITIAL_MY_TICKETS)
  const [toast, setToast] = useState(null)

  // Chấm công state
  const [todayAttendance, setTodayAttendance] = useState({
    checkedIn: true,
    checkInTime: '08:15',
    checkedOut: false,
    checkOutTime: null,
  })

  // Hợp đồng state (US 10 & Phân quyền thao tác)
  const [contractData, setContractData] = useState(null)
  const [contractConfirmed, setContractConfirmed] = useState(false)
  const [loadingContract, setLoadingContract] = useState(false)
  const [hasReadCheckbox, setHasReadCheckbox] = useState(false)
  const [confirmingContract, setConfirmingContract] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadContract() {
      setLoadingContract(true)
      try {
        const res = await getContract()
        if (isMounted && res.ok && res.data) {
          setContractData(res.data)
          if (
            res.data.status === 'confirmed' ||
            res.data.is_confirmed ||
            res.data.status === 'approved' ||
            res.data.confirmed_at != null
          ) {
            setContractConfirmed(true)
            setHasReadCheckbox(true)
          }
        }
      } catch (err) {
        console.error('Lỗi tải hợp đồng:', err)
      } finally {
        if (isMounted) setLoadingContract(false)
      }
    }
    loadContract()
    return () => {
      isMounted = false
    }
  }, [])

  // Modals state
  const [taskUpdateModal, setTaskUpdateModal] = useState({ open: false, task: null, progress: 0, status: 'doing', note: '' })
  const [reportModal, setReportModal] = useState(false)
  const [leaveModal, setLeaveModal] = useState(false)
  const [ticketModal, setTicketModal] = useState(false)

  // Form nộp báo cáo
  const [newReport, setNewReport] = useState({
    week_range: 'Tuần 4 (27/09 - 03/10/2026)',
    summary: '',
    issues: '',
    plan: '',
    file_name: 'BaoCaoTuan4_NguyenVanAn.docx',
  })

  // Form xin nghỉ phép
  const [newLeave, setNewLeave] = useState({
    dates: '',
    reason: '',
  })

  // Form gửi hỗ trợ
  const [newTicket, setNewTicket] = useState({
    type: 'Cấp giấy tờ / Chứng nhận',
    content: '',
  })

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Chấm công (US 21)
  function handleCheckIn() {
    if (!contractConfirmed) {
      showToast('Tài khoản đang ở chế độ Chỉ xem. Vui lòng tick "Xác nhận đã đọc hợp đồng" để mở quyền chấm công!', 'error')
      return
    }
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    setTodayAttendance({
      checkedIn: true,
      checkInTime: time,
      checkedOut: false,
      checkOutTime: null,
    })
    showToast(`Check-in thành công lúc ${time}! Chúc bạn một ngày làm việc hiệu quả.`)
  }

  function handleCheckOut() {
    if (!contractConfirmed) {
      showToast('Tài khoản đang ở chế độ Chỉ xem. Vui lòng xác nhận hợp đồng trước!', 'error')
      return
    }
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    setTodayAttendance((prev) => ({
      ...prev,
      checkedOut: true,
      checkOutTime: time,
    }))
    showToast(`Check-out thành công lúc ${time}! Đã ghi nhận thời gian làm việc hôm nay.`)
  }

  // Cập nhật tiến độ task (US 16)
  function openTaskModal(task) {
    if (!contractConfirmed) {
      showToast('Tài khoản đang ở chế độ Chỉ xem. Vui lòng xác nhận hợp đồng để cập nhật tiến độ nhiệm vụ!', 'error')
      return
    }
    setTaskUpdateModal({
      open: true,
      task,
      progress: task.progress,
      status: task.status,
      note: task.note,
    })
  }

  function handleSaveTaskUpdate() {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskUpdateModal.task.id
          ? {
              ...t,
              progress: Number(taskUpdateModal.progress),
              status: taskUpdateModal.status,
              note: taskUpdateModal.note,
            }
          : t
      )
    )
    setTaskUpdateModal({ open: false, task: null, progress: 0, status: 'doing', note: '' })
    showToast('Đã cập nhật tiến độ nhiệm vụ và thông báo cho Mentor!')
  }

  // Nộp báo cáo tuần (US 17)
  function handleSubmitReport(e) {
    e.preventDefault()
    if (!contractConfirmed) {
      showToast('Tài khoản đang ở chế độ Chỉ xem. Vui lòng xác nhận hợp đồng trước khi nộp báo cáo!', 'error')
      return
    }
    if (!newReport.summary.trim()) {
      alert('Vui lòng nhập tóm tắt kết quả công việc trong tuần.')
      return
    }

    const created = {
      id: Date.now(),
      week_range: newReport.week_range,
      submitted_at: 'Hôm nay ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      summary: newReport.summary,
      issues: newReport.issues || 'Không có',
      plan: newReport.plan || 'Tiếp tục theo kế hoạch',
      file_name: newReport.file_name,
      feedback: '',
      status: 'pending',
    }

    setReports((prev) => [created, ...prev])
    setReportModal(false)
    setNewReport({
      week_range: 'Tuần 4 (27/09 - 03/10/2026)',
      summary: '',
      issues: '',
      plan: '',
      file_name: 'BaoCaoTuan4_NguyenVanAn.docx',
    })
    showToast('Nộp báo cáo tuần thành công! Mentor sẽ nhận được thông báo để phản hồi.')
  }

  // Đăng ký nghỉ phép (US 24)
  function handleSubmitLeave(e) {
    e.preventDefault()
    if (!contractConfirmed) {
      showToast('Tài khoản đang ở chế độ Chỉ xem. Vui lòng xác nhận hợp đồng trước khi xin nghỉ phép!', 'error')
      return
    }
    if (!newLeave.dates.trim() || !newLeave.reason.trim()) {
      alert('Vui lòng nhập đầy đủ thời gian và lý do xin nghỉ phép.')
      return
    }

    const item = {
      id: Date.now(),
      dates: newLeave.dates,
      reason: newLeave.reason,
      created_at: 'Hôm nay ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
    }

    setLeaves((prev) => [item, ...prev])
    setLeaveModal(false)
    setNewLeave({ dates: '', reason: '' })
    showToast('Đã gửi đơn xin nghỉ phép tới bộ phận HR xét duyệt.')
  }

  // Gửi hỗ trợ (US 27)
  function handleSubmitTicket(e) {
    e.preventDefault()
    if (!contractConfirmed) {
      showToast('Tài khoản đang ở chế độ Chỉ xem. Vui lòng xác nhận hợp đồng trước khi gửi hỗ trợ!', 'error')
      return
    }
    if (!newTicket.content.trim()) {
      alert('Vui lòng nhập nội dung yêu cầu hỗ trợ.')
      return
    }

    const item = {
      id: Date.now(),
      type: newTicket.type,
      content: newTicket.content,
      created_at: 'Hôm nay',
      status: 'pending',
      hr_response: null,
    }

    setTickets((prev) => [item, ...prev])
    setTicketModal(false)
    setNewTicket({ type: 'Cấp giấy tờ / Chứng nhận', content: '' })
    showToast('Đã gửi yêu cầu hỗ trợ! HR sẽ xử lý trong thời gian sớm nhất.')
  }

  // Xác nhận hợp đồng (US 10 & Mở quyền thao tác)
  async function handleConfirmContract() {
    if (!hasReadCheckbox) {
      showToast('Vui lòng click vào checkbox "Xác nhận đã đọc hợp đồng"!', 'error')
      return
    }
    setConfirmingContract(true)
    try {
      const res = await confirmContract()
      if (res.ok) {
        setContractConfirmed(true)
        showToast('Xác nhận hợp đồng thành công! Hệ thống đã mở đầy đủ quyền thao tác cho bạn.', 'success')
      } else {
        showToast(res.data?.detail || 'Không thể xác nhận hợp đồng.', 'error')
      }
    } catch {
      showToast('Đã có lỗi xảy ra khi xác nhận hợp đồng.', 'error')
    } finally {
      setConfirmingContract(false)
    }
  }

  function handleDownloadContract() {
    if (contractData?.id) {
      window.open(getDocumentDownloadUrl(contractData.id), '_blank')
    } else {
      showToast('Đang tải file hợp đồng PDF về máy...', 'info')
    }
  }

  return (
    <div className="intern-dash">
      {/* Toast Alert */}
      {toast && (
        <div className={`intern-dash__toast intern-dash__toast--${toast.type}`} role="alert">
          <span>{toast.type === 'success' ? '✓' : 'ℹ'}</span>
          <div>{toast.message}</div>
        </div>
      )}

      {/* Header chào mừng & Mentor Info */}
      <header className="intern-dash__header">
        <div>
          <nav className="intern-dash__crumb" aria-label="Breadcrumb">
            <span>Thực tập sinh</span>
            <span aria-hidden="true">/</span>
            <span>Không gian làm việc cá nhân</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1>Xin chào, {user?.full_name || 'Thực tập sinh'} {user?.code ? `(${user.code})` : ''} 🎓</h1>
            {!contractConfirmed ? (
              <span className="intern-readonly-tag">🔒 Chế độ Chỉ xem (Chưa ký HĐ)</span>
            ) : (
              <span className="intern-contract-active-badge">✓ Đã xác nhận HĐ</span>
            )}
          </div>
          <p className="intern-dash__lead">
            Chương trình: <strong>Thực tập sinh Phát triển Phần mềm Q3/2026</strong> · Phòng ban: <strong>Công nghệ thông tin</strong>
            <br />
            Mentor hướng dẫn: <strong>Nguyễn Văn Bình</strong> (binh.nv@ictu.edu.vn · 0912 345 678)
          </p>
        </div>

        <div className="intern-dash__header-actions">
          {!todayAttendance.checkedIn ? (
            <button
              type="button"
              className="intern-dash__btn intern-dash__btn--primary"
              onClick={handleCheckIn}
              disabled={!contractConfirmed}
              title={!contractConfirmed ? 'Chỉ mở quyền chấm công sau khi bạn xác nhận đã đọc hợp đồng' : ''}
              style={!contractConfirmed ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              ⏱️ Check-in hôm nay
            </button>
          ) : !todayAttendance.checkedOut ? (
            <button
              type="button"
              className="intern-dash__btn intern-dash__btn--warn"
              onClick={handleCheckOut}
              disabled={!contractConfirmed}
              title={!contractConfirmed ? 'Chỉ mở quyền chấm công sau khi bạn xác nhận đã đọc hợp đồng' : ''}
              style={!contractConfirmed ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              🚪 Check-out ({todayAttendance.checkInTime})
            </button>
          ) : (
            <span className="intern-attend-done-badge">
              ✓ Đã hoàn thành ngày làm việc ({todayAttendance.checkInTime} - {todayAttendance.checkOutTime})
            </span>
          )}

          <button
            type="button"
            className="intern-dash__btn intern-dash__btn--ghost"
            onClick={() => setReportModal(true)}
            disabled={!contractConfirmed}
            title={!contractConfirmed ? 'Vui lòng xác nhận hợp đồng trước khi nộp báo cáo' : ''}
            style={!contractConfirmed ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            📝 Nộp báo cáo tuần
          </button>
          <button
            type="button"
            className="intern-dash__btn intern-dash__btn--ghost"
            onClick={() => setLeaveModal(true)}
            disabled={!contractConfirmed}
            title={!contractConfirmed ? 'Vui lòng xác nhận hợp đồng trước khi xin nghỉ phép' : ''}
            style={!contractConfirmed ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            🏖️ Xin nghỉ phép
          </button>
        </div>
      </header>

      {/* ── Thông báo Hợp đồng lao động & Kích hoạt quyền thao tác ── */}
      {!contractConfirmed ? (
        <section className="intern-contract-notice-banner" aria-label="Thông báo hợp đồng thực tập">
          <div className="intern-contract-notice-head">
            <span className="intern-contract-notice-badge">🔔 THÔNG BÁO QUAN TRỌNG</span>
            <h2 className="intern-contract-notice-title">Hồ sơ đã được phê duyệt & Hợp đồng lao động cần xác nhận</h2>
          </div>

          <div className="intern-contract-notice-body">
            Chúc mừng bạn! Hồ sơ thực tập sinh của bạn đã được phòng Nhân sự phê duyệt tiếp nhận.
            Hiện tại tài khoản đang ở <strong>CHẾ ĐỘ CHỈ XEM (Read-only)</strong>.
            Để kích hoạt đầy đủ quyền thao tác (Chấm công hàng ngày, Nộp báo cáo tuần, Cập nhật nhiệm vụ, Xin nghỉ phép, Gửi yêu cầu hỗ trợ),
            vui lòng kiểm tra kỹ hợp đồng bên dưới, tích vào checkbox <strong>"Xác nhận đã đọc hợp đồng"</strong> và bấm nút xác nhận.
          </div>

          <div className="intern-contract-notice-card">
            <div className="intern-contract-file-info">
              <div className="intern-contract-file-icon">📑</div>
              <div>
                <div className="intern-contract-file-title">
                  {contractData?.file_name || `HopDongThucTap_ICTU_${user?.code || 'TTS'}.pdf`}
                </div>
                <div className="intern-contract-file-sub">
                  Đơn vị tiếp nhận: Trường Đại học CNTT & Truyền thông (ICTU) · Thời hạn 12 tuần
                </div>
              </div>
            </div>

            <button
              type="button"
              className="intern-dash__btn intern-dash__btn--ghost intern-dash__btn--sm"
              onClick={handleDownloadContract}
            >
              ⬇️ Xem / Tải file hợp đồng (PDF)
            </button>
          </div>

          <div className="intern-contract-action-row">
            <label className="intern-contract-checkbox-label">
              <input
                type="checkbox"
                checked={hasReadCheckbox}
                onChange={(e) => setHasReadCheckbox(e.target.checked)}
              />
              <span>
                <strong>Xác nhận đã đọc hợp đồng:</strong> Tôi đã đọc kỹ, hiểu rõ các quyền lợi, nghĩa vụ và cam kết tuân thủ toàn bộ các điều khoản trong Hợp đồng tiếp nhận thực tập cũng như quy chế nội bộ của đơn vị.
              </span>
            </label>

            <button
              type="button"
              className="intern-dash__btn intern-dash__btn--primary"
              disabled={!hasReadCheckbox || confirmingContract}
              onClick={handleConfirmContract}
              title={!hasReadCheckbox ? 'Vui lòng tích vào checkbox để xác nhận' : 'Kích hoạt toàn bộ quyền thao tác'}
            >
              {confirmingContract ? 'Đang xử lý…' : '✓ Xác nhận đã đọc & Mở quyền thao tác'}
            </button>
          </div>
        </section>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, fontSize: 13.5, color: '#065f46', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✓</span>
            <strong>Hợp đồng thực tập đã được xác nhận:</strong> Bạn đang có đầy đủ quyền thao tác trên hệ thống.
          </div>
          <button
            type="button"
            className="intern-dash__btn intern-dash__btn--ghost intern-dash__btn--sm"
            onClick={handleDownloadContract}
          >
            ⬇️ Xem lại file hợp đồng
          </button>
        </div>
      )}


      {/* 4 Thẻ KPI Stats */}
      <section className="intern-dash__stats" aria-label="Thống kê thực tập sinh">
        <article className="intern-stat intern-stat--info">
          <p className="intern-stat__label">Tiến độ kỳ thực tập</p>
          <p className="intern-stat__value">75%</p>
          <p className="intern-stat__hint">Tuần 8 / 12 tuần thực tập tại ICTU</p>
        </article>

        <article className="intern-stat intern-stat--neutral">
          <p className="intern-stat__label">Nhiệm vụ (Tasks)</p>
          <p className="intern-stat__value">
            {tasks.filter((t) => t.status === 'done').length}/{tasks.length}
          </p>
          <p className="intern-stat__hint">
            {tasks.filter((t) => t.status === 'doing').length} đang làm · {tasks.filter((t) => t.status === 'todo').length} sắp tới
          </p>
        </article>

        <article className="intern-stat intern-stat--success">
          <p className="intern-stat__label">Chuyên cần tháng này</p>
          <p className="intern-stat__value">98%</p>
          <p className="intern-stat__hint">20 ngày có mặt đúng giờ · 1 ngày nghỉ có phép</p>
        </article>

        <article className="intern-stat intern-stat--warn">
          <p className="intern-stat__label">Phụ cấp & Hỗ trợ</p>
          <p className="intern-stat__value">2.500.000 đ</p>
          <p className="intern-stat__hint">Định mức hàng tháng · Kỳ 09/2026 đang xử lý</p>
        </article>
      </section>

      {/* Navigation Tabs */}
      <nav className="intern-dash__tabs" aria-label="Phân hệ chức năng Thực tập sinh">
        <button
          type="button"
          className={`intern-dash__tab-btn ${activeTab === 'tasks' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <span className="intern-dash__tab-icon">📋</span>
          Nhiệm vụ & Tiến độ ({tasks.length})
        </button>

        <button
          type="button"
          className={`intern-dash__tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="intern-dash__tab-icon">📝</span>
          Báo cáo tuần & Feedback ({reports.length})
        </button>

        <button
          type="button"
          className={`intern-dash__tab-btn ${activeTab === 'attendance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <span className="intern-dash__tab-icon">⏱️</span>
          Chấm công & Nghỉ phép
        </button>

        <button
          type="button"
          className={`intern-dash__tab-btn ${activeTab === 'contract' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('contract')}
        >
          <span className="intern-dash__tab-icon">📄</span>
          Hợp đồng & Đánh giá năng lực
        </button>

        <button
          type="button"
          className={`intern-dash__tab-btn ${activeTab === 'support' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          <span className="intern-dash__tab-icon">💬</span>
          Yêu cầu hỗ trợ ({tickets.length})
        </button>
      </nav>

      {/* TAB 1: NHIỆM VỤ & TIẾN ĐỘ (US 16) */}
      {activeTab === 'tasks' && (
        <section className="intern-dash__panel">
          <div className="intern-dash__panel-head">
            <div>
              <h2>Nhiệm vụ được Mentor phân công (US 16)</h2>
              <p className="intern-dash__panel-desc">
                Cập nhật tiến độ hoàn thành (% và ghi chú) để Mentor theo dõi và nghiệm thu.
              </p>
            </div>
          </div>

          <div className="intern-table-wrap">
            <table className="intern-table">
              <thead>
                <tr>
                  <th>Nhiệm vụ</th>
                  <th>Hạn hoàn thành</th>
                  <th>Mức ưu tiên</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td style={{ maxWidth: '300px' }}>
                      <strong className="intern-table__strong">{task.title}</strong>
                      <div className="intern-table__sub">{task.description}</div>
                      {task.note && (
                        <div className="intern-task-note">💡 Ghi chú: {task.note}</div>
                      )}
                    </td>
                    <td>
                      <span className="intern-table__sub">🗓️ {task.due_at}</span>
                    </td>
                    <td>
                      <span
                        className={`intern-badge intern-badge--${
                          task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warn' : 'info'
                        }`}
                      >
                        {task.priority === 'high' ? 'Ưu tiên cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                      </span>
                    </td>
                    <td style={{ minWidth: '120px' }}>
                      <div className="intern-task-progress-cell">
                        <span>{task.progress}%</span>
                        <div className="intern-progress intern-progress--thin">
                          <div className="intern-progress__bar" style={{ width: `${task.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`intern-badge intern-badge--${
                          task.status === 'done' ? 'success' : task.status === 'doing' ? 'info' : 'warn'
                        }`}
                      >
                        {task.status === 'done'
                          ? '✓ Hoàn thành'
                          : task.status === 'doing'
                          ? '⚡ Đang thực hiện'
                          : '⏳ Chưa bắt đầu'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!contractConfirmed ? (
                        <span className="intern-readonly-tag" title="Vui lòng xác nhận hợp đồng để cập nhật nhiệm vụ">
                          🔒 Chỉ xem
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="intern-action-btn intern-action-btn--primary"
                          onClick={() => openTaskModal(task)}
                        >
                          ✏️ Cập nhật tiến độ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: BÁO CÁO TUẦN & FEEDBACK (US 17, 18) */}
      {activeTab === 'reports' && (
        <section className="intern-dash__panel">
          <div className="intern-dash__panel-head">
            <div>
              <h2>Báo cáo thực tập tuần & Nhận xét của Mentor (US 17, 18)</h2>
              <p className="intern-dash__panel-desc">
                Nộp báo cáo định kỳ trước 18:00 thứ Sáu hàng tuần để Mentor đánh giá quá trình học tập.
              </p>
            </div>
            <button
              type="button"
              className="intern-dash__btn intern-dash__btn--primary intern-dash__btn--sm"
              onClick={() => setReportModal(true)}
              disabled={!contractConfirmed}
              title={!contractConfirmed ? 'Vui lòng xác nhận hợp đồng trước khi nộp báo cáo' : ''}
              style={!contractConfirmed ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              + Nộp báo cáo tuần mới
            </button>
          </div>

          <div className="intern-reports-list">
            {reports.map((report) => (
              <div key={report.id} className="intern-report-card">
                <div className="intern-report-card__header">
                  <div>
                    <strong className="intern-report-card__title">{report.week_range}</strong>
                    <div className="intern-table__sub">Thời gian gửi: {report.submitted_at}</div>
                  </div>
                  <span
                    className={`intern-badge intern-badge--${
                      report.status === 'reviewed' ? 'success' : 'warn'
                    }`}
                  >
                    {report.status === 'reviewed' ? '✓ Mentor đã phản hồi' : '⏳ Chờ Mentor nhận xét'}
                  </span>
                </div>

                <div className="intern-report-card__body">
                  <div className="intern-report-section">
                    <strong>1. Kết quả công việc đạt được trong tuần:</strong>
                    <p>{report.summary}</p>
                  </div>

                  <div className="intern-report-section">
                    <strong>2. Khó khăn gặp phải:</strong>
                    <p>{report.issues}</p>
                  </div>

                  <div className="intern-report-section">
                    <strong>3. Kế hoạch tuần tới:</strong>
                    <p>{report.plan}</p>
                  </div>

                  <div className="intern-report-file">
                    <span>📎 File đính kèm:</span>
                    <button
                      type="button"
                      className="intern-link-btn"
                      onClick={() => showToast(`Đang tải file ${report.file_name}`)}
                    >
                      📄 {report.file_name}
                    </button>
                  </div>

                  {report.feedback && (
                    <div className="intern-report-feedback-box">
                      <strong>💬 Nhận xét & Hướng dẫn của Mentor:</strong>
                      <p>"{report.feedback}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: CHẤM CÔNG & NGHỈ PHÉP (US 21, 24) */}
      {activeTab === 'attendance' && (
        <div className="intern-dash__grid-2">
          {/* Lịch sử chấm công */}
          <section className="intern-dash__panel">
            <div className="intern-dash__panel-head">
              <div>
                <h2>Lịch sử chấm công (Check-in/Out)</h2>
                <p className="intern-dash__panel-desc">Ghi nhận giờ làm việc hằng ngày tại ICTU.</p>
              </div>
            </div>

            <div className="intern-table-wrap">
              <table className="intern-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {INITIAL_ATTENDANCE_LOGS.map((log, idx) => (
                    <tr key={idx}>
                      <td><strong>{log.date}</strong></td>
                      <td>{log.check_in}</td>
                      <td>{log.check_out}</td>
                      <td>
                        <span
                          className={`intern-badge intern-badge--${
                            log.status === 'on_time' ? 'success' : 'warn'
                          }`}
                        >
                          {log.status === 'on_time' ? 'Đúng giờ' : 'Đi muộn'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Đơn xin nghỉ phép */}
          <section className="intern-dash__panel">
            <div className="intern-dash__panel-head">
              <div>
                <h2>Đăng ký nghỉ phép (US 24)</h2>
                <p className="intern-dash__panel-desc">Báo trước cho HR và Mentor khi bận việc học hoặc thi cử.</p>
              </div>
              <button
                type="button"
                className="intern-dash__btn intern-dash__btn--primary intern-dash__btn--sm"
                onClick={() => setLeaveModal(true)}
              >
                + Xin nghỉ phép
              </button>
            </div>

            <div className="intern-leaves-list">
              {leaves.map((leave) => (
                <div key={leave.id} className="intern-leave-card">
                  <div className="intern-leave-card__header">
                    <strong>🗓️ {leave.dates}</strong>
                    <span
                      className={`intern-badge intern-badge--${
                        leave.status === 'approved' ? 'success' : 'warn'
                      }`}
                    >
                      {leave.status === 'approved' ? '✓ Đã phê duyệt' : '⏳ Chờ HR duyệt'}
                    </span>
                  </div>
                  <p className="intern-leave-card__reason"><strong>Lý do:</strong> {leave.reason}</p>
                  <span className="intern-table__sub">Gửi lúc: {leave.created_at}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: HỢP ĐỒNG & ĐÁNH GIÁ NĂNG LỰC (US 10, 19, 20) */}
      {activeTab === 'contract' && (
        <div className="intern-dash__grid-2">
          {/* Hợp đồng thực tập */}
          <section className="intern-dash__panel">
            <div className="intern-dash__panel-head">
              <div>
                <h2>Hợp đồng thực tập doanh nghiệp (US 10)</h2>
                <p className="intern-dash__panel-desc">Văn bản thỏa thuận quyền lợi và nghĩa vụ thực tập sinh.</p>
              </div>
            </div>

            <div className="intern-contract-card">
              <div className="intern-contract-icon">📑</div>
              <div className="intern-contract-info">
                <h3>{contractData?.file_name || `HopDongThucTap_ICTU_${user?.code || 'TTS'}.pdf`}</h3>
                <p className="intern-table__sub">Doanh nghiệp: ICTU Software & AI Center</p>
                <p className="intern-table__sub">Thời hạn: {contractData?.period || '01/07/2026 - 31/10/2026 (4 tháng)'}</p>
              </div>

              <div className="intern-contract-actions">
                <button
                  type="button"
                  className="intern-dash__btn intern-dash__btn--ghost intern-dash__btn--sm"
                  onClick={handleDownloadContract}
                >
                  ⬇️ Tải file hợp đồng
                </button>

                {!contractConfirmed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <label className="intern-contract-checkbox-label" style={{ fontSize: '0.82rem' }}>
                      <input
                        type="checkbox"
                        checked={hasReadCheckbox}
                        onChange={(e) => setHasReadCheckbox(e.target.checked)}
                      />
                      <span>Xác nhận đã đọc hợp đồng</span>
                    </label>
                    <button
                      type="button"
                      className="intern-dash__btn intern-dash__btn--primary intern-dash__btn--sm"
                      disabled={!hasReadCheckbox || confirmingContract}
                      onClick={handleConfirmContract}
                      title={!hasReadCheckbox ? 'Vui lòng tích vào checkbox để xác nhận' : 'Kích hoạt toàn bộ quyền thao tác'}
                    >
                      {confirmingContract ? 'Đang xử lý…' : '✓ Xác nhận đồng ý hợp đồng'}
                    </button>
                  </div>
                ) : (
                  <span className="intern-badge intern-badge--success">
                    ✓ Đã xác nhận trên hệ thống (Đầy đủ quyền)
                  </span>
                )}
              </div>
            </div>

            <div className="intern-allowance-history">
              <h3>Lịch sử nhận phụ cấp thực tập (US 26)</h3>
              <div className="intern-table-wrap">
                <table className="intern-table">
                  <thead>
                    <tr>
                      <th>Kỳ</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2026-08</td>
                      <td>2.500.000 đ</td>
                      <td><span className="intern-badge intern-badge--success">Đã nhận</span></td>
                    </tr>
                    <tr>
                      <td>2026-07</td>
                      <td>2.500.000 đ</td>
                      <td><span className="intern-badge intern-badge--success">Đã nhận</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Đánh giá cuối kỳ của Mentor */}
          <section className="intern-dash__panel">
            <div className="intern-dash__panel-head">
              <div>
                <h2>Kết quả đánh giá từ Mentor (US 20)</h2>
                <p className="intern-dash__panel-desc">Điểm kỹ năng và thái độ phục vụ báo cáo tốt nghiệp.</p>
              </div>
            </div>

            <div className="intern-eval-summary-card">
              <div className="intern-eval-scores-grid">
                <div className="intern-eval-score-box">
                  <span>Điểm Kỹ năng:</span>
                  <strong>9.0 / 10</strong>
                </div>
                <div className="intern-eval-score-box">
                  <span>Điểm Thái độ:</span>
                  <strong>10 / 10</strong>
                </div>
              </div>

              <div className="intern-eval-recommendation-box">
                <span>Đề xuất của Mentor:</span>
                <strong>Tuyển dụng chính thức (Khuyên khích)</strong>
              </div>

              <div className="intern-eval-comment-box">
                <strong>💬 Lời nhận xét của Mentor:</strong>
                <p>
                  "An có tư duy lập trình vững vàng, nắm bắt nhanh kiến trúc dự án. Thái độ học hỏi cầu thị, chuyên cần và luôn hoàn thành task đúng hẹn. Rất mong muốn An tiếp tục gắn bó lâu dài cùng công ty."
                </p>
                <div className="intern-table__sub">Người đánh giá: Mentor Nguyễn Văn Bình · 25/09/2026</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: YÊU CẦU HỖ TRỢ (US 27, 28) */}
      {activeTab === 'support' && (
        <section className="intern-dash__panel">
          <div className="intern-dash__panel-head">
            <div>
              <h2>Yêu cầu hỗ trợ & Giấy tờ (US 27, 28)</h2>
              <p className="intern-dash__panel-desc">
                Gửi yêu cầu xin giấy chứng nhận thực tập, hỗ trợ trang thiết bị hoặc giải quyết thắc mắc quyền lợi.
              </p>
            </div>
            <button
              type="button"
              className="intern-dash__btn intern-dash__btn--primary intern-dash__btn--sm"
              onClick={() => setTicketModal(true)}
              disabled={!contractConfirmed}
              title={!contractConfirmed ? 'Vui lòng xác nhận hợp đồng trước khi gửi yêu cầu' : ''}
              style={!contractConfirmed ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              + Gửi yêu cầu hỗ trợ mới
            </button>
          </div>

          <div className="intern-tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="intern-ticket-card">
                <div className="intern-ticket-card__header">
                  <strong>{ticket.type}</strong>
                  <span
                    className={`intern-badge intern-badge--${
                      ticket.status === 'resolved' ? 'success' : 'warn'
                    }`}
                  >
                    {ticket.status === 'resolved' ? '✓ Đã phản hồi' : '⏳ Đang xử lý'}
                  </span>
                </div>
                <p className="intern-ticket-card__body">{ticket.content}</p>

                {ticket.hr_response && (
                  <div className="intern-ticket-response-box">
                    <strong>Phản hồi từ Cán bộ HR:</strong>
                    <p>{ticket.hr_response}</p>
                  </div>
                )}
                <span className="intern-table__sub">Ngày gửi: {ticket.created_at}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL 1: CẬP NHẬT TIẾN ĐỘ TASK (US 16) */}
      {taskUpdateModal.open && (
        <div className="intern-modal-overlay">
          <div className="intern-modal">
            <div className="intern-modal__head">
              <h3>Cập nhật tiến độ nhiệm vụ</h3>
              <button
                type="button"
                className="intern-modal__close"
                onClick={() => setTaskUpdateModal({ open: false, task: null, progress: 0, status: 'doing', note: '' })}
              >
                ✕
              </button>
            </div>

            <div className="intern-modal__body">
              <p><strong>Nhiệm vụ:</strong> {taskUpdateModal.task?.title}</p>

              <div className="intern-modal__field">
                <label htmlFor="task-prog">
                  Tiến độ hoàn thành: <strong>{taskUpdateModal.progress}%</strong>
                </label>
                <input
                  id="task-prog"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={taskUpdateModal.progress}
                  onChange={(e) => setTaskUpdateModal((prev) => ({ ...prev, progress: e.target.value }))}
                  className="intern-modal__range"
                />
              </div>

              <div className="intern-modal__field">
                <label htmlFor="task-stat">Trạng thái công việc:</label>
                <select
                  id="task-stat"
                  value={taskUpdateModal.status}
                  onChange={(e) => setTaskUpdateModal((prev) => ({ ...prev, status: e.target.value }))}
                  className="intern-modal__select"
                >
                  <option value="doing">Đang thực hiện (In Progress)</option>
                  <option value="done">Đã hoàn thành (Chờ Mentor nghiệm thu)</option>
                  <option value="todo">Chưa bắt đầu</option>
                </select>
              </div>

              <div className="intern-modal__field">
                <label htmlFor="task-note">Ghi chú kết quả / Khó khăn cần Mentor hỗ trợ:</label>
                <textarea
                  id="task-note"
                  rows={3}
                  placeholder="Mô tả tóm tắt kết quả đã thực hiện hoặc link Pull Request..."
                  value={taskUpdateModal.note}
                  onChange={(e) => setTaskUpdateModal((prev) => ({ ...prev, note: e.target.value }))}
                  className="intern-modal__textarea"
                />
              </div>
            </div>

            <div className="intern-modal__actions">
              <button
                type="button"
                className="intern-dash__btn intern-dash__btn--ghost"
                onClick={() => setTaskUpdateModal({ open: false, task: null, progress: 0, status: 'doing', note: '' })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="intern-dash__btn intern-dash__btn--primary"
                onClick={handleSaveTaskUpdate}
              >
                Lưu cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NỘP BÁO CÁO TUẦN (US 17) */}
      {reportModal && (
        <div className="intern-modal-overlay">
          <div className="intern-modal">
            <div className="intern-modal__head">
              <h3>Nộp báo cáo thực tập tuần</h3>
              <button type="button" className="intern-modal__close" onClick={() => setReportModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport}>
              <div className="intern-modal__body">
                <div className="intern-modal__field">
                  <label htmlFor="rep-week">Tuần thực tập *:</label>
                  <input
                    id="rep-week"
                    type="text"
                    value={newReport.week_range}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, week_range: e.target.value }))}
                    className="intern-modal__input"
                    required
                  />
                </div>

                <div className="intern-modal__field">
                  <label htmlFor="rep-sum">1. Tóm tắt kết quả công việc đã hoàn thành *:</label>
                  <textarea
                    id="rep-sum"
                    rows={3}
                    placeholder="Mô tả các task đã làm, chức năng đã code, bug đã fix..."
                    value={newReport.summary}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, summary: e.target.value }))}
                    className="intern-modal__textarea"
                    required
                  />
                </div>

                <div className="intern-modal__field">
                  <label htmlFor="rep-iss">2. Khó khăn / Vướng mắc cần Mentor hỗ trợ:</label>
                  <textarea
                    id="rep-iss"
                    rows={2}
                    placeholder="Các vấn đề kỹ thuật chưa giải quyết được..."
                    value={newReport.issues}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, issues: e.target.value }))}
                    className="intern-modal__textarea"
                  />
                </div>

                <div className="intern-modal__field">
                  <label htmlFor="rep-plan">3. Kế hoạch công việc tuần tiếp theo:</label>
                  <textarea
                    id="rep-plan"
                    rows={2}
                    placeholder="Dự kiến hoàn thành các mục tiêu nào..."
                    value={newReport.plan}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, plan: e.target.value }))}
                    className="intern-modal__textarea"
                  />
                </div>

                <div className="intern-modal__field">
                  <label htmlFor="rep-file">Đính kèm file báo cáo chi tiết (.docx, .pdf):</label>
                  <input
                    id="rep-file"
                    type="text"
                    value={newReport.file_name}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, file_name: e.target.value }))}
                    className="intern-modal__input"
                  />
                </div>
              </div>

              <div className="intern-modal__actions">
                <button
                  type="button"
                  className="intern-dash__btn intern-dash__btn--ghost"
                  onClick={() => setReportModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="intern-dash__btn intern-dash__btn--primary">
                  Nộp báo cáo cho Mentor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XIN NGHỈ PHÉP (US 24) */}
      {leaveModal && (
        <div className="intern-modal-overlay">
          <div className="intern-modal">
            <div className="intern-modal__head">
              <h3>Đăng ký xin nghỉ phép</h3>
              <button type="button" className="intern-modal__close" onClick={() => setLeaveModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLeave}>
              <div className="intern-modal__body">
                <div className="intern-modal__field">
                  <label htmlFor="leave-dates">Thời gian xin nghỉ *:</label>
                  <input
                    id="leave-dates"
                    type="text"
                    placeholder="Ví dụ: 05/10/2026 - 06/10/2026 (2 ngày)"
                    value={newLeave.dates}
                    onChange={(e) => setNewLeave((prev) => ({ ...prev, dates: e.target.value }))}
                    className="intern-modal__input"
                    required
                  />
                </div>

                <div className="intern-modal__field">
                  <label htmlFor="leave-reason">Lý do xin nghỉ *:</label>
                  <textarea
                    id="leave-reason"
                    rows={3}
                    placeholder="Ví dụ: Tham gia thi học phần tại trường ICTU, việc gia đình có phép..."
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave((prev) => ({ ...prev, reason: e.target.value }))}
                    className="intern-modal__textarea"
                    required
                  />
                </div>
              </div>

              <div className="intern-modal__actions">
                <button
                  type="button"
                  className="intern-dash__btn intern-dash__btn--ghost"
                  onClick={() => setLeaveModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="intern-dash__btn intern-dash__btn--primary">
                  Gửi đơn xin nghỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: GỬI YÊU CẦU HỖ TRỢ (US 27) */}
      {ticketModal && (
        <div className="intern-modal-overlay">
          <div className="intern-modal">
            <div className="intern-modal__head">
              <h3>Gửi yêu cầu hỗ trợ tới HR</h3>
              <button type="button" className="intern-modal__close" onClick={() => setTicketModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTicket}>
              <div className="intern-modal__body">
                <div className="intern-modal__field">
                  <label htmlFor="ticket-type">Loại yêu cầu *:</label>
                  <select
                    id="ticket-type"
                    value={newTicket.type}
                    onChange={(e) => setNewTicket((prev) => ({ ...prev, type: e.target.value }))}
                    className="intern-modal__select"
                  >
                    <option value="Cấp giấy tờ / Chứng nhận">Cấp giấy xác nhận thực tập</option>
                    <option value="Hỗ trợ thiết bị máy trạm">Hỗ trợ máy tính / Thiết bị</option>
                    <option value="Điều chỉnh ca làm việc">Điều chỉnh lịch / Ca làm việc</option>
                    <option value="Thắc mắc phụ cấp & quyền lợi">Thắc mắc phụ cấp & Quyền lợi</option>
                  </select>
                </div>

                <div className="intern-modal__field">
                  <label htmlFor="ticket-content">Nội dung chi tiết *:</label>
                  <textarea
                    id="ticket-content"
                    rows={4}
                    placeholder="Mô tả cụ thể giấy tờ cần cấp hoặc khó khăn cần bộ phận Nhân sự hỗ trợ..."
                    value={newTicket.content}
                    onChange={(e) => setNewTicket((prev) => ({ ...prev, content: e.target.value }))}
                    className="intern-modal__textarea"
                    required
                  />
                </div>
              </div>

              <div className="intern-modal__actions">
                <button
                  type="button"
                  className="intern-dash__btn intern-dash__btn--ghost"
                  onClick={() => setTicketModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="intern-dash__btn intern-dash__btn--primary">
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
