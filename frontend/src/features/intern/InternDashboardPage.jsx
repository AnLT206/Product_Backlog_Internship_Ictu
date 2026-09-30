import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Star,
  Search,
  Download,
  Plus,
  TrendingUp,
  Award,
  DollarSign,
  ShieldCheck,
  CheckSquare,
  MessageSquare,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import InternApplicantDashboard from './InternApplicantDashboard'
import './InternDashboardPage.css'

const INITIAL_SPRINT1_TASKS = [
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
    note: 'Đã nghiệm thu xong với Mentor Bình, kiến trúc DB đã rõ ràng.',
  },
  {
    id: 3,
    title: 'Viết tài liệu hướng dẫn sử dụng API Swagger',
    description: 'Bổ sung mô tả tóm tắt cho từng endpoint và status code 200, 201, 400, 409.',
    due_at: '2026-10-06',
    priority: 'low',
    status: 'todo',
    progress: 0,
    note: 'Chờ hoàn thành Task 1 để export OpenAPI schema.',
  },
]

const INITIAL_REPORTS = [
  {
    id: 101,
    week_range: 'Tuần 08 (21/09 - 27/09/2026)',
    submitted_at: '27/09/2026 17:30',
    summary: 'Đã hoàn thành module đăng nhập auth, tích hợp JWT token và xử lý phân quyền theo role admin/hr/mentor/intern.',
    issues: 'Gặp chút khó khăn khi cấu hình CORS giữa Vite frontend port 8080 và FastAPI port 8000, đã fix xong.',
    plan: 'Tuần tới tập trung làm giao diện form thêm hồ sơ thực tập sinh cho HR.',
    file_name: 'BaoCaoTuan08_NguyenVanAn.docx',
    feedback: 'Làm rất tốt! Chú ý thêm các trường hợp biên khi token hết hạn nhé.',
    status: 'reviewed',
    score: 4.8,
  },
  {
    id: 102,
    week_range: 'Tuần 07 (14/09 - 20/09/2026)',
    submitted_at: '20/09/2026 17:15',
    summary: 'Tìm hiểu kiến trúc dự án, cài đặt môi trường Docker Compose và kiểm thử API auth/register.',
    issues: 'Không có vướng mắc.',
    plan: 'Phát triển tiếp tính năng login và lưu trữ JWT session.',
    file_name: 'BaoCaoTuan07_NguyenVanAn.docx',
    feedback: 'Báo cáo đầy đủ, tiến độ đạt yêu cầu.',
    status: 'reviewed',
    score: 4.6,
  },
]

const ATTENDANCE_LOGS = [
  { date: '28/09/2026 (Hôm nay)', check_in: '08:15', check_out: '17:30', status: 'on_time' },
  { date: '25/09/2026', check_in: '08:22', check_out: '17:35', status: 'on_time' },
  { date: '24/09/2026', check_in: '08:28', check_out: '17:30', status: 'on_time' },
  { date: '23/09/2026', check_in: '08:50', check_out: '17:40', status: 'late' },
  { date: '22/09/2026', check_in: '08:10', check_out: '17:32', status: 'on_time' },
]

export default function InternDashboardPage() {
  const { user, updateUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isContractSignedLocally, setIsContractSignedLocally] = useState(false)

  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState(INITIAL_SPRINT1_TASKS)
  const [reports] = useState(INITIAL_REPORTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [toast, setToast] = useState(null)

  // Attendance Check-out state
  const [attendance, setAttendance] = useState({
    checkedIn: true,
    checkInTime: '08:15',
    checkedOut: false,
    checkOutTime: null,
  })

  // Modals
  const [taskModal, setTaskModal] = useState({ open: false, task: null, progress: 0, status: 'doing', note: '' })
  const [reportModal, setReportModal] = useState(false)
  const [leaveModal, setLeaveModal] = useState(false)

  // Sync hash with activeTab
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (['tasks', 'reports', 'attendance', 'training', 'allowance', 'contract', 'support'].includes(hash)) {
      setActiveTab(hash)
    } else if (!hash) {
      setActiveTab('tasks')
    }
  }, [location.hash])

  function handleTabChange(tabKey) {
    setActiveTab(tabKey)
    if (tabKey === 'tasks') {
      navigate('/intern/dashboard', { replace: true })
    } else {
      navigate(`/intern/dashboard#${tabKey}`, { replace: true })
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Nếu là ứng viên chưa duyệt (hoặc tài khoản ở trạng thái pending và chưa ký HĐ)
  const isApplicant =
    (user?.status === 'pending' ||
      (user?.email === 'ungvien@ictu.edu.vn' && user?.status !== 'active') ||
      (user?.code === 'TTS9999' && user?.status !== 'active')) &&
    !isContractSignedLocally

  if (isApplicant) {
    return (
      <InternApplicantDashboard
        user={user}
        onContractConfirmed={() => {
          setIsContractSignedLocally(true)
          if (updateUser) {
            updateUser({
              status: 'active',
              code: 'TTS0002',
              full_name: user?.full_name || 'Nguyễn Văn Bình',
            })
          }
          showToast('Ký hợp đồng thành công! Chào mừng bạn gia nhập hệ thống thực tập sinh chính thức.')
        }}
      />
    )
  }

  // Chấm công button
  function handleToggleAttendance() {
    if (!attendance.checkedOut) {
      const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      setAttendance((prev) => ({
        ...prev,
        checkedOut: true,
        checkOutTime: now,
      }))
      showToast(`Check-out thành công lúc ${now}! Chúc bạn buổi chiều vui vẻ.`, 'success')
    } else {
      showToast('Bạn đã hoàn tất ngày làm việc hôm nay (08:15 - ' + attendance.checkOutTime + ').', 'info')
    }
  }

  // Update Task Modal
  function handleOpenTaskModal(task) {
    setTaskModal({
      open: true,
      task,
      progress: task.progress,
      status: task.status,
      note: task.note,
    })
  }

  function handleSaveTask() {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskModal.task.id
          ? {
              ...t,
              progress: Number(taskModal.progress),
              status: taskModal.status,
              note: taskModal.note,
            }
          : t
      )
    )
    setTaskModal({ open: false, task: null, progress: 0, status: 'doing', note: '' })
    showToast('Đã cập nhật tiến độ nhiệm vụ và đồng bộ báo cáo cho Mentor!')
  }


  return (
    <div className="intern-portal-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`portal-toast portal-toast--${toast.type}`} role="alert">
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER KHU VỰC CHÀO MỪNG & TÁC VỤ NHANH ── */}
      <section className="intern-hero-header">
        <div className="intern-hero-content">
          <div className="intern-title-row">
            <h1>Xin chào, {user?.full_name || 'Nguyễn Văn Bình'} 👋</h1>
            <span className="intern-code-pill">Mã TTS: TTS0002</span>
            <span className="intern-status-badge">
              <CheckCircle2 size={14} />
              Chế độ: Đã ký HĐ & Chính thức
            </span>
          </div>

          <div className="intern-meta-grid">
            <div className="intern-meta-item">
              <span className="meta-label">Phòng ban:</span>
              <strong className="meta-val">R&D Software Engineering</strong>
            </div>
            <div className="intern-meta-divider">·</div>
            <div className="intern-meta-item">
              <span className="meta-label">Mentor hướng dẫn:</span>
              <strong className="meta-val">Trần Hoàng Quân (quan.th@ictu.edu.vn - 0912 345 678)</strong>
            </div>
          </div>
        </div>

        {/* Cụm nút tác vụ nhanh */}
        <div className="intern-action-cluster">
          {/* Nút màu cam nổi bật: Check-out ca chiều */}
          <button
            type="button"
            className="intern-btn intern-btn--orange"
            onClick={handleToggleAttendance}
            title="Chấm công check-out ca chiều"
          >
            <Clock size={16} />
            <span>
              {attendance.checkedOut
                ? `Đã Check-out (${attendance.checkOutTime})`
                : 'Check-out ca chiều (08:15 - 17:30)'}
            </span>
          </button>

          <button
            type="button"
            className="intern-btn intern-btn--primary"
            onClick={() => setReportModal(true)}
          >
            <FileText size={16} />
            <span>Nộp báo cáo tuần 08</span>
          </button>

          <button
            type="button"
            className="intern-btn intern-btn--ghost"
            onClick={() => {
              setActiveTab('support')
              showToast('Mở biểu mẫu gửi yêu cầu hỗ trợ (Ticket)', 'info')
            }}
          >
            <MessageSquare size={16} />
            <span>Gửi yêu cầu hỗ trợ (Ticket)</span>
          </button>
        </div>
      </section>

      {/* ── 2. HÀNG CHỈ SỐ KPI CARDS (4 THẺ) ── */}
      <section className="intern-kpi-grid" aria-label="Chỉ số hiệu suất">
        {/* Thẻ 1: Tiến độ kỳ thực tập */}
        <div className="intern-kpi-card intern-kpi-card--blue">
          <div className="kpi-card-header">
            <span className="kpi-label">Tiến độ kỳ thực tập</span>
            <div className="kpi-icon-badge kpi-icon-badge--blue">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">75%</span>
            <span className="kpi-badge-pill kpi-badge-pill--blue">Đếm ngược còn 4 tuần</span>
          </div>
          <div className="kpi-progress-bar">
            <div className="kpi-progress-fill" style={{ width: '75%' }} />
          </div>
          <span className="kpi-hint">Tuần 8 / 12 tuần thực tập tại ICTU</span>
        </div>

        {/* Thẻ 2: Sprint 1 Tasks */}
        <div className="intern-kpi-card intern-kpi-card--purple">
          <div className="kpi-card-header">
            <span className="kpi-label">Sprint 1 Tasks</span>
            <div className="kpi-icon-badge kpi-icon-badge--purple">
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">3</span>
            <span className="kpi-unit">nhiệm vụ</span>
          </div>
          <span className="kpi-hint">1 Đang làm · 1 Chờ nghiệm thu · 1 Hoàn tất</span>
        </div>

        {/* Thẻ 3: Chuyên cần tháng */}
        <div className="intern-kpi-card intern-kpi-card--green">
          <div className="kpi-card-header">
            <span className="kpi-label">Chuyên cần tháng</span>
            <div className="kpi-icon-badge kpi-icon-badge--green">
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">98%</span>
            <span className="kpi-badge-pill kpi-badge-pill--green">Tốt</span>
          </div>
          <span className="kpi-hint">20 ngày đúng giờ · 1 ngày phép có lý do</span>
        </div>

        {/* Thẻ 4: Trợ cấp dự kiến tháng 09 */}
        <div className="intern-kpi-card intern-kpi-card--orange">
          <div className="kpi-card-header">
            <span className="kpi-label">Trợ cấp dự kiến tháng 09</span>
            <div className="kpi-icon-badge kpi-icon-badge--orange">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">2.500.000 đ</span>
          </div>
          <span className="kpi-hint">HR đã duyệt chờ chi trả · Đợt 05/10</span>
        </div>
      </section>

      {/* ── 3. TABS ĐIỀU HƯỚNG NỘI DUNG ── */}
      <nav className="intern-tabs-bar" aria-label="Tabs quản lý">
        <button
          type="button"
          className={`intern-tab-btn ${activeTab === 'tasks' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('tasks')}
        >
          <CheckSquare size={16} />
          <span>Nhiệm vụ cá nhân (Tasks - 3)</span>
        </button>

        <button
          type="button"
          className={`intern-tab-btn ${activeTab === 'attendance' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('attendance')}
        >
          <Clock size={16} />
          <span>Chấm công & Điểm danh</span>
        </button>

        <button
          type="button"
          className={`intern-tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('reports')}
        >
          <FileText size={16} />
          <span>Báo cáo tuần & Feedback (T8)</span>
        </button>

        <button
          type="button"
          className={`intern-tab-btn ${activeTab === 'training' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('training')}
        >
          <ShieldCheck size={16} />
          <span>Tài liệu đào tạo & Onboarding</span>
        </button>

        <button
          type="button"
          className={`intern-tab-btn ${activeTab === 'allowance' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('allowance')}
        >
          <DollarSign size={16} />
          <span>Chế độ & Trợ cấp cá nhân</span>
        </button>
      </nav>

      {/* ── 4. NỘI DUNG CHÍNH CHIA 2 CỘT (70% - 30%) ── */}
      {activeTab === 'tasks' && (
        <div className="intern-main-grid">
          {/* CỘT TRÁI (70%): Bảng nhiệm vụ cá nhân (Task Board & My Sprint) */}
          <div className="intern-col-left">
            <section className="intern-panel">
              <div className="intern-panel-header">
                <div className="panel-header-titles">
                  <h2>Bảng nhiệm vụ cá nhân (Task Board & My Sprint - Sprint 1 / Active)</h2>
                  <p>Theo dõi tiến độ source code, mã commit GitHub và đề xuất nghiệm thu tới Mentor.</p>
                </div>

                <div className="table-controls">
                  <div className="search-input-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Tìm task, commit..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <select
                    className="filter-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="all">Mọi commit</option>
                    <option value="high">Ưu tiên cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>

                  <button
                    type="button"
                    className="intern-btn intern-btn--primary intern-btn--sm"
                    onClick={() => {
                      if (tasks.length > 0) handleOpenTaskModal(tasks[0])
                    }}
                  >
                    <Plus size={15} />
                    <span>+ Log tiến độ</span>
                  </button>
                </div>
              </div>

              {/* Danh sách task kỹ thuật dạng card chi tiết */}
              <div className="task-cards-list">
                {/* Task 1 */}
                <div className="task-detail-card">
                  <div className="task-card-header">
                    <div className="task-code-row">
                      <span className="task-code-tag">BACKEND-104</span>
                      <span className="priority-badge priority-badge--danger">Ưu tiên cao</span>
                      <span className="github-pr-badge">
                        PR #42: feat/backend-intern-api CI Passed
                      </span>
                    </div>
                    <span className="task-status-pill task-status-pill--doing">Đang làm</span>
                  </div>

                  <h3 className="task-card-title">Phát triển REST API Quản lý Hồ sơ Thực tập sinh</h3>
                  <p className="task-card-desc">Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.</p>

                  <div className="task-card-meta">
                    <div className="task-meta-item">
                      <Clock size={13} />
                      <span>Hạn hoàn thành: <strong>2026-10-02</strong></span>
                    </div>
                    <div className="task-meta-item">
                      <FileText size={13} />
                      <span>Nhật ký code mới nhất: <em>feat(api): validate Pydantic schemas & routes</em></span>
                    </div>
                  </div>

                  <div className="task-card-footer">
                    <div className="task-progress-box">
                      <span className="task-progress-label">Tiến độ: <strong>70%</strong></span>
                      <div className="progress-bar-track">
                        <div className="progress-bar-val" style={{ width: '70%' }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="intern-btn intern-btn--outline intern-btn--sm"
                      onClick={() => handleOpenTaskModal(tasks[0])}
                    >
                      Cập nhật %
                    </button>
                  </div>
                </div>

                {/* Task 2 */}
                <div className="task-detail-card">
                  <div className="task-card-header">
                    <div className="task-code-row">
                      <span className="task-code-tag">DOCS-089</span>
                      <span className="priority-badge priority-badge--warning">Trung bình</span>
                      <span className="github-pr-badge github-pr-badge--merged">
                        Merged: docs/spec-v2.1
                      </span>
                    </div>
                    <span className="task-status-pill task-status-pill--done">Hoàn thành 100% (Nghiệm thu)</span>
                  </div>

                  <h3 className="task-card-title">Nghiên cứu tài liệu Software Specification v2.1 (Spec flow)</h3>
                  <p className="task-card-desc">Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.</p>

                  <div className="task-card-meta">
                    <div className="task-meta-item">
                      <Clock size={13} />
                      <span>Hạn hoàn thành: <strong>2026-09-24</strong></span>
                    </div>
                    <div className="task-meta-item">
                      <FileText size={13} />
                      <span>Nhật ký code mới nhất: <em>docs(spec): merge sequence diagrams</em></span>
                    </div>
                  </div>

                  <div className="task-card-footer">
                    <div className="task-progress-box">
                      <span className="task-progress-label">Tiến độ: <strong>100%</strong></span>
                      <div className="progress-bar-track">
                        <div className="progress-bar-val is-complete" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="intern-btn intern-btn--outline intern-btn--sm"
                      onClick={() => showToast('Mở tài liệu chi tiết Software Specification v2.1', 'info')}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>

                {/* Task 3 */}
                <div className="task-detail-card">
                  <div className="task-card-header">
                    <div className="task-code-row">
                      <span className="task-code-tag">TEST-042</span>
                      <span className="priority-badge priority-badge--info">Trung bình</span>
                      <span className="github-pr-badge github-pr-badge--review">
                        PR #45: test/attendance-coverage Reviewing
                      </span>
                    </div>
                    <span className="task-status-pill task-status-pill--review">Chờ nghiệm thu (85%)</span>
                  </div>

                  <h3 className="task-card-title">Viết Unit Test cho Module Chấm công tự động</h3>
                  <p className="task-card-desc">Viết test case mock GPS, kiểm tra logic xử lý đi muộn và tính tổng công tháng.</p>

                  <div className="task-card-meta">
                    <div className="task-meta-item">
                      <Clock size={13} />
                      <span>Hạn hoàn thành: <strong>2026-10-06</strong></span>
                    </div>
                    <div className="task-meta-item">
                      <FileText size={13} />
                      <span>Nhật ký code mới nhất: <em>test(attendance): add unit test cases for lateness check</em></span>
                    </div>
                  </div>

                  <div className="task-card-footer">
                    <div className="task-progress-box">
                      <span className="task-progress-label">Tiến độ: <strong>85%</strong></span>
                      <div className="progress-bar-track">
                        <div className="progress-bar-val" style={{ width: '85%' }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="intern-btn intern-btn--primary intern-btn--sm"
                      onClick={() => showToast('Đã gửi yêu cầu nghiệm thu Unit Test tới Mentor Bình!', 'success')}
                    >
                      Xin duyệt
                    </button>
                  </div>
                </div>
              </div>

              {/* Khối ghi chú Mentor */}
              <div className="mentor-notes-card">
                <div className="mentor-notes-header">
                  <div className="mentor-notes-title-group">
                    <Star size={18} className="star-icon" fill="#F59E0B" color="#F59E0B" />
                    <h3>Nhật ký & Nhận xét mới nhất từ Mentor Trần Hoàng Quân</h3>
                  </div>
                  <div className="mentor-score-tags">
                    <span className="score-pill">Điểm tuần: <strong>9.5/10</strong></span>
                    <span className="score-pill score-pill--green">Điểm giữa kỳ: <strong>4.8/5.0</strong></span>
                  </div>
                </div>
                <div className="mentor-notes-body">
                  <p>
                    "An làm việc rất có trách nhiệm, tư duy clean code và khả năng tối ưu hóa API (High performance) rất tốt. Chú ý viết thêm tài liệu Swagger rõ ràng cho các error code 400/409 để bên FE dễ tích hợp nhé."
                  </p>
                  <div className="mentor-notes-badges">
                    <span className="tag-pill">Clean code</span>
                    <span className="tag-pill">High performance</span>
                    <span className="tag-pill">Proactive communication</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* CỘT PHẢI (30%): Khối Điểm danh & Chấm công GPS / Wi-Fi cơ quan */}
          <div className="intern-col-right">
            <section className="attendance-gps-card">
              <div className="att-card-header">
                <div>
                  <h3>Điểm danh & Chấm công</h3>
                  <span className="att-sub">GPS / Wi-Fi Cơ Quan</span>
                </div>
                <span className="status-badge status-badge--success">
                  <CheckCircle2 size={13} />
                  Ca làm việc hợp lệ
                </span>
              </div>

              <div className="att-info-list">
                <div className="att-info-item">
                  <span className="att-info-lbl">Wi-Fi doanh nghiệp:</span>
                  <strong className="att-info-val text-primary">ICTU-RD-OFFICE</strong>
                </div>

                <div className="att-info-item">
                  <span className="att-info-lbl">IP xác thực:</span>
                  <code className="att-ip-code">192.168.1.45</code>
                </div>

                <div className="att-info-item">
                  <span className="att-info-lbl">Camera AI nhận diện:</span>
                  <strong className="att-info-val text-success">Khuôn mặt hợp lệ (99.4%)</strong>
                </div>

                <div className="att-info-item">
                  <span className="att-info-lbl">Giờ check-in sáng:</span>
                  <strong className="att-info-val">08:15:22 (Đúng giờ)</strong>
                </div>
              </div>

              <div className="att-reminder-callout">
                <Clock size={16} />
                <p>Thông báo: Ca chiều kết thúc lúc <strong>17:30</strong>. Vui lòng hoàn tất công việc trước khi ra về.</p>
              </div>

              <button
                type="button"
                className={`intern-btn-big-checkout ${attendance.checkedOut ? 'is-checked-out' : ''}`}
                onClick={handleToggleAttendance}
              >
                <Clock size={18} />
                <span>
                  {attendance.checkedOut
                    ? `Đã hoàn tất ngày làm việc (${attendance.checkOutTime})`
                    : 'Check-out ca chiều ngay'}
                </span>
              </button>
            </section>
          </div>
        </div>
      )}
      {/* TAB 2: BÁO CÁO TUẦN */}
      {activeTab === 'reports' && (
        <section className="intern-panel">
          <div className="intern-panel-header">
            <div className="panel-header-titles">
              <h2>Báo cáo thực tập tuần & Nhận xét của Mentor</h2>
              <p>Nộp báo cáo định kỳ trước 18:00 thứ Sáu hàng tuần để Mentor đánh giá kết quả Sprint.</p>
            </div>
            <button
              type="button"
              className="intern-btn intern-btn--primary"
              onClick={() => setReportModal(true)}
            >
              <Plus size={16} />
              <span>Nộp báo cáo tuần mới</span>
            </button>
          </div>

          <div className="reports-stack">
            {reports.map((report) => (
              <div key={report.id} className="report-card-item">
                <div className="report-card-top">
                  <div>
                    <h3 className="report-title">{report.week_range}</h3>
                    <span className="report-timestamp">Nộp lúc: {report.submitted_at}</span>
                  </div>
                  <span className="status-badge status-badge--success">
                    <CheckCircle2 size={13} />
                    Mentor đã nhận xét
                  </span>
                </div>
                <div className="report-body">
                  <div className="report-section">
                    <strong>1. Kết quả công việc đạt được trong tuần:</strong>
                    <p>{report.summary}</p>
                  </div>
                  <div className="report-section">
                    <strong>2. Khó khăn gặp phải:</strong>
                    <p>{report.issues}</p>
                  </div>
                  <div className="report-section">
                    <strong>3. Kế hoạch tuần tới:</strong>
                    <p>{report.plan}</p>
                  </div>
                  {report.feedback && (
                    <div className="report-feedback-box">
                      <div className="feedback-header">
                        <strong>Nhận xét từ Mentor Trần Hoàng Quân:</strong>
                        <div className="feedback-score">
                          <Star size={14} className="star-icon" fill="#F59E0B" color="#F59E0B" />
                          <span>{report.score}/5.0</span>
                        </div>
                      </div>
                      <p>"{report.feedback}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: CHẤM CÔNG */}
      {activeTab === 'attendance' && (
        <section className="intern-panel">
          <div className="intern-panel-header">
            <div className="panel-header-titles">
              <h2>Lịch sử chấm công hàng ngày (Check-in / Check-out)</h2>
              <p>Hệ thống ghi nhận thời gian làm việc tự động tại Trung tâm ICTU.</p>
            </div>
          </div>
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {ATTENDANCE_LOGS.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.date}</strong></td>
                  <td>{item.check_in}</td>
                  <td>{item.check_out}</td>
                  <td>
                    <span className={`status-badge status-badge--${item.status === 'on_time' ? 'success' : 'warning'}`}>
                      {item.status === 'on_time' ? 'Đúng giờ' : 'Đi muộn'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* TAB 4: HỢP ĐỒNG */}
      {activeTab === 'contract' && (
        <section className="intern-panel">
          <div className="intern-panel-header">
            <div className="panel-header-titles">
              <h2>Hợp đồng thực tập & Đánh giá năng lực</h2>
              <p>Văn bản pháp lý bảo đảm quyền lợi thực tập và chứng nhận kết quả đào tạo.</p>
            </div>
          </div>
          <div className="contract-box">
            <div className="contract-info-left">
              <FileText size={32} color="#2563EB" />
              <div>
                <h3>HopDongThucTap_ICTU_TTS0002_NguyenVanAn.pdf</h3>
                <p>Doanh nghiệp: ICTU Software & AI Center · Thời hạn: 01/07/2026 - 31/10/2026</p>
                <span className="status-badge status-badge--success">Đã ký kết hợp lệ & Lưu trữ hệ thống</span>
              </div>
            </div>
            <button
              type="button"
              className="intern-btn intern-btn--outline"
              onClick={() => showToast('Đang tải file hợp đồng PDF về máy...')}
            >
              <Download size={16} />
              <span>Tải bản sao hợp đồng</span>
            </button>
          </div>
        </section>
      )}

      {/* TAB 5: YÊU CẦU HỖ TRỢ */}
      {activeTab === 'support' && (
        <section className="intern-panel">
          <div className="intern-panel-header">
            <div className="panel-header-titles">
              <h2>Phiếu yêu cầu hỗ trợ (Support Tickets)</h2>
              <p>Gửi yêu cầu cấp giấy chứng nhận thực tập, cấp tài khoản mạng, đổi máy trạm.</p>
            </div>
          </div>
          <div className="ticket-card">
            <div className="ticket-header">
              <strong>Cấp giấy chứng nhận thực tập (Khoa CNTT - ĐH ICTU)</strong>
              <span className="status-badge status-badge--success">Đã xử lý xong</span>
            </div>
            <p className="ticket-desc">Em cần xin giấy xác nhận đang thực tập tại công ty để nộp về khoa CNTT trường ICTU.</p>
            <div className="ticket-reply">
              <strong>Phòng Nhân sự HR (14:20 28/09):</strong>
              <p>Phòng Nhân sự đã ký và đóng dấu giấy xác nhận. Em có thể qua phòng HR (P.302) nhận bản cứng nhé.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. FOOTER WIDGETS (2 CỘT) ── */}
      <section className="intern-footer-widgets-grid">
        {/* Cột 1: Nhận xét gần nhất từ Mentor Trần Hoàng Quân (kèm điểm đánh giá 4.8/5.0) */}
        <div className="footer-widget-card">
          <div className="widget-card-header">
            <div className="widget-header-title">
              <Star size={18} className="star-icon-filled" />
              <h3>Nhận xét gần nhất từ Mentor Trần Hoàng Quân</h3>
            </div>
            <div className="widget-rating-badge">
              <span className="rating-num">4.8</span>
              <span className="rating-max">/ 5.0</span>
            </div>
          </div>

          <div className="widget-card-body">
            <div className="stars-row">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  fill={s <= 4 ? '#F59E0B' : '#E2E8F0'}
                  color={s <= 4 ? '#F59E0B' : '#CBD5E1'}
                />
              ))}
              <span className="stars-label">Đánh giá Sprint 1 · Tuần 08</span>
            </div>

            <blockquote className="mentor-quote">
              "Bình tiếp thu kiến trúc hệ thống rất nhanh, chủ động tìm hiểu Docker và xử lý xong API auth đúng hạn. Cần chú ý thêm log validation cho các edge case."
            </blockquote>

            <div className="mentor-sign-row">
              <div className="mentor-avatar">Q</div>
              <div className="mentor-details">
                <strong>Mentor Trần Hoàng Quân</strong>
                <span>Trưởng nhóm Kỹ thuật phần mềm · ICTU Center</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột 2: Checklist "Lưu ý tuần 08" (lịch chấm công, deadline báo cáo, lịch họp sync) */}
        <div className="footer-widget-card">
          <div className="widget-card-header">
            <div className="widget-header-title">
              <Calendar size={18} className="calendar-icon-widget" />
              <h3>Lưu ý tuần 08</h3>
            </div>
            <span className="widget-week-tag">Tuần hiện tại</span>
          </div>

          <div className="widget-card-body">
            <div className="checklist-stack">
              {/* Item 1: Lịch chấm công */}
              <div className="checklist-item is-checked">
                <div className="checklist-icon-wrap checklist-icon-wrap--done">
                  <CheckCircle2 size={16} />
                </div>
                <div className="checklist-text">
                  <strong>Lịch chấm công hàng ngày</strong>
                  <p>Check-in trước 08:30 sáng tại cổng ICTU. (Hôm nay: Đã check-in lúc 08:15 đúng giờ).</p>
                </div>
              </div>

              {/* Item 2: Deadline báo cáo */}
              <div className="checklist-item">
                <div className="checklist-icon-wrap checklist-icon-wrap--pending">
                  <Clock size={16} />
                </div>
                <div className="checklist-text">
                  <strong>Deadline nộp Báo cáo tuần 08</strong>
                  <p>Hoàn thành và tải file đính kèm trước 18:00 Thứ Sáu (02/10/2026).</p>
                </div>
              </div>

              {/* Item 3: Lịch họp sync */}
              <div className="checklist-item">
                <div className="checklist-icon-wrap checklist-icon-wrap--meeting">
                  <Calendar size={16} />
                </div>
                <div className="checklist-text">
                  <strong>Lịch họp Sync Sprint 1</strong>
                  <p>Họp trực tiếp cùng Mentor lúc 09:30 Thứ Hai tại Phòng Hội đồng P.301.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODAL CẬP NHẬT TIẾN ĐỘ NHIỆM VỤ ── */}
      {taskModal.open && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Cập nhật tiến độ nhiệm vụ</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setTaskModal({ open: false, task: null, progress: 0, status: 'doing', note: '' })}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Nhiệm vụ:</label>
                <strong>{taskModal.task?.title}</strong>
              </div>

              <div className="modal-field">
                <label htmlFor="task-progress-slider">
                  Tiến độ hoàn thành: <strong>{taskModal.progress}%</strong>
                </label>
                <input
                  id="task-progress-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={taskModal.progress}
                  onChange={(e) => setTaskModal({ ...taskModal, progress: Number(e.target.value) })}
                  className="modal-range"
                />
              </div>

              <div className="modal-field">
                <label htmlFor="task-status-select">Trạng thái:</label>
                <select
                  id="task-status-select"
                  value={taskModal.status}
                  onChange={(e) => setTaskModal({ ...taskModal, status: e.target.value })}
                  className="modal-select"
                >
                  <option value="doing">Đang thực hiện</option>
                  <option value="done">Đã hoàn thành</option>
                  <option value="todo">Chưa bắt đầu</option>
                </select>
              </div>

              <div className="modal-field">
                <label htmlFor="task-note-input">Ghi chú kết quả & bàn giao:</label>
                <textarea
                  id="task-note-input"
                  rows={3}
                  value={taskModal.note}
                  onChange={(e) => setTaskModal({ ...taskModal, note: e.target.value })}
                  placeholder="Ghi chú các công việc đã làm hoặc khó khăn cần Mentor hỗ trợ..."
                  className="modal-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="intern-btn intern-btn--ghost"
                onClick={() => setTaskModal({ open: false, task: null, progress: 0, status: 'doing', note: '' })}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="intern-btn intern-btn--primary"
                onClick={handleSaveTask}
              >
                Lưu cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NỘP BÁO CÁO TUẦN ── */}
      {reportModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Nộp báo cáo thực tập tuần 08</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setReportModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label htmlFor="rep-summary">1. Kết quả công việc đạt được:</label>
                <textarea
                  id="rep-summary"
                  rows={3}
                  placeholder="Tóm tắt công việc bạn đã hoàn thành trong tuần..."
                  className="modal-textarea"
                />
              </div>
              <div className="modal-field">
                <label htmlFor="rep-issues">2. Khó khăn gặp phải (nếu có):</label>
                <input
                  id="rep-issues"
                  type="text"
                  placeholder="Vấn đề cần Mentor hỗ trợ..."
                  className="modal-input"
                />
              </div>
              <div className="modal-field">
                <label htmlFor="rep-plan">3. Kế hoạch tuần kế tiếp:</label>
                <input
                  id="rep-plan"
                  type="text"
                  placeholder="Nhiệm vụ tiếp theo..."
                  className="modal-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="intern-btn intern-btn--ghost"
                onClick={() => setReportModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="intern-btn intern-btn--primary"
                onClick={() => {
                  setReportModal(false)
                  showToast('Đã nộp báo cáo tuần 08 thành công cho Mentor Trần Hoàng Quân!')
                }}
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XIN NGHỈ PHÉP ── */}
      {leaveModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Đăng ký xin nghỉ phép</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setLeaveModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label htmlFor="leave-dates">Thời gian xin nghỉ:</label>
                <input
                  id="leave-dates"
                  type="text"
                  placeholder="Ví dụ: 05/10/2026 (1 ngày)"
                  className="modal-input"
                />
              </div>
              <div className="modal-field">
                <label htmlFor="leave-reason">Lý do xin nghỉ:</label>
                <textarea
                  id="leave-reason"
                  rows={3}
                  placeholder="Trùng lịch thi kết thúc học phần tại trường ICTU..."
                  className="modal-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="intern-btn intern-btn--ghost"
                onClick={() => setLeaveModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="intern-btn intern-btn--primary"
                onClick={() => {
                  setLeaveModal(false)
                  showToast('Đã gửi đơn xin nghỉ phép tới cán bộ HR xem xét!')
                }}
              >
                Gửi đơn xin nghỉ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
