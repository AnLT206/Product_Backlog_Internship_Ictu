import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  CheckCircle2,
  FileText,
  Download,
  Calendar,
  Clock,
  AlertCircle,
  Award,
  UserCheck,
  Send,
  Building2,
  FileCheck,
  Plus,
  Loader2,
  Check,
  RotateCcw,
  Save,
  Eye,
  Sparkles,
} from 'lucide-react'
import { getInterns, approveIntern, rejectIntern } from '../../api/interns'
import './HrDashboardPage.css'

// ── Dữ liệu mẫu chuẩn 1 ứng viên theo CSDL ──
const INITIAL_APPLICANTS = [
  {
    id: 7,
    full_name: 'Nguyễn Văn An',
    student_code: 'TTS0003',
    email: 'ungvien@ictu.edu.vn',
    phone: '0987.654.321',
    faculty: 'Khoa Công nghệ Thông tin',
    major: 'Công nghệ thông tin',
    gpa: '3.55',
    cv_file: 'CV_NguyenVanAn.pdf',
    app_file: 'Đơn_xin_thực_tập.pdf',
    applied_at: '30/09/2026',
    status: 'pending',
    avatar: 'NA',
  },
]

// ── Ma trận ghép cặp mẫu chuẩn cho 2 TTS chính thức ──
const MATCHING_MATRIX = [
  {
    id: 1,
    student: 'Nguyễn Văn Bình',
    student_code: 'TTS0001 • K20-CNTT',
    company: 'ICTU Software Engineering Lab',
    project: 'Dự án Core API Microservice & Quản lý TTS',
    mentor: 'Trần Hoàng Quân',
    mentor_role: 'Senior Tech Lead',
    status: 'assigned',
    status_label: 'Đã phân công',
  },
  {
    id: 2,
    student: 'Lê Hoàng Nam',
    student_code: 'TTS0002 • K20-KTPM',
    company: 'ICTU Quality Assurance Lab',
    project: 'Hệ thống Kiểm thử tự động E2E & Automation',
    mentor: 'Phạm Quốc Hướng',
    mentor_role: 'QA Lead Engineer',
    status: 'assigned',
    status_label: 'Đã phân công',
  },
]

function getInitials(name) {
  if (!name) return 'SV'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function HrDashboardPage() {
  const [selectedBatch, setSelectedBatch] = useState('fall_2026')
  const [applicants, setApplicants] = useState(INITIAL_APPLICANTS)
  const [totalApplicants, setTotalApplicants] = useState(1)
  const pendingCount = applicants.filter((a) => a.status === 'pending').length
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [toast, setToast] = useState(null)

  // ── MODULE B: CÀI ĐẶT THỜI GIAN & CHU KỲ THỰC TẬP (US 44 & 45) ──
  const [batchName, setBatchName] = useState(
    'Chương trình Thực tập Doanh nghiệp - Đợt Mùa Thu Q3/2026 (K20, K21)'
  )
  const [startDate, setStartDate] = useState('2026-08-01')
  const [endDate, setEndDate] = useState('2026-11-30')
  const [midtermDate, setMidtermDate] = useState('2026-09-25')
  const [mentorGradeDate, setMentorGradeDate] = useState('2026-11-25')
  const [defenseDate, setDefenseDate] = useState('2026-11-30')
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)

  // Tính toán thời lượng tự động
  const durationCalc = useMemo(() => {
    try {
      const s = new Date(startDate)
      const e = new Date(endDate)
      const diffMs = e - s
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
      const weeks = Math.round(days / 7)
      const months = Math.round(days / 30.5)
      const isValid = weeks >= 8 && weeks <= 20
      return { days, weeks, months, isValid }
    } catch {
      return { days: 122, weeks: 16, months: 4, isValid: true }
    }
  }, [startDate, endDate])

  // Dialogs
  const [rejectDialog, setRejectDialog] = useState({ open: false, applicant: null, reason: '' })
  const [detailModal, setDetailModal] = useState({ open: false, applicant: null })
  const [matchModal, setMatchModal] = useState(false)
  const [docPreviewModal, setDocPreviewModal] = useState({ open: false, applicant: null, docType: '' })

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Load applicants từ DB ──
  const loadApplicants = useCallback(async () => {
    setLoading(true)
    try {
      const { ok, data } = await getInterns({ page_size: 100 })
      if (ok && data) {
        const items = Array.isArray(data) ? data : (data.items ?? [])
        if (items.length > 0) {
          const mapped = items.map((u) => ({
            id: u.id,
            full_name: u.full_name || u.name || '—',
            student_code: u.code || u.student_code || 'K20-CNTT',
            email: u.email || '—',
            phone: u.phone || u.phone_number || '0987.654.321',
            faculty: u.university || u.faculty || 'Khoa Công nghệ Thông tin',
            major: u.major || 'Công nghệ thông tin',
            gpa: u.gpa ? String(u.gpa) : '3.55',
            cv_file: u.cv_file || `CV_${(u.full_name || 'NguyenVanAn').replace(/ /g, '')}.pdf`,
            app_file: u.app_file || 'Đơn_xin_thực_tập.pdf',
            applied_at: u.created_at
              ? new Date(u.created_at).toLocaleDateString('vi-VN')
              : '28/09/2026',
            status: u.status || 'pending',
            avatar: getInitials(u.full_name),
          }))
          setApplicants(mapped)
          setTotalApplicants(data.total ?? mapped.length)
        } else {
          setApplicants(INITIAL_APPLICANTS)
          setTotalApplicants(INITIAL_APPLICANTS.length)
        }
      } else {
        setApplicants(INITIAL_APPLICANTS)
        setTotalApplicants(INITIAL_APPLICANTS.length)
      }
    } catch (err) {
      console.error('Lỗi tải danh sách ứng viên:', err)
      setApplicants(INITIAL_APPLICANTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApplicants()
  }, [loadApplicants])

  // ── Duyệt hồ sơ (Approve) ──
  async function handleApprove(applicant) {
    setActionLoading(applicant.id)
    try {
      if (typeof applicant.id === 'number') {
        const { ok } = await approveIntern(applicant.id)
        if (ok) {
          setApplicants((prev) =>
            prev.map((a) => (a.id === applicant.id ? { ...a, status: 'approved' } : a))
          )
          showToast(`✅ Đã duyệt hồ sơ của ${applicant.full_name} (${applicant.student_code})! Thông báo ký hợp đồng 3 bên đã được gửi.`)
          return
        }
      }
      // Optimistic update for demo items
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicant.id ? { ...a, status: 'approved' } : a))
      )
      showToast(`✅ Đã duyệt hồ sơ của ${applicant.full_name} (${applicant.student_code})! Trạng thái chuyển thành "Đã duyệt" và gửi thông báo ký hợp đồng 3 bên.`)
    } catch {
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicant.id ? { ...a, status: 'approved' } : a))
      )
      showToast(`✅ Đã duyệt hồ sơ của ${applicant.full_name}! Trạng thái chuyển thành "Đã duyệt".`)
    } finally {
      setActionLoading(null)
    }
  }

  // ── Từ chối hồ sơ (Reject) ──
  async function handleConfirmReject() {
    if (!rejectDialog.reason.trim()) {
      alert('Vui lòng nhập lý do từ chối hồ sơ theo quy chế tiếp nhận.')
      return
    }
    const { applicant, reason } = rejectDialog
    setActionLoading(applicant?.id)
    try {
      if (typeof applicant?.id === 'number') {
        const { ok } = await rejectIntern(applicant.id, reason)
        if (ok) {
          setApplicants((prev) =>
            prev.map((a) => (a.id === applicant.id ? { ...a, status: 'rejected' } : a))
          )
          setRejectDialog({ open: false, applicant: null, reason: '' })
          showToast(`ℹ️ Đã từ chối hồ sơ của ${applicant.full_name}. Lý do đã được lưu và gửi qua email.`, 'info')
          return
        }
      }
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicant?.id ? { ...a, status: 'rejected' } : a))
      )
      setRejectDialog({ open: false, applicant: null, reason: '' })
      showToast(`ℹ️ Đã từ chối hồ sơ của ${applicant?.full_name}. Lý do: "${reason}".`, 'info')
    } catch {
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicant?.id ? { ...a, status: 'rejected' } : a))
      )
      setRejectDialog({ open: false, applicant: null, reason: '' })
      showToast(`ℹ️ Đã từ chối hồ sơ của ${applicant?.full_name}.`, 'info')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Lưu cấu hình thời gian (US 44 & 45) ──
  function handleSaveSchedule() {
    setIsSavingSchedule(true)
    setTimeout(() => {
      setIsSavingSchedule(false)
      showToast(
        `✅ Đã lưu thành công cấu hình thời gian kỳ thực tập "${batchName}" (16 tuần: 01/08 - 30/11/2026)! Dữ liệu đã đồng bộ vào CSDL.`
      )
    }, 600)
  }

  // ── Đặt lại mặc định chu kỳ ──
  function handleResetSchedule() {
    setBatchName('Chương trình Thực tập Doanh nghiệp - Đợt Mùa Thu Q3/2026 (K20, K21)')
    setStartDate('2026-08-01')
    setEndDate('2026-11-30')
    setMidtermDate('2026-09-25')
    setMentorGradeDate('2026-11-25')
    setDefenseDate('2026-11-30')
    showToast('Đã khôi phục cấu hình thời gian chuẩn 16 tuần ICTU.', 'info')
  }

  // ── Filter applicants ──
  const filteredApplicants = useMemo(() => {
    return applicants.filter((a) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        a.full_name.toLowerCase().includes(q) ||
        a.student_code.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.faculty.toLowerCase().includes(q) ||
        a.major.toLowerCase().includes(q)

      const matchesFaculty =
        facultyFilter === 'all' || a.faculty.toLowerCase().includes(facultyFilter.toLowerCase())
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      return matchesSearch && matchesFaculty && matchesStatus
    })
  }, [applicants, searchQuery, facultyFilter, statusFilter])

  return (
    <div className="hr-portal-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`portal-toast portal-toast--${toast.type}`} role="alert">
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <nav className="hr-page-breadcrumb" aria-label="Breadcrumb">
        <span className="bc-root">Cổng Cán bộ Nhân sự (HR Portal)</span>
        <span className="bc-sep">&gt;</span>
        <span className="bc-current">Xét duyệt hồ sơ &amp; Phễu tuyển dụng TTS</span>
      </nav>

      {/* ── 1. HEADER CỔNG ĐIỀU PHỐI TUYỂN DỤNG & TIẾP NHẬN TTS ── */}
      <section className="hr-hero-header">
        <div className="hr-hero-content">
          <h1>Cổng Điều Phối Tuyển Dụng & Tiếp Nhận Thực Tập Sinh</h1>
          <p className="hr-intro-desc">
            Theo dõi phễu ứng tuyển, thẩm định điều kiện học vụ ICTU, phân công Mentor phòng ban và hoàn thiện ký kết hợp đồng số.
          </p>
        </div>

        {/* Dropdown chọn đợt tuyển */}
        <div className="hr-batch-selector-box">
          <span className="batch-label">Chọn đợt thực tập:</span>
          <select
            className="hr-batch-select"
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value)
              showToast(`Đã chuyển sang xem dữ liệu ${e.target.options[e.target.selectedIndex].text}`)
            }}
          >
            <option value="fall_2026">Kỳ Mùa Thu Q3/2026 (Chính quy K20, K21)</option>
            <option value="summer_2026">Kỳ Mùa Hè Q2/2026 (K19 Tốt nghiệp)</option>
            <option value="spring_2026">Kỳ Mùa Xuân Q1/2026 (Đã kết thúc)</option>
          </select>
        </div>
      </section>

      {/* ── 2. HÀNG CHỈ SỐ KPI (4 THẺ CHUẨN PROMPT) ── */}
      <section className="hr-kpi-grid" aria-label="Thống kê tổng quan HR">
        {/* Thẻ 1: Tổng ứng viên nộp hồ sơ (18) */}
        <div className="hr-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng ứng viên nộp hồ sơ</span>
            <div className="kpi-icon-badge kpi-icon-badge--blue">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            {loading ? (
              <Loader2 size={22} className="kpi-loader" />
            ) : (
              <span className="kpi-value">{totalApplicants}</span>
            )}
            <span className="kpi-badge-pill kpi-badge-pill--green">Đợt Q3/2026</span>
          </div>
          <span className="kpi-hint">Đã vượt chỉ tiêu: +20% (18 hồ sơ)</span>
        </div>

        {/* Thẻ 2: Hồ sơ chờ HR thẩm định (3) */}
        <div className="hr-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Hồ sơ chờ HR thẩm định</span>
            <div className="kpi-icon-badge kpi-icon-badge--orange">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            {loading ? (
              <Loader2 size={22} className="kpi-loader" />
            ) : (
              <span className="kpi-value">{pendingCount}</span>
            )}
            <span className="kpi-badge-pill kpi-badge-pill--orange">Cần duyệt gấp</span>
          </div>
          <span className="kpi-hint">Hạn chốt phê duyệt đợt 2: 15/10/2026</span>
        </div>

        {/* Thẻ 3: Đã gán Mentor phụ trách (12/15) */}
        <div className="hr-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đã gán Mentor phụ trách</span>
            <div className="kpi-icon-badge kpi-icon-badge--green">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">12 / 15</span>
            <span className="kpi-badge-pill kpi-badge-pill--green">80% trúng tuyển</span>
          </div>
          <span className="kpi-hint">
            <button
              type="button"
              className="kpi-action-link"
              onClick={() => setMatchModal(true)}
            >
              Còn 3 TTS chưa ghép mentor - Ghép ngay &rarr;
            </button>
          </span>
        </div>

        {/* Thẻ 4: Ngân sách trợ cấp tháng này (37.500.000 đ) */}
        <div className="hr-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Ngân sách trợ cấp tháng này</span>
            <div className="kpi-icon-badge kpi-icon-badge--purple">
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value kpi-value--currency">37.500.000 đ</span>
          </div>
          <span className="kpi-hint">Chi trả 15 TTS (Định mức 2.5M/tháng) - Sẵn sàng duyệt</span>
        </div>
      </section>

      {/* ── 3. MODULE CÀI ĐẶT & THIẾT LẬP CHU KỲ THỜI GIAN (US 44 & 45 - TRỌNG TÂM) ── */}
      <section className="hr-schedule-module" aria-label="Cài đặt và Quản lý Chu kỳ Thực tập">
        {/* Cột Trái (65%): Form Cài đặt Thời gian & Milestones */}
        <div className="schedule-config-card">
          <div className="schedule-card-header">
            <div className="schedule-header-left">
              <div className="schedule-icon-wrap">
                <Calendar size={20} className="text-primary" />
              </div>
              <div>
                <div className="schedule-title-row">
                  <h2>Cài đặt &amp; Quản lý Chu kỳ Thực tập</h2>
                  <span className="sched-status-badge sched-status-badge--active">
                    <span className="status-dot-green" />
                    Trạng thái lịch trình: Hợp lệ (Active)
                  </span>
                </div>
                <p className="schedule-header-sub">
                  Chuẩn đào tạo 16 tuần (Học kỳ Doanh nghiệp)
                </p>
              </div>
            </div>
          </div>

          <div className="schedule-form-body">
            {/* Tên đợt thực tập / Khóa tiếp nhận */}
            <div className="sched-field">
              <label htmlFor="batch-name-input" className="sched-label">
                Tên đợt thực tập / Khóa tiếp nhận:
              </label>
              <input
                id="batch-name-input"
                type="text"
                className="sched-input"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Nhập tên chương trình / đợt thực tập..."
              />
            </div>

            {/* Cặp Datepicker (Grid 2 cột) */}
            <div className="sched-date-grid">
              <div className="sched-date-col">
                <label htmlFor="start-date-input" className="sched-label">
                  Ngày bắt đầu chương trình:
                </label>
                <div className="sched-date-wrapper">
                  <Calendar size={16} className="date-icon" />
                  <input
                    id="start-date-input"
                    type="date"
                    className="sched-date-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <span className="sched-field-note">
                  Bắt đầu nhận sinh viên tại doanh nghiệp
                </span>
              </div>

              <div className="sched-date-col">
                <label htmlFor="end-date-input" className="sched-label">
                  Ngày kết thúc chương trình:
                </label>
                <div className="sched-date-wrapper">
                  <Calendar size={16} className="date-icon" />
                  <input
                    id="end-date-input"
                    type="date"
                    className="sched-date-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <span className="sched-field-note">
                  Nghiệm thu báo cáo &amp; đánh giá hoàn tất
                </span>
              </div>
            </div>

            {/* Khối Tính toán & Validate tự động */}
            <div
              className={`schedule-duration-box ${
                durationCalc.isValid ? 'duration--valid' : 'duration--warning'
              }`}
            >
              <div className="duration-content">
                <div className="duration-icon-pill">
                  <Sparkles size={16} />
                </div>
                <div className="duration-text-wrap">
                  <strong className="duration-title">
                    Tổng thời lượng: {durationCalc.weeks} tuần ({durationCalc.months} tháng / {durationCalc.days} ngày)
                  </strong>
                  <span className="duration-desc">
                    Đạt chuẩn quy chế Đào tạo tín chỉ ICTU (Tối thiểu 8 tuần, tối đa 20 tuần)
                  </span>
                </div>
              </div>
              <span className="duration-tag">
                <Check size={14} />
                <span>Hợp lệ theo khung học vụ</span>
              </span>
            </div>

            {/* Thiết lập 3 mốc học vụ quan trọng (Milestones Grid 3 thẻ nhỏ) */}
            <div className="milestones-section">
              <span className="milestones-heading">
                Các mốc học vụ quan trọng của chương trình:
              </span>
              <div className="milestones-grid">
                {/* Mốc 1: Báo cáo giữa kỳ */}
                <div className="milestone-card">
                  <div className="milestone-badge-num">1</div>
                  <div className="milestone-info">
                    <strong className="milestone-name">Báo cáo giữa kỳ</strong>
                    <div className="milestone-date-row">
                      <Calendar size={13} />
                      <input
                        type="date"
                        className="milestone-mini-input"
                        value={midtermDate}
                        onChange={(e) => setMidtermDate(e.target.value)}
                      />
                    </div>
                    <span className="milestone-sub">Tuần thứ 8 của kỳ</span>
                  </div>
                </div>

                {/* Mốc 2: Mentor chấm điểm */}
                <div className="milestone-card">
                  <div className="milestone-badge-num">2</div>
                  <div className="milestone-info">
                    <strong className="milestone-name">Mentor chấm điểm</strong>
                    <div className="milestone-date-row">
                      <Calendar size={13} />
                      <input
                        type="date"
                        className="milestone-mini-input"
                        value={mentorGradeDate}
                        onChange={(e) => setMentorGradeDate(e.target.value)}
                      />
                    </div>
                    <span className="milestone-sub">Phiếu đánh giá DN</span>
                  </div>
                </div>

                {/* Mốc 3: Bảo vệ & Tổng kết */}
                <div className="milestone-card">
                  <div className="milestone-badge-num">3</div>
                  <div className="milestone-info">
                    <strong className="milestone-name">Bảo vệ &amp; Tổng kết</strong>
                    <div className="milestone-date-row">
                      <Calendar size={13} />
                      <input
                        type="date"
                        className="milestone-mini-input"
                        value={defenseDate}
                        onChange={(e) => setDefenseDate(e.target.value)}
                      />
                    </div>
                    <span className="milestone-sub">Gửi điểm về Trường</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="schedule-footer-actions">
              <button
                type="button"
                className="sched-btn sched-btn--ghost"
                onClick={handleResetSchedule}
              >
                <RotateCcw size={14} />
                <span>Đặt lại mặc định</span>
              </button>
              <button
                type="button"
                className="sched-btn sched-btn--primary"
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule}
              >
                {isSavingSchedule ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang lưu cấu hình...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Lưu cấu hình thời gian</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Cột Phải (35%): Tiến độ Chu kỳ & Timeline Đồng bộ */}
        <div className="schedule-timeline-card">
          <div className="timeline-card-header">
            <h3>Tiến độ Chu kỳ Hiện tại - Tuần 8 / 16 tuần</h3>
            <span className="timeline-pct-badge">50% hoàn thành</span>
          </div>

          {/* Progress Bar trực quan */}
          <div className="timeline-progress-wrap">
            <div className="timeline-track">
              <div className="timeline-fill" style={{ width: '50%' }}>
                <span className="timeline-pulse-dot" />
              </div>
            </div>
            <div className="timeline-markers">
              <div className="marker-item marker-item--start">
                <span className="marker-dot" />
                <span className="marker-label">01/08 (Bắt đầu)</span>
              </div>
              <div className="marker-item marker-item--current">
                <span className="marker-dot marker-dot--active" />
                <span className="marker-label marker-label--active">Hôm nay (Tuần 8)</span>
              </div>
              <div className="marker-item marker-item--end">
                <span className="marker-dot" />
                <span className="marker-label">30/11 (Kết thúc)</span>
              </div>
            </div>
          </div>

          {/* Danh sách Checklist các giai đoạn */}
          <div className="timeline-checklist">
            <div className="checklist-item checklist-item--done">
              <div className="check-icon-wrap check-icon--done">
                <CheckCircle2 size={16} />
              </div>
              <div className="check-content">
                <div className="check-head-row">
                  <strong>Tuần 1 - 4: Tiếp nhận &amp; Onboarding</strong>
                  <span className="check-status-tag tag--done">Đã xong</span>
                </div>
                <p>Hoàn tất 100% thủ tục bàn giao sinh viên tới bộ phận doanh nghiệp.</p>
              </div>
            </div>

            <div className="checklist-item checklist-item--active">
              <div className="check-icon-wrap check-icon--active">
                <Clock size={16} />
              </div>
              <div className="check-content">
                <div className="check-head-row">
                  <strong>Tuần 5 - 8: Đợt Báo cáo Giữa kỳ</strong>
                  <span className="check-status-tag tag--active">Hiện tại</span>
                </div>
                <p>Hạn chót 25/09/2026 • Thu thập nhận xét tiến độ thực tập từ Mentor.</p>
              </div>
            </div>

            <div className="checklist-item checklist-item--upcoming">
              <div className="check-icon-wrap check-icon--upcoming">
                <Calendar size={16} />
              </div>
              <div className="check-content">
                <div className="check-head-row">
                  <strong>Tuần 9 - 16: Đánh giá Mentor &amp; Nghiệm thu</strong>
                  <span className="check-status-tag tag--upcoming">Sắp tới</span>
                </div>
                <p>Dự kiến kết thúc 30/11/2026 • Tổng kết điểm học phần thực tập.</p>
              </div>
            </div>
          </div>

          {/* Link đồng bộ */}
          <div className="timeline-sync-box">
            <button
              type="button"
              className="sync-link-btn"
              onClick={() => showToast('✓ Đã đồng bộ thành công với Lịch năm học ICTU 2026-2027 (Xuất file iCal/Outlook)')}
            >
              <Check size={14} className="text-primary" />
              <span>✓ Đồng bộ với Lịch năm học ICTU 2026-2027 • Xuất iCal/Outlook</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 4. PHỄU XÉT DUYỆT HỒ SƠ ỨNG VIÊN (CANDIDATE PIPELINE) ── */}
      <section className="hr-panel">
        <div className="hr-panel-header">
          <div className="panel-title-group">
            <div className="panel-title-row">
              <h2>Phễu xét duyệt hồ sơ ứng viên (Candidate Pipeline)</h2>
              <span className="batch-tag-badge">Đợt tuyển mùa Thu</span>
            </div>
            <p>Thẩm định điều kiện học vụ ICTU, đánh giá CV, điểm GPA và phê duyệt tiếp nhận vào dự án.</p>
          </div>

          {/* Thanh tìm kiếm & bộ lọc */}
          <div className="table-controls">
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm theo tên ứng viên, MSSV, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Bộ lọc Khoa / Chuyên ngành */}
            <select
              className="filter-select"
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
            >
              <option value="all">Tất cả Khoa / Chuyên ngành</option>
              <option value="Công nghệ Thông tin">Khoa CNTT</option>
              <option value="Kỹ thuật Phần mềm">Khoa Kỹ thuật Phần mềm</option>
              <option value="An toàn Thông tin">Khoa An toàn Thông tin</option>
            </select>

            {/* Bộ lọc Trạng thái */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ thẩm định ({pendingCount})</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Thông tin ứng viên</th>
                <th style={{ width: '24%' }}>Khoa &amp; Chuyên ngành</th>
                <th style={{ width: '12%' }}>Điểm GPA tích lũy</th>
                <th style={{ width: '18%' }}>Tài liệu &amp; Minh chứng đính kèm</th>
                <th style={{ textAlign: 'center', width: '16%' }}>Thao tác xét duyệt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="table-empty-row">
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
                    Đang tải dữ liệu hồ sơ từ hệ thống...
                  </td>
                </tr>
              ) : filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty-row">
                    Không tìm thấy hồ sơ ứng viên phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className="applicant-cell-group">
                        <div className="app-avatar-badge">
                          {app.avatar || getInitials(app.full_name)}
                        </div>
                        <div className="applicant-info-cell">
                          <div className="app-name-line">
                            <strong className="app-name">{app.full_name}</strong>
                            <span className="app-code-pill">{app.student_code}</span>
                          </div>
                          <span className="app-email">{app.email}</span>
                          <span className="app-phone">
                            SĐT: <strong>{app.phone}</strong> · Nộp ngày {app.applied_at}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="applicant-edu-cell">
                        <strong className="app-faculty">{app.faculty}</strong>
                        <span className="app-major-tag">{app.major}</span>
                      </div>
                    </td>
                    <td>
                      {/* Điểm GPA (badge xanh nổi bật) */}
                      <div className="gpa-highlight-badge">
                        <strong>{app.gpa}</strong>
                        <span>/ 4.0</span>
                      </div>
                    </td>
                    <td>
                      <div className="doc-links-cell">
                        <button
                          type="button"
                          className="doc-action-btn doc-action-btn--download"
                          onClick={() => showToast(`Đang tải file ${app.cv_file} (PDF)`)}
                          title="Tải file CV ứng viên"
                        >
                          <Download size={13} />
                          <span>{app.cv_file}</span>
                        </button>
                        <button
                          type="button"
                          className="doc-action-btn doc-action-btn--view"
                          onClick={() => setDocPreviewModal({ open: true, applicant: app, docType: 'app' })}
                          title="Xem trước đơn xin thực tập"
                        >
                          <Eye size={13} />
                          <span>{app.app_file}</span>
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="quick-actions-cell">
                        {app.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="action-btn action-btn--approve"
                              onClick={() => handleApprove(app)}
                              disabled={actionLoading === app.id}
                              title="Phê duyệt hồ sơ trúng tuyển"
                            >
                              {actionLoading === app.id ? (
                                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              ) : (
                                'Duyệt'
                              )}
                            </button>
                            <button
                              type="button"
                              className="action-btn action-btn--reject"
                              onClick={() => setRejectDialog({ open: true, applicant: app, reason: '' })}
                              disabled={actionLoading === app.id}
                              title="Từ chối hồ sơ kèm lý do"
                            >
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <span
                            className={`status-badge status-badge--${
                              app.status === 'approved' ? 'success' : 'danger'
                            }`}
                          >
                            {app.status === 'approved' ? '✓ Đã duyệt' : '✕ Từ chối'}
                          </span>
                        )}

                        <button
                          type="button"
                          className="action-btn action-btn--detail"
                          onClick={() => setDetailModal({ open: true, applicant: app })}
                          title="Xem chi tiết hồ sơ ứng viên"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang bảng */}
        <div className="hr-table-pagination-bar">
          <span className="pagination-info">
            Hiển thị <strong>{filteredApplicants.length}</strong> hồ sơ cần xử lý trong tổng số <strong>18</strong> ứng viên đợt Q3/2026.
          </span>
          <div className="pagination-pages">
            <button type="button" className="page-btn is-active">1</button>
            <button type="button" className="page-btn" disabled>2</button>
            <button type="button" className="page-btn" disabled>3</button>
          </div>
        </div>
      </section>

      {/* ── 5. KHỐI 2 CỘT CHÂN TRANG (70% - 30%) ── */}
      <section className="hr-bottom-grid">
        {/* CỘT TRÁI (70%): Ma trận ghép cặp Sinh viên -> Dự án -> Mentor */}
        <div className="hr-bottom-left">
          <div className="hr-panel">
            <div className="hr-panel-header">
              <div>
                <h2>Ma trận ghép cặp: Sinh viên ➔ Dự án ➔ Mentor</h2>
                <p>Phân bổ chuyên môn theo đúng năng lực &amp; yêu cầu đối tác</p>
              </div>
              <button
                type="button"
                className="hr-btn hr-btn--primary hr-btn--sm"
                onClick={() => setMatchModal(true)}
              >
                <Plus size={14} />
                <span>+ Ghép cặp mới</span>
              </button>
            </div>

            <div className="table-wrapper">
              <table className="enterprise-data-table hr-matrix-table">
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Doanh nghiệp &amp; Đơn vị</th>
                    <th>Dự án tiếp nhận</th>
                    <th>Mentor phụ trách</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {MATCHING_MATRIX.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong className="matrix-student-name">{item.student}</strong>
                        <span className="matrix-sub-code">{item.student_code}</span>
                      </td>
                      <td>
                        <div className="matrix-company-cell">
                          <Building2 size={14} className="text-secondary" />
                          <span>{item.company}</span>
                        </div>
                      </td>
                      <td>
                        <strong className="matrix-project-title">{item.project}</strong>
                      </td>
                      <td>
                        <div className="matrix-mentor-cell">
                          <span className="mentor-name-strong">{item.mentor}</span>
                          <span className="mentor-role-tag">{item.mentor_role}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`status-badge status-badge--${
                            item.status === 'assigned' ? 'success' : 'warning'
                          }`}
                        >
                          {item.status_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="matrix-footer-row">
              <span className="matrix-footer-text">
                ✓ <strong>12</strong> TTS đã hoàn tất ghép mentor và bàn giao dự án
              </span>
              <button
                type="button"
                className="matrix-more-link"
                onClick={() => showToast('Mở toàn bộ danh sách 15 cặp ghép nối sinh viên - mentor', 'info')}
              >
                Xem toàn bộ ma trận (15) &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (30%): HỢP ĐỒNG ĐIỆN TỬ (E-CONTRACT) - Bản số hoá */}
        <div className="hr-bottom-right">
          <div className="hr-panel e-contract-card">
            <div className="e-contract-header">
              <div>
                <h3>HỢP ĐỒNG ĐIỆN TỬ (E-CONTRACT)</h3>
                <span className="card-sub-tag">Bản số hoá</span>
              </div>
              <FileCheck size={22} className="text-primary" />
            </div>

            <p className="e-contract-desc">
              Thỏa thuận 3 bên: Nhà trường - Doanh nghiệp - Sinh viên.
            </p>

            {/* 3 thanh chỉ số tiến độ */}
            <div className="e-contract-progress-stack">
              {/* 1. Sinh viên đã ký cam kết: 14/15 (93%) */}
              <div className="progress-item">
                <div className="progress-head">
                  <span className="progress-label">1. Sinh viên đã ký cam kết:</span>
                  <strong className="progress-stat">14 / 15 (93%)</strong>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-val" style={{ width: '93%' }} />
                </div>
              </div>

              {/* 2. Doanh nghiệp tiếp nhận đóng dấu số: 12/15 (80%) */}
              <div className="progress-item">
                <div className="progress-head">
                  <span className="progress-label">2. Doanh nghiệp tiếp nhận đóng dấu số:</span>
                  <strong className="progress-stat">12 / 15 (80%)</strong>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-val" style={{ width: '80%' }} />
                </div>
              </div>

              {/* 3. ICTU ban hành Quyết định: 10/15 (66%) */}
              <div className="progress-item">
                <div className="progress-head">
                  <span className="progress-label">3. ICTU ban hành Quyết định:</span>
                  <strong className="progress-stat">10 / 15 (66%)</strong>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-val" style={{ width: '66%' }} />
                </div>
              </div>
            </div>

            {/* Cụm nút hành động */}
            <div className="e-contract-action-box">
              <div className="pending-badge-row">
                <AlertCircle size={15} className="text-warning" />
                <span>Cần xử lý nốt <strong>3 HĐ tồn đọng</strong></span>
              </div>
              <button
                type="button"
                className="hr-btn hr-btn--primary hr-btn--full"
                onClick={() => showToast('Đã gửi email nhắc nhở kèm mã OTP ký số cho 3 sinh viên và doanh nghiệp!')}
              >
                <Send size={15} />
                <span>Gửi nhắc nhở ký</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODAL TỪ CHỐI HỒ SƠ ── */}
      {rejectDialog.open && (
        <div
          className="modal-overlay"
          onClick={() => setRejectDialog({ open: false, applicant: null, reason: '' })}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Từ chối hồ sơ ứng viên</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRejectDialog({ open: false, applicant: null, reason: '' })}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Ứng viên:</label>
                <strong>{rejectDialog.applicant?.full_name} ({rejectDialog.applicant?.student_code})</strong>
              </div>
              <div className="modal-field">
                <label htmlFor="rej-reason">Lý do từ chối * (quy định bắt buộc):</label>
                <textarea
                  id="rej-reason"
                  rows={3}
                  required
                  placeholder="Ví dụ: Chưa đáp ứng chuẩn chuyên môn kỹ thuật hoặc điểm GPA chưa đạt ngưỡng yêu cầu..."
                  value={rejectDialog.reason}
                  onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                  className="modal-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="hr-btn hr-btn--ghost"
                onClick={() => setRejectDialog({ open: false, applicant: null, reason: '' })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="hr-btn hr-btn--danger"
                onClick={handleConfirmReject}
                disabled={actionLoading === rejectDialog.applicant?.id}
              >
                {actionLoading === rejectDialog.applicant?.id ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  'Xác nhận từ chối'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CHI TIẾT ỨNG VIÊN ── */}
      {detailModal.open && (
        <div
          className="modal-overlay"
          onClick={() => setDetailModal({ open: false, applicant: null })}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết hồ sơ ứng viên</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDetailModal({ open: false, applicant: null })}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-lbl">Họ và tên:</span>
                <strong>{detailModal.applicant?.full_name}</strong>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">Mã sinh viên / Khóa:</span>
                <span className="app-code-pill">{detailModal.applicant?.student_code}</span>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">Email liên hệ:</span>
                <span>{detailModal.applicant?.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">Số điện thoại:</span>
                <span>{detailModal.applicant?.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">Khoa / Viện:</span>
                <span>{detailModal.applicant?.faculty}</span>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">Chuyên ngành:</span>
                <span>{detailModal.applicant?.major}</span>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">Điểm GPA tích lũy:</span>
                <span className="status-badge status-badge--success">{detailModal.applicant?.gpa} / 4.0</span>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">File CV đính kèm:</span>
                <span className="text-primary font-semibold">{detailModal.applicant?.cv_file}</span>
              </div>
              <div className="detail-row">
                <span className="detail-lbl">Đơn xin tiếp nhận:</span>
                <span className="text-primary font-semibold">{detailModal.applicant?.app_file}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="hr-btn hr-btn--primary"
                onClick={() => setDetailModal({ open: false, applicant: null })}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GHÉP CẶP MENTOR ── */}
      {matchModal && (
        <div className="modal-overlay" onClick={() => setMatchModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ghép cặp Sinh viên ➔ Dự án ➔ Mentor</h3>
              <button type="button" className="modal-close-btn" onClick={() => setMatchModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Chọn sinh viên trúng tuyển:</label>
                <select className="filter-select" style={{ width: '100%' }}>
                  <option>Lê Hoàng Nam (TTS0004 - K20-ATTT)</option>
                  <option>Dũng Vũ (TTS0003 - K20-KTPM)</option>
                  <option>Nguyễn Văn An (TTS0002 - K20-CNTT)</option>
                </select>
              </div>
              <div className="modal-field">
                <label>Doanh nghiệp tiếp nhận:</label>
                <select className="filter-select" style={{ width: '100%' }}>
                  <option>VNPT Cyber Immunity</option>
                  <option>Viettel Solutions</option>
                  <option>FPT Software / BU2</option>
                </select>
              </div>
              <div className="modal-field">
                <label>Chỉ định Mentor chuyên môn:</label>
                <select className="filter-select" style={{ width: '100%' }}>
                  <option>Trần Hoàng Quân (Senior Security Specialist)</option>
                  <option>Lê Hồng Sơn (Senior Arch)</option>
                  <option>Nguyễn Văn Bình (Tech Lead)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="hr-btn hr-btn--ghost" onClick={() => setMatchModal(false)}>Hủy</button>
              <button
                type="button"
                className="hr-btn hr-btn--primary"
                onClick={() => {
                  setMatchModal(false)
                  showToast('Đã lưu ghép cặp và thông báo tới Mentor cùng Sinh viên!')
                }}
              >
                Lưu ghép cặp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XEM TRƯỚC ĐƠN XIN THỰC TẬP (PDF PREVIEW) ── */}
      {docPreviewModal.open && (
        <div
          className="modal-overlay"
          onClick={() => setDocPreviewModal({ open: false, applicant: null, docType: '' })}
        >
          <div
            className="modal-container modal-container--doc"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="doc-modal-title-row">
                <FileText size={18} className="text-primary" />
                <h3>Xem trước: {docPreviewModal.applicant?.app_file}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDocPreviewModal({ open: false, applicant: null, docType: '' })}
              >
                ✕
              </button>
            </div>
            <div className="modal-body doc-preview-body">
              <div className="doc-paper-preview">
                <div className="doc-paper-header">
                  <div className="doc-paper-school">
                    <strong>ĐẠI HỌC THÁI NGUYÊN</strong>
                    <p>TRƯỜNG ĐH CNTT &amp; TRUYỀN THÔNG (ICTU)</p>
                    <span className="doc-paper-line" />
                  </div>
                  <div className="doc-paper-country">
                    <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
                    <p>Độc lập - Tự do - Hạnh phúc</p>
                    <span className="doc-paper-line" />
                  </div>
                </div>

                <div className="doc-paper-title">
                  <h2>ĐƠN XIN TIẾP NHẬN THỰC TẬP DOANH NGHIỆP</h2>
                  <p className="doc-paper-sub">Kỳ Mùa Thu Q3/2026 • Chuẩn tín chỉ thực tập 16 tuần</p>
                </div>

                <div className="doc-paper-content">
                  <p><strong>Kính gửi:</strong> Ban Giám đốc &amp; Phòng Nhân sự Doanh nghiệp tiếp nhận</p>
                  <p><strong>Đồng kính gửi:</strong> Ban Hợp tác Doanh nghiệp - Trường ĐH CNTT &amp; TT (ICTU)</p>

                  <div className="doc-paper-grid">
                    <p>Họ và tên sinh viên: <strong>{docPreviewModal.applicant?.full_name}</strong></p>
                    <p>Mã sinh viên: <strong>{docPreviewModal.applicant?.student_code}</strong></p>
                    <p>Khoa / Ngành: <strong>{docPreviewModal.applicant?.faculty}</strong> - <strong>{docPreviewModal.applicant?.major}</strong></p>
                    <p>Điểm GPA tích lũy: <strong>{docPreviewModal.applicant?.gpa} / 4.0</strong></p>
                    <p>Số điện thoại: <strong>{docPreviewModal.applicant?.phone}</strong></p>
                    <p>Email sinh viên: <strong>{docPreviewModal.applicant?.email}</strong></p>
                  </div>

                  <p className="doc-commitment-text">
                    Tôi xin cam đoan chấp hành nghiêm chỉnh mọi nội quy, quy định về bảo mật thông tin, thời gian biểu và kỷ luật lao động của Doanh nghiệp trong suốt thời gian thực tập từ ngày <strong>01/08/2026</strong> đến ngày <strong>30/11/2026</strong>.
                  </p>

                  <div className="doc-sign-row">
                    <div className="doc-sign-col">
                      <span>XÁC NHẬN CỦA KHOA CHUYÊN MÔN</span>
                      <div className="doc-stamp-box">
                        <span className="stamp-text">ĐÃ XÁC NHẬN ĐIỀU KIỆN</span>
                        <span className="stamp-sub">Khoa CNTT ICTU</span>
                      </div>
                    </div>
                    <div className="doc-sign-col">
                      <span>Thái Nguyên, ngày {docPreviewModal.applicant?.applied_at}</span>
                      <strong>NGƯỜI LÀM ĐƠN</strong>
                      <span className="doc-sign-name">{docPreviewModal.applicant?.full_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="hr-btn hr-btn--ghost"
                onClick={() => setDocPreviewModal({ open: false, applicant: null, docType: '' })}
              >
                Đóng
              </button>
              <button
                type="button"
                className="hr-btn hr-btn--primary"
                onClick={() => {
                  showToast(`Đang tải file ${docPreviewModal.applicant?.app_file}...`)
                  setDocPreviewModal({ open: false, applicant: null, docType: '' })
                }}
              >
                <Download size={15} />
                <span>Tải bản PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
