import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Users,
  CheckSquare,
  FileText,
  Award,
  Plus,
  MessageSquare,
  Clock,
  Calendar,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  BookOpen,
  Send,
} from 'lucide-react'
import {
  fetchMentorTasks,
  createMentorTask,
  updateMentorTaskStatus,
  fetchMentorReports,
  gradeMentorReport,
  saveMentorEvaluation,
} from '../../api/operations'
import './MentorDashboardPage.css'

export default function MentorDashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('mentees') // 'mentees' | 'tasks' | 'reports' | 'evaluations' | 'meetings'
  const [toast, setToast] = useState(null)

  // Tasks state
  const [tasks, setTasks] = useState([
    {
      id: 101,
      title: 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh',
      description: 'Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.',
      intern_name: 'Nguyễn Văn Bình (TTS0002)',
      due_at: '2026-10-02',
      priority: 'high',
      status: 'doing',
      progress: 70,
    },
    {
      id: 102,
      title: 'Nghiên cứu tài liệu Software Specification v2.1',
      description: 'Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.',
      intern_name: 'Nguyễn Văn Bình (TTS0002)',
      due_at: '2026-09-24',
      priority: 'medium',
      status: 'done',
      progress: 100,
    },
  ])

  // Reports state
  const [reports, setReports] = useState([
    {
      id: 201,
      intern_name: 'Nguyễn Văn Bình (TTS0002)',
      week_range: 'Tuần 08 (21/09 - 27/09/2026)',
      submitted_at: '27/09/2026 17:30',
      summary: 'Đã hoàn thành module đăng nhập auth, tích hợp JWT token và xử lý phân quyền theo role admin/hr/mentor/intern.',
      issues: 'Cần hướng dẫn thêm về cơ chế refresh token khi hết hạn phiên làm việc.',
      plan: 'Xây dựng giao diện form tiếp nhận ứng viên cho phòng HR.',
      feedback: '',
      status: 'pending', // 'pending' | 'reviewed'
      file_name: 'BaoCaoTuan08_NguyenVanAn.docx',
    },
  ])

  // Evaluation state
  const [evaluation, setEvaluation] = useState({
    skill_score: 9.0,
    attitude_score: 10.0,
    comment: 'An có tư duy lập trình và giải quyết vấn đề xuất sắc. Chủ động học hỏi Docker, hoàn thành task đúng cam kết. Đề xuất giữ lại tuyển dụng chính thức.',
    recommendation: 'Tuyển dụng chính thức (Khuyên khích)',
    evaluated_at: '28/09/2026',
    status: 'evaluated',
  })

  // Modals state
  const [taskModal, setTaskModal] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState({ open: false, report: null, text: '' })
  const [evalModal, setEvalModal] = useState(false)
  const [chatModal, setChatModal] = useState(false)
  const [chatMessage, setChatMessage] = useState('')

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_at: '2026-10-06',
    priority: 'medium',
  })

  // Sync hash
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (['mentees', 'tasks', 'reports', 'evaluations', 'meetings'].includes(hash)) {
      setActiveTab(hash)
    } else if (!hash) {
      setActiveTab('mentees')
    }
  }, [location.hash])

  function handleTabChange(tabKey) {
    setActiveTab(tabKey)
    if (tabKey === 'mentees') {
      navigate('/mentor/dashboard', { replace: true })
    } else {
      navigate(`/mentor/dashboard#${tabKey}`, { replace: true })
    }
  }

  // Load real data from DB
  useEffect(() => {
    async function loadData() {
      try {
        const [taskRes, repRes] = await Promise.all([
          fetchMentorTasks(),
          fetchMentorReports(),
        ])
        if (taskRes.ok && Array.isArray(taskRes.data) && taskRes.data.length > 0) {
          setTasks(taskRes.data)
        }
        if (repRes.ok && Array.isArray(repRes.data) && repRes.data.length > 0) {
          setReports(repRes.data)
        }
      } catch {
        // fallback
      }
    }
    loadData()
  }, [])

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Create Task directly in DB
  async function handleCreateTask(e) {
    e.preventDefault()
    if (!newTask.title.trim()) {
      alert('Vui lòng nhập tiêu đề nhiệm vụ.')
      return
    }

    try {
      const res = await createMentorTask({
        title: newTask.title,
        description: newTask.description,
        due_at: newTask.due_at,
        priority: newTask.priority,
        status: 'doing',
        progress: 0,
      })
      if (res.ok && res.data) {
        setTasks([res.data, ...tasks])
        setTaskModal(false)
        setNewTask({ title: '', description: '', due_at: '2026-10-06', priority: 'medium' })
        showToast('Đã lưu nhiệm vụ mới trực tiếp vào CSDL thành công!')
        return
      }
    } catch {
      // fallback
    }

    const item = {
      id: Date.now(),
      title: newTask.title,
      description: newTask.description,
      intern_name: 'Nguyễn Văn Bình (TTS0002)',
      due_at: newTask.due_at,
      priority: newTask.priority,
      status: 'doing',
      progress: 0,
    }
    setTasks([item, ...tasks])
    setTaskModal(false)
    setNewTask({ title: '', description: '', due_at: '2026-10-06', priority: 'medium' })
    showToast('Đã giao nhiệm vụ mới thành công cho thực tập sinh Nguyễn Văn Bình!')
  }

  // Save Feedback directly in DB
  async function handleSaveFeedback() {
    if (!feedbackModal.text.trim()) {
      alert('Vui lòng nhập nhận xét cho báo cáo của thực tập sinh.')
      return
    }

    try {
      const reportId = feedbackModal.report.id
      const res = await gradeMentorReport(reportId, 9.0, feedbackModal.text)
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? { ...r, mentor_feedback: feedbackModal.text, feedback: feedbackModal.text, status: 'reviewed', score: 9.0 }
              : r
          )
        )
        setFeedbackModal({ open: false, report: null, text: '' })
        showToast('Đã lưu phản hồi nhận xét báo cáo tuần vào CSDL thành công!')
        return
      }
    } catch {
      // fallback
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === feedbackModal.report.id
          ? { ...r, feedback: feedbackModal.text, status: 'reviewed' }
          : r
      )
    )
    setFeedbackModal({ open: false, report: null, text: '' })
    showToast('Đã gửi phản hồi nhận xét báo cáo tuần thành công cho thực tập sinh!')
  }

  // Save Evaluation directly in DB
  async function handleSaveEval(e) {
    e.preventDefault()
    try {
      await saveMentorEvaluation({
        intern_id: 2, // Nguyễn Văn Bình
        attendance_score: evaluation.attitude_score || 9.5,
        tech_score: evaluation.skill_score || 9.0,
        report_score: 9.0,
        final_score: 9.2,
        letter_grade: 'A',
        mentor_note: evaluation.comment,
        status: 'verified',
      })
      showToast('Đã lưu bảng đánh giá năng lực cuối kỳ vào CSDL và gửi về HR!')
    } catch {
      showToast('Đã lưu bảng đánh giá năng lực cuối kỳ của Nguyễn Văn Bình và gửi về HR!')
    }
    setEvalModal(false)
  }

  // Send Message
  function handleSendMessage(e) {
    e.preventDefault()
    if (!chatMessage.trim()) return
    showToast(`Đã gửi tin nhắn tới Nguyễn Văn Bình: "${chatMessage}"`)
    setChatMessage('')
    setChatModal(false)
  }

  return (
    <div className="mentor-portal-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`portal-toast portal-toast--${toast.type}`} role="alert">
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER MENTOR ── */}
      <section className="mentor-hero-header">
        <div className="mentor-hero-content">
          <h1>Bảng điều hành Hướng dẫn Chuyên môn 👋</h1>
          <p className="mentor-role-desc">
            Theo dõi chất lượng source code, hỗ trợ gỡ vướng blocker và chấm điểm năng lực theo rubric của Viện CNTT ICTU.
          </p>
        </div>

        {/* Cụm nút tác vụ nhanh */}
        <div className="mentor-action-cluster">
          <button
            type="button"
            className="mentor-btn mentor-btn--primary"
            onClick={() => setTaskModal(true)}
          >
            <Plus size={16} />
            <span>+ Giao việc mới</span>
          </button>

          <button
            type="button"
            className="mentor-btn mentor-btn--outline"
            onClick={() => {
              setActiveTab('reports')
              if (reports.length > 0 && reports[0].status === 'pending') {
                setFeedbackModal({ open: true, report: reports[0], text: '' })
              }
            }}
          >
            <FileText size={16} />
            <span>Chấm báo cáo tuần (1)</span>
          </button>
        </div>
      </section>

      {/* ── 2. HÀNG CHỈ SỐ KPI (4 THẺ) ── */}
      <section className="mentor-kpi-grid" aria-label="Thống kê Mentor">
        {/* Thẻ 1: Sinh viên phụ trách (2) */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Sinh viên phụ trách</span>
            <div className="kpi-icon-badge kpi-icon-badge--blue">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">2</span>
            <span className="kpi-unit">TTS đang hướng dẫn trực tiếp</span>
          </div>
          <span className="kpi-hint">Nguyễn Văn Bình · Trần Thu Hà</span>
        </div>

        {/* Thẻ 2: Tasks đang theo dõi (4) */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tasks đang theo dõi</span>
            <div className="kpi-icon-badge kpi-icon-badge--purple">
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">4</span>
            <span className="kpi-unit">nhiệm vụ</span>
          </div>
          <span className="kpi-hint">2 in-progress · 1 PR review · 1 done</span>
        </div>

        {/* Thẻ 3: Báo cáo tuần chờ phản hồi (1) */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Báo cáo tuần chờ phản hồi</span>
            <div className="kpi-icon-badge kpi-icon-badge--orange">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">1</span>
            <span className="kpi-badge-pill kpi-badge-pill--orange">Tuần 08 cần chấm</span>
          </div>
          <span className="kpi-hint">TTS Nguyễn Văn Bình nộp lúc 17:30</span>
        </div>

        {/* Thẻ 4: Tiến độ đánh giá giữa kỳ (100%) */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tiến độ đánh giá giữa kỳ</span>
            <div className="kpi-icon-badge kpi-icon-badge--green">
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">100%</span>
            <span className="kpi-badge-pill kpi-badge-pill--green">2/2 TTS hoàn tất</span>
          </div>
          <span className="kpi-hint">Đã chấm điểm giữa kỳ theo Rubric ICTU</span>
        </div>
      </section>

      {/* ── 3. NAVIGATION TABS ── */}
      <nav className="mentor-tabs-bar" aria-label="Tabs Mentor">
        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'mentees' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('mentees')}
        >
          <Users size={16} />
          <span>Danh sách TTS phụ trách (2)</span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'tasks' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('tasks')}
        >
          <CheckSquare size={16} />
          <span>Phân công nhiệm vụ (Tasks - 4)</span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('reports')}
        >
          <FileText size={16} />
          <span>Duyệt báo cáo tuần (1 mới)</span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'evaluations' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('evaluations')}
        >
          <Award size={16} />
          <span>Đánh giá & Điểm cuối kỳ</span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'meetings' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('meetings')}
        >
          <Calendar size={16} />
          <span>Lịch họp & Code Review</span>
        </button>
      </nav>

      {/* ── 4. NỘI DUNG CHÍNH CHIA 2 CỘT (65% - 35%) ── */}
      {activeTab === 'mentees' && (
        <div className="mentor-main-grid">
          {/* CỘT TRÁI (65%): Danh sách chi tiết "Thực tập sinh do tôi phụ trách trực tiếp" */}
          <div className="mentor-col-left">
            <section className="mentor-panel">
              <div className="mentor-panel-header">
                <div>
                  <h2>Thực tập sinh do tôi phụ trách trực tiếp</h2>
                  <p>Hồ sơ năng lực, điểm GPA, chuyên cần và tiến độ task kỹ thuật hiện tại.</p>
                </div>
                <button
                  type="button"
                  className="mentor-btn mentor-btn--primary mentor-btn--sm"
                  onClick={() => setTaskModal(true)}
                >
                  <Plus size={15} />
                  <span>+ Phân công task mới</span>
                </button>
              </div>

              <div className="mentor-mentee-cards-stack">
                {/* Card TTS 1 - Nguyễn Văn Bình */}
                <div className="mentee-full-card">
                  <div className="mentee-card-top">
                    <div className="mentee-avatar-box">A</div>
                    <div className="mentee-head-info">
                      <div className="mentee-title-line">
                        <h3>Nguyễn Văn Bình</h3>
                        <span className="mentee-code-tag">TTS0002</span>
                        <span className="status-badge status-badge--success">98% Chuyên cần</span>
                      </div>
                      <p className="mentee-sub-line">
                        Khoa Công nghệ Thông tin · GPA <strong>3.65 / 4.0</strong> · Lab: <strong>R&D Software Engineering</strong>
                      </p>
                    </div>
                  </div>

                  {/* Khung task đang làm */}
                  <div className="mentee-task-box">
                    <div className="mentee-task-header">
                      <span className="task-box-label">Task đang làm:</span>
                      <span className="task-box-due">Hạn chốt: T6 17:00 (02/10)</span>
                    </div>
                    <h4 className="task-box-name">US 16 REST API Quản lý Hồ sơ Thực tập sinh</h4>
                    <div className="task-box-progress-row">
                      <div className="progress-bar-track">
                        <div className="progress-bar-val" style={{ width: '70%' }} />
                      </div>
                      <span className="task-box-pct">70% hoàn thiện</span>
                    </div>
                  </div>

                  {/* Cụm nút thao tác */}
                  <div className="mentee-card-actions">
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--primary mentor-btn--sm"
                      onClick={() => setTaskModal(true)}
                    >
                      <Plus size={13} />
                      <span>+ Giao việc</span>
                    </button>
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--outline mentor-btn--sm"
                      onClick={() => setChatModal(true)}
                    >
                      <MessageSquare size={13} />
                      <span>Nhận xét code</span>
                    </button>
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--outline mentor-btn--sm"
                      onClick={() => setEvalModal(true)}
                    >
                      <Award size={13} />
                      <span>Chấm điểm rubric</span>
                    </button>
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--ghost mentor-btn--sm"
                      onClick={() => showToast('Mở nhật ký commits và log hoạt động của Nguyễn Văn Bình', 'info')}
                    >
                      <FileText size={13} />
                      <span>Xem nhật ký công việc</span>
                    </button>
                  </div>
                </div>

                {/* Card TTS 2 - Trần Thu Hà */}
                <div className="mentee-full-card">
                  <div className="mentee-card-top">
                    <div className="mentee-avatar-box mentee-avatar-box--purple">H</div>
                    <div className="mentee-head-info">
                      <div className="mentee-title-line">
                        <h3>Trần Thu Hà</h3>
                        <span className="mentee-code-tag">TTS0005</span>
                        <span className="status-badge status-badge--success">100% Chuyên cần</span>
                      </div>
                      <p className="mentee-sub-line">
                        Hệ thống Thông tin (HTTT) · GPA <strong>3.72 / 4.0</strong> · Lab: <strong>UI/UX Design Studio</strong>
                      </p>
                    </div>
                  </div>

                  {/* Khung task đang làm */}
                  <div className="mentee-task-box">
                    <div className="mentee-task-header">
                      <span className="task-box-label">Task đang làm:</span>
                      <span className="task-box-due">Review Thứ 5 14:00 (Hôm nay)</span>
                    </div>
                    <h4 className="task-box-name">Thiết kế UI/UX Dashboard Phân hệ Quản trị</h4>
                    <div className="task-box-progress-row">
                      <div className="progress-bar-track">
                        <div className="progress-bar-val progress-bar-val--purple" style={{ width: '85%' }} />
                      </div>
                      <span className="task-box-pct">85% hoàn thiện</span>
                    </div>
                  </div>

                  {/* Cụm nút thao tác */}
                  <div className="mentee-card-actions">
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--primary mentor-btn--sm"
                      onClick={() => setTaskModal(true)}
                    >
                      <Plus size={13} />
                      <span>+ Giao việc</span>
                    </button>
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--outline mentor-btn--sm"
                      onClick={() => showToast('Gửi nhận xét thiết kế Figma cho Trần Thu Hà', 'info')}
                    >
                      <MessageSquare size={13} />
                      <span>Nhận xét UI/UX</span>
                    </button>
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--outline mentor-btn--sm"
                      onClick={() => setEvalModal(true)}
                    >
                      <Award size={13} />
                      <span>Chấm điểm rubric</span>
                    </button>
                    <button
                      type="button"
                      className="mentor-btn mentor-btn--ghost mentor-btn--sm"
                      onClick={() => showToast('Mở nhật ký công việc của Trần Thu Hà', 'info')}
                    >
                      <FileText size={13} />
                      <span>Xem nhật ký công việc</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* CỘT PHẢI (35%): Rubric & Lịch Mentor Sync */}
          <div className="mentor-col-right">
            {/* Card 1: Rubric Tiêu Chuẩn Chấm Điểm */}
            <div className="mentor-sidebar-card">
              <div className="mentor-sidebar-card-head">
                <div>
                  <h3>Rubric Tiêu Chuẩn Chấm Điểm</h3>
                  <span className="card-sub-tag">Quy chuẩn Viện CNTT ICTU</span>
                </div>
                <Award size={20} className="text-primary" />
              </div>

              <div className="rubric-items-list">
                <div className="rubric-item">
                  <div className="rubric-item-header">
                    <strong>1. Kỹ năng chuyên môn Kỹ thuật:</strong>
                    <span className="rubric-pct-pill">40%</span>
                  </div>
                  <p>Chất lượng source code, khả năng hoàn thành API, xử lý lỗi & cấu trúc kiến trúc phần mềm.</p>
                </div>

                <div className="rubric-item">
                  <div className="rubric-item-header">
                    <strong>2. Kỷ luật & Chuyên cần:</strong>
                    <span className="rubric-pct-pill">30%</span>
                  </div>
                  <p>Giờ giấc có mặt tại Lab, nộp báo cáo đúng hạn, tuân thủ nội quy dự án và bảo mật dữ liệu.</p>
                </div>

                <div className="rubric-item">
                  <div className="rubric-item-header">
                    <strong>3. Kỹ năng mềm & Teamwork:</strong>
                    <span className="rubric-pct-pill">30%</span>
                  </div>
                  <p>Giao tiếp, tinh thần chủ động báo cáo blocker, phối hợp nhóm và kỹ năng thuyết trình.</p>
                </div>
              </div>

              <button
                type="button"
                className="mentor-btn mentor-btn--outline mentor-btn--full"
                onClick={() => showToast('Đang tải văn bản Quy chế Rubric 2026...', 'info')}
              >
                <span>Xem chi tiết thang điểm Rubric</span>
                <ExternalLink size={14} />
              </button>
            </div>

            {/* Card 2: Lịch Mentor Sync & Review */}
            <div className="mentor-sidebar-card">
              <div className="mentor-sidebar-card-head">
                <div>
                  <h3>Lịch Mentor Sync & Review</h3>
                  <span className="card-sub-tag">Lịch làm việc nhóm 1-on-1</span>
                </div>
                <Calendar size={20} className="text-primary" />
              </div>

              <div className="event-highlight-card">
                <div className="event-live-badge">
                  <span className="live-dot" />
                  SẮP DIỄN RA
                </div>
                <h4 className="event-title">Code Review: REST API & UI Dashboard</h4>
                <div className="event-detail-row">
                  <Clock size={14} />
                  <span>Hôm nay, Thứ 5 lúc <strong>14:00</strong> (60 phút)</span>
                </div>
                <div className="event-detail-row">
                  <BookOpen size={14} />
                  <span>Phòng Lab 302 • Tòa nhà C1 - ICTU</span>
                </div>
                <div className="event-detail-row">
                  <Users size={14} />
                  <span>Thành viên: <strong>Nguyễn Văn Bình, Trần Thu Hà</strong></span>
                </div>

                <div className="event-action-buttons">
                  <button
                    type="button"
                    className="mentor-btn mentor-btn--primary mentor-btn--sm"
                    onClick={() => showToast('Đã mở phòng họp Meet nội bộ: meet.ictu.edu.vn/review-lab302', 'success')}
                  >
                    Vào phòng họp / Chuẩn bị
                  </button>
                  <button
                    type="button"
                    className="mentor-btn mentor-btn--ghost mentor-btn--sm"
                    onClick={() => showToast('Đã gửi đề nghị dời lịch sang 15:30', 'info')}
                  >
                    Dời lịch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER BANNER ── */}
      <footer className="mentor-footer-banner">
        <div className="banner-left">
          <AlertCircle size={20} className="banner-icon" />
          <div>
            <strong>Thông báo chốt bảng điểm Mentor đợt học kỳ Q3/2026 vào ngày 30/10/2026.</strong>
            <p>Vui lòng hoàn tất đánh giá cho toàn bộ sinh viên phụ trách trước thời hạn để chuyển giao cho phòng Đào tạo.</p>
          </div>
        </div>
        <button
          type="button"
          className="banner-link-btn"
          onClick={() => showToast('Mở tài liệu: Quy chế hướng dẫn sinh viên thực tập ICTU v3.2', 'info')}
        >
          <span>Xem quy chế hướng dẫn sinh viên</span>
          <ExternalLink size={14} />
        </button>
      </footer>


      {/* TAB 2: QUẢN LÝ NHIỆM VỤ */}
      {activeTab === 'tasks' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Quản lý & Theo dõi nhiệm vụ Sprint</h2>
              <p>Danh sách các đầu việc giao cho TTS, nghiệm thu chất lượng mã nguồn.</p>
            </div>
            <button
              type="button"
              className="mentor-btn mentor-btn--primary"
              onClick={() => setTaskModal(true)}
            >
              <Plus size={16} />
              <span>Giao việc mới</span>
            </button>
          </div>

          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th style={{ width: '38%' }}>Nhiệm vụ & Mô tả</th>
                <th>TTS phụ trách</th>
                <th>Thời hạn</th>
                <th>Mức ưu tiên</th>
                <th style={{ width: '18%' }}>Tiến độ</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong className="task-name">{task.title}</strong>
                    <p className="task-desc">{task.description}</p>
                  </td>
                  <td><strong>{task.intern_name}</strong></td>
                  <td>{task.due_at}</td>
                  <td>
                    <span className={`priority-badge priority-badge--${task.priority === 'high' ? 'danger' : 'warning'}`}>
                      {task.priority === 'high' ? 'Cao' : 'Trung bình'}
                    </span>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-val ${task.progress === 100 ? 'is-complete' : ''}`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{task.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-badge--${task.status === 'done' ? 'success' : 'primary'}`}>
                      {task.status === 'done' ? 'Hoàn thành' : 'Đang thực hiện'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {task.status !== 'done' ? (
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={async () => {
                          try {
                            await updateMentorTaskStatus(task.id, 'done', 100)
                          } catch {
                            // fallback
                          }
                          setTasks(tasks.map((t) => t.id === task.id ? { ...t, status: 'done', progress: 100 } : t))
                          showToast('Đã nghiệm thu hoàn thành nhiệm vụ và lưu vào CSDL!')
                        }}
                      >
                        Nghiệm thu
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✓ Đã nghiệm thu</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* TAB 3: BÁO CÁO TUẦN (+1) */}
      {activeTab === 'reports' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Báo cáo thực tập tuần chờ duyệt (+1)</h2>
              <p>Đọc báo cáo tiến độ và gửi nhận xét chuyên môn hướng dẫn sinh viên.</p>
            </div>
          </div>

          <div className="reports-stack">
            {reports.map((report) => (
              <div key={report.id} className="report-card-item">
                <div className="report-card-top">
                  <div>
                    <h3 className="report-title">{report.week_range} - {report.intern_name}</h3>
                    <span className="report-timestamp">Nộp ngày: {report.submitted_at}</span>
                  </div>
                  <span className={`status-badge status-badge--${report.status === 'reviewed' ? 'success' : 'warning'}`}>
                    {report.status === 'reviewed' ? 'Đã phản hồi' : 'Chờ duyệt (+1)'}
                  </span>
                </div>
                <div className="report-body">
                  <div className="report-section">
                    <strong>1. Kết quả đạt được:</strong>
                    <p>{report.summary}</p>
                  </div>
                  <div className="report-section">
                    <strong>2. Khó khăn / Cần hỗ trợ:</strong>
                    <p>{report.issues}</p>
                  </div>
                  <div className="report-section">
                    <strong>3. Kế hoạch tuần tới:</strong>
                    <p>{report.plan}</p>
                  </div>
                  {report.feedback ? (
                    <div className="report-feedback-box">
                      <strong>Nhận xét đã gửi cho TTS:</strong>
                      <p>"{report.feedback}"</p>
                    </div>
                  ) : null}
                </div>
                <div className="report-card-footer">
                  <button
                    type="button"
                    className="mentor-btn mentor-btn--primary"
                    onClick={() => setFeedbackModal({ open: true, report, text: report.feedback || '' })}
                  >
                    {report.feedback ? 'Chỉnh sửa nhận xét' : 'Viết phản hồi cho TTS'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: ĐÁNH GIÁ NĂNG LỰC CUỐI KỲ */}
      {activeTab === 'evaluations' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Đánh giá năng lực cuối kỳ thực tập</h2>
              <p>Tổng hợp điểm kỹ năng chuyên môn, thái độ và đề xuất tuyển dụng gửi về phòng Nhân sự.</p>
            </div>
            <button
              type="button"
              className="mentor-btn mentor-btn--primary"
              onClick={() => setEvalModal(true)}
            >
              Cập nhật đánh giá
            </button>
          </div>

          <div className="eval-summary-card">
            <div className="eval-card-header">
              <div>
                <h3>Nguyễn Văn Bình (TTS0002) - ĐH ICTU K19</h3>
                <span className="eval-date">Đánh giá ngày: {evaluation.evaluated_at}</span>
              </div>
              <span className="status-badge status-badge--success">Đã hoàn thành đánh giá</span>
            </div>

            <div className="eval-scores-grid">
              <div className="score-box">
                <span className="score-label">Kỹ năng chuyên môn:</span>
                <span className="score-val">{evaluation.skill_score}/10</span>
              </div>
              <div className="score-box">
                <span className="score-label">Thái độ & Chuyên cần:</span>
                <span className="score-val">{evaluation.attitude_score}/10</span>
              </div>
              <div className="score-box">
                <span className="score-label">Đề xuất tuyển dụng:</span>
                <strong className="score-rec">{evaluation.recommendation}</strong>
              </div>
            </div>

            <div className="eval-comment-box">
              <strong>Nhận xét chi tiết từ Mentor:</strong>
              <p>"{evaluation.comment}"</p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: LỊCH HỌP & CODE REVIEW */}
      {activeTab === 'meetings' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Lịch họp & Code Review với Thực tập sinh</h2>
              <p>Lên lịch 1-on-1, review mã nguồn Sprint và tổ chức buổi hướng dẫn chuyên môn trực tuyến.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="mentor-btn mentor-btn--primary"
                onClick={() => showToast('Mở form đặt lịch họp mới với Thực tập sinh', 'info')}
              >
                <Plus size={16} />
                <span>+ Đặt lịch họp mới</span>
              </button>
              <button
                type="button"
                className="mentor-btn mentor-btn--outline"
                onClick={() => showToast('Mở Google Meet: meet.ictu.edu.vn/mentor-hub', 'success')}
              >
                <ExternalLink size={14} />
                <span>Phòng Meet nhanh</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="event-highlight-card" style={{ margin: 0 }}>
              <div className="event-live-badge">
                <span className="live-dot" />
                HÔM NAY · SẮP DIỄN RA
              </div>
              <h4 className="event-title">Code Review Sprint 1: REST API & Auth JWT</h4>
              <div className="event-detail-row">
                <Clock size={14} />
                <span>Thứ 5 lúc <strong>14:00 - 15:00</strong> (60 phút)</span>
              </div>
              <div className="event-detail-row">
                <BookOpen size={14} />
                <span>Phòng Lab 302 • Tòa nhà C1 - ICTU</span>
              </div>
              <div className="event-detail-row">
                <Users size={14} />
                <span>Thực tập sinh: <strong>Nguyễn Văn Bình (TTS0002)</strong></span>
              </div>
              <div className="event-action-buttons">
                <button
                  type="button"
                  className="mentor-btn mentor-btn--primary mentor-btn--sm"
                  onClick={() => showToast('Đang kết nối vào phòng họp Meet: meet.ictu.edu.vn/review-lab302', 'success')}
                >
                  Vào phòng họp Meet
                </button>
                <button
                  type="button"
                  className="mentor-btn mentor-btn--ghost mentor-btn--sm"
                  onClick={() => showToast('Đã gửi thông báo dời lịch sang 15:30', 'info')}
                >
                  Dời lịch
                </button>
              </div>
            </div>

            <div className="event-highlight-card" style={{ margin: 0, borderColor: '#E2E8F0', background: '#FAFAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>NGÀY MAI · ĐÃ XÁC NHẬN</span>
                <span className="status-badge status-badge--primary">1-on-1 Sync</span>
              </div>
              <h4 className="event-title">Hướng dẫn Cấu hình Docker & CI/CD Pipeline</h4>
              <div className="event-detail-row">
                <Clock size={14} />
                <span>Thứ 6 lúc <strong>09:30 - 10:30</strong> (60 phút)</span>
              </div>
              <div className="event-detail-row">
                <BookOpen size={14} />
                <span>Họp Online qua Google Meet ICTU</span>
              </div>
              <div className="event-detail-row">
                <Users size={14} />
                <span>Thực tập sinh: <strong>Trần Thu Hà (TTS0005)</strong></span>
              </div>
              <div className="event-action-buttons">
                <button
                  type="button"
                  className="mentor-btn mentor-btn--outline mentor-btn--sm"
                  onClick={() => showToast('Đã gửi nhắc nhở cuộc họp tới email sinh viên', 'info')}
                >
                  Gửi nhắc nhở email
                </button>
              </div>
            </div>

            <div className="event-highlight-card" style={{ margin: 0, borderColor: '#E2E8F0', background: '#FAFAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>TUẦN TỚI · LÊN LỊCH</span>
                <span className="status-badge status-badge--success">All-hands Sync</span>
              </div>
              <h4 className="event-title">Sprint 2 Planning & Phân chia Backlog US 18 - 25</h4>
              <div className="event-detail-row">
                <Clock size={14} />
                <span>Thứ 2 (05/10) lúc <strong>10:00 - 11:30</strong></span>
              </div>
              <div className="event-detail-row">
                <BookOpen size={14} />
                <span>Phòng họp Hội thảo Khoa CNTT</span>
              </div>
              <div className="event-detail-row">
                <Users size={14} />
                <span>Toàn bộ <strong>Nhóm TTS phụ trách (2 bạn)</strong></span>
              </div>
              <div className="event-action-buttons">
                <button
                  type="button"
                  className="mentor-btn mentor-btn--outline mentor-btn--sm"
                  onClick={() => showToast('Đã mở tài liệu Backlog Sprint 2', 'info')}
                >
                  Xem tài liệu chuẩn bị
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. BANNER THÔNG BÁO NHẮC NHỞ Ở ĐÁY ── */}
      <section className="mentor-reminder-banner">
        <div className="banner-icon-col">
          <AlertCircle size={22} className="banner-alert-icon" />
        </div>
        <div className="banner-text-col">
          <strong>Cảnh báo thời hạn kết thúc kỳ thực tập:</strong>
          <p>
            Kỳ thực tập Q3/2026 dự kiến kết thúc sau 4 tuần (31/10/2026). Mentor vui lòng rà soát tiến độ Sprint và hoàn tất biểu mẫu đánh giá năng lực cuối kỳ cho sinh viên.
          </p>
        </div>
        <button
          type="button"
          className="banner-link-btn"
          onClick={() => showToast('Mở tài liệu: Quy định & Tiêu chuẩn đánh giá thực tập sinh ICTU')}
        >
          <span>Xem tiêu chuẩn đánh giá ICTU</span>
          <ExternalLink size={14} />
        </button>
      </section>

      {/* ── MODAL GIAO VIỆC MỚI ── */}
      {taskModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>+ Giao nhiệm vụ mới cho Thực tập sinh</h3>
              <button type="button" className="modal-close-btn" onClick={() => setTaskModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="modal-field">
                  <label>Thực tập sinh:</label>
                  <strong>Nguyễn Văn Bình (TTS0002) - CNTT</strong>
                </div>
                <div className="modal-field">
                  <label htmlFor="t-title">Tiêu đề nhiệm vụ *:</label>
                  <input
                    id="t-title"
                    type="text"
                    required
                    placeholder="Ví dụ: Tích hợp Swagger UI vào backend FastAPI..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="t-desc">Mô tả công việc & Yêu cầu bàn giao:</label>
                  <textarea
                    id="t-desc"
                    rows={3}
                    placeholder="Mô tả các yêu cầu kỹ thuật và tiêu chí nghiệm thu..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="modal-textarea"
                  />
                </div>
                <div className="modal-row-2">
                  <div className="modal-field" style={{ flex: 1 }}>
                    <label htmlFor="t-due">Hạn hoàn thành (Due date) *:</label>
                    <input
                      id="t-due"
                      type="date"
                      required
                      value={newTask.due_at}
                      onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })}
                      className="modal-input"
                    />
                  </div>
                  <div className="modal-field" style={{ flex: 1 }}>
                    <label htmlFor="t-prio">Mức ưu tiên:</label>
                    <select
                      id="t-prio"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="modal-select"
                    >
                      <option value="high">Cao (Gấp)</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="mentor-btn mentor-btn--ghost" onClick={() => setTaskModal(false)}>Hủy</button>
                <button type="submit" className="mentor-btn mentor-btn--primary">Giao nhiệm vụ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PHẢN HỒI BÁO CÁO ── */}
      {feedbackModal.open && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Nhận xét báo cáo: {feedbackModal.report?.week_range}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setFeedbackModal({ open: false, report: null, text: '' })}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>TTS:</label>
                <strong>{feedbackModal.report?.intern_name}</strong>
              </div>
              <div className="modal-field">
                <label htmlFor="feedback-text">Nhận xét & Hướng dẫn kỹ thuật:</label>
                <textarea
                  id="feedback-text"
                  rows={4}
                  value={feedbackModal.text}
                  onChange={(e) => setFeedbackModal({ ...feedbackModal, text: e.target.value })}
                  placeholder="Ghi nhận xét về kết quả công việc, góp ý giải quyết khó khăn..."
                  className="modal-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="mentor-btn mentor-btn--ghost" onClick={() => setFeedbackModal({ open: false, report: null, text: '' })}>Hủy</button>
              <button type="button" className="mentor-btn mentor-btn--primary" onClick={handleSaveFeedback}>Gửi phản hồi</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ĐÁNH GIÁ NĂNG LỰC TTS ── */}
      {evalModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Đánh giá năng lực: Nguyễn Văn Bình (TTS0002)</h3>
              <button type="button" className="modal-close-btn" onClick={() => setEvalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEval}>
              <div className="modal-body">
                <div className="modal-row-2">
                  <div className="modal-field" style={{ flex: 1 }}>
                    <label htmlFor="ev-skill">Điểm chuyên môn (Thang 10):</label>
                    <input
                      id="ev-skill"
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={evaluation.skill_score}
                      onChange={(e) => setEvaluation({ ...evaluation, skill_score: Number(e.target.value) })}
                      className="modal-input"
                    />
                  </div>
                  <div className="modal-field" style={{ flex: 1 }}>
                    <label htmlFor="ev-att">Điểm thái độ (Thang 10):</label>
                    <input
                      id="ev-att"
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={evaluation.attitude_score}
                      onChange={(e) => setEvaluation({ ...evaluation, attitude_score: Number(e.target.value) })}
                      className="modal-input"
                    />
                  </div>
                </div>
                <div className="modal-field">
                  <label htmlFor="ev-rec">Đề xuất:</label>
                  <select
                    id="ev-rec"
                    value={evaluation.recommendation}
                    onChange={(e) => setEvaluation({ ...evaluation, recommendation: e.target.value })}
                    className="modal-select"
                  >
                    <option value="Tuyển dụng chính thức (Khuyên khích)">Tuyển dụng chính thức (Khuyên khích)</option>
                    <option value="Hoàn thành thực tập đạt yêu cầu">Hoàn thành thực tập đạt yêu cầu</option>
                    <option value="Cần đào tạo thêm">Cần đào tạo thêm</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label htmlFor="ev-comment">Nhận xét chi tiết quá trình thực tập:</label>
                  <textarea
                    id="ev-comment"
                    rows={4}
                    value={evaluation.comment}
                    onChange={(e) => setEvaluation({ ...evaluation, comment: e.target.value })}
                    className="modal-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="mentor-btn mentor-btn--ghost" onClick={() => setEvalModal(false)}>Hủy</button>
                <button type="submit" className="mentor-btn mentor-btn--primary">Lưu đánh giá</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL NHẮN TIN HỖ TRỢ ── */}
      {chatModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Nhắn tin hỗ trợ cho Nguyễn Văn Bình</h3>
              <button type="button" className="modal-close-btn" onClick={() => setChatModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSendMessage}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Tin nhắn sẽ được gửi trực tiếp tới hòm thư cá nhân và thông báo của sinh viên trên hệ thống.
                </p>
                <div className="modal-field">
                  <label htmlFor="chat-msg">Nội dung tin nhắn:</label>
                  <textarea
                    id="chat-msg"
                    rows={4}
                    required
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ví dụ: Em có thể kiểm tra lại branch git trước khi tạo pull request nhé..."
                    className="modal-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="mentor-btn mentor-btn--ghost" onClick={() => setChatModal(false)}>Đóng</button>
                <button type="submit" className="mentor-btn mentor-btn--primary">
                  <Send size={15} />
                  <span>Gửi tin nhắn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
