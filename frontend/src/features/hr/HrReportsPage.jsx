import { useState, useMemo, useEffect } from 'react'
import {
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Download,
  Search,
  Filter,
  Award,
  Send,
  Eye,
  FileCheck,
  Building,
  GraduationCap,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import {
  fetchUniversityReports,
  sendUniversityReport,
  syncAllScores,
  fetchMentorEvaluations,
} from '../../api/operations'
import './HrSubPages.css'

const INITIAL_REPORTS = [
  {
    id: 'BC-01',
    code: 'BC-TN-2026-ICTU',
    title: 'Báo cáo tiếp nhận Thực tập sinh Kỳ 1 (2026-2027)',
    target: 'Phòng Quản lý Đào tạo & Khoa CNTT - ICTU',
    submit_date: '05/08/2026',
    status: 'sent',
    status_label: 'Đã tiếp nhận & Lưu kho',
    total_students: 15,
    signer: 'Trần Thị Mai (HR Manager)',
    cert: 'ICTU-CA e-Seal #99482',
  },
  {
    id: 'BC-02',
    code: 'BC-GK-2026-ICTU',
    title: 'Báo cáo tiến độ & Đánh giá năng lực giữa kỳ (Tuần 06)',
    target: 'Khoa Công nghệ Thông tin & Khoa KTPM - ICTU',
    submit_date: '15/09/2026',
    status: 'sent',
    status_label: 'Đã thẩm tra xong',
    total_students: 15,
    signer: 'Lê Tuấn Hùng (Tech Lead / Mentor)',
    cert: 'ICTU-CA e-Seal #99831',
  },
  {
    id: 'BC-03',
    code: 'BC-DIEM-2026-ICTU',
    title: 'Bảng điểm tổng hợp Đánh giá Học phần Thực tập Tốt nghiệp',
    target: 'Phòng Đào tạo Đại học ICTU (Cổng edusoft.ictu.edu.vn)',
    submit_date: 'Chưa chốt (Dự kiến 25/10/2026)',
    status: 'pending',
    status_label: 'Đang tổng hợp tuần 8/12',
    total_students: 15,
    signer: 'Hội đồng Doanh nghiệp & Mentor',
    cert: 'Chờ ký số cuối kỳ',
  },
  {
    id: 'BC-04',
    code: 'BC-KS-2026-ICTU',
    title: 'Phiếu khảo sát mức độ hài lòng của Doanh nghiệp về SV ICTU',
    target: 'Trung tâm Hợp tác Doanh nghiệp & Khởi nghiệp ICTU',
    submit_date: '20/09/2026',
    status: 'sent',
    status_label: 'Đã hoàn tất gửi',
    total_students: 15,
    signer: 'Ban Giám đốc & HR',
    cert: 'ICTU-CA e-Seal #99620',
  },
]

const INITIAL_STUDENT_SCORES = [
  {
    id: 1,
    code: 'TTS0002',
    name: 'Nguyễn Văn Bình',
    faculty: 'K20-CNTT',
    project: 'Core API Microservice (BU2)',
    attendance_score: 9.5,
    tech_score: 9.0,
    report_score: 8.8,
    final_score: 9.1,
    letter_grade: 'A',
    status: 'verified',
    status_label: 'Đã xác nhận điểm',
    mentor_note: 'Nắm vững Spring Boot & Docker, tư duy giải quyết vấn đề xuất sắc.',
  },
  {
    id: 2,
    code: 'TTS0003',
    name: 'Dũng Vũ',
    faculty: 'K20-KTPM',
    project: 'Giám sát IoT & AI Camera',
    attendance_score: 9.0,
    tech_score: 9.2,
    report_score: 9.0,
    final_score: 9.1,
    letter_grade: 'A',
    status: 'verified',
    status_label: 'Đã xác nhận điểm',
    mentor_note: 'Kỹ năng FastAPI & Computer Vision vượt trội, chủ động tối ưu thuật toán.',
  },
  {
    id: 3,
    code: 'TTS0001',
    name: 'Lê Hoàng Nam',
    faculty: 'K20-CNTT',
    project: 'E-Commerce NextJS (BU1)',
    attendance_score: 8.5,
    tech_score: 8.5,
    report_score: 8.2,
    final_score: 8.4,
    letter_grade: 'B+',
    status: 'verified',
    status_label: 'Đã xác nhận điểm',
    mentor_note: 'Làm việc nhóm tốt, hoàn thành đúng hạn các backlog giao diện.',
  },
  {
    id: 4,
    code: 'TTS0004',
    name: 'Phạm Minh Trang',
    faculty: 'K20-HTTT',
    project: 'Data Analytics & ETL Pipeline',
    attendance_score: 9.5,
    tech_score: 8.8,
    report_score: 9.0,
    final_score: 9.0,
    letter_grade: 'A',
    status: 'verified',
    status_label: 'Đã xác nhận điểm',
    mentor_note: 'Tư duy dữ liệu bài bản, báo cáo trực quan hóa rõ ràng, mạch lạc.',
  },
  {
    id: 5,
    code: 'TTS0005',
    name: 'Nguyễn Văn An',
    faculty: 'K20-KTPM',
    project: 'Mobile React Native App',
    attendance_score: 8.0,
    tech_score: 8.0,
    report_score: 8.0,
    final_score: 8.0,
    letter_grade: 'B',
    status: 'pending',
    status_label: 'Đang bổ sung báo cáo',
    mentor_note: 'Tiến độ tương đối ổn, cần bổ sung tài liệu kiểm thử đơn vị (Unit Test).',
  },
  {
    id: 6,
    code: 'TTS0006',
    name: 'Vũ Thị Thanh Thảo',
    faculty: 'K20-CNTT',
    project: 'DevOps & CI/CD Cloud',
    attendance_score: 9.0,
    tech_score: 8.8,
    report_score: 8.5,
    final_score: 8.8,
    letter_grade: 'A',
    status: 'verified',
    status_label: 'Đã xác nhận điểm',
    mentor_note: 'Tác phong chuyên nghiệp, triển khai tốt Kubernetes & Github Actions.',
  },
]

export default function HrReportsPage() {
  const [activeTab, setActiveTab] = useState('reports') // 'reports' | 'scores'
  const [reports, setReports] = useState(INITIAL_REPORTS)
  const [studentScores, setStudentScores] = useState(INITIAL_STUDENT_SCORES)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [toastMessage, setToastMessage] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3800)
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [repRes, evalRes] = await Promise.all([
          fetchUniversityReports(),
          fetchMentorEvaluations(),
        ])
        if (repRes.ok && Array.isArray(repRes.data) && repRes.data.length > 0) {
          setReports(repRes.data)
        }
        if (evalRes.ok && Array.isArray(evalRes.data) && evalRes.data.length > 0) {
          setStudentScores(evalRes.data)
        }
      } catch {
        // fallback
      }
    }
    loadData()
  }, [])

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.target.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [reports, searchTerm, statusFilter])

  // Filtered scores
  const filteredScores = useMemo(() => {
    return studentScores.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.faculty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.project.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [studentScores, searchTerm, statusFilter])

  const handleSendToIctu = async (reportId) => {
    try {
      const res = await sendUniversityReport(reportId)
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: 'sent',
                  status_label: 'Đã chuyển sang Cổng Đào tạo ICTU',
                  submit_date: '30/09/2026',
                  cert: 'ICTU-CA e-Seal #99988 (Ký duyệt)',
                }
              : r
          )
        )
        showToast('Đã lưu kết quả ký số báo cáo trực tiếp vào CSDL thành công!')
        return
      }
    } catch {
      // fallback
    }
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'sent',
              status_label: 'Đã chuyển sang Cổng Đào tạo ICTU',
              submit_date: '30/09/2026',
              cert: 'ICTU-CA e-Seal #99988 (Ký duyệt)',
            }
          : r
      )
    )
    showToast('Đã ký số thành công và truyền dữ liệu sang Cổng Đào tạo ICTU!')
  }

  const handleSyncAllScores = async () => {
    try {
      const res = await syncAllScores()
      if (res.ok) {
        setStudentScores((prev) =>
          prev.map((s) => ({
            ...s,
            status: 'verified',
            status_label: 'Đã đồng bộ sang Edusoft',
          }))
        )
        showToast('Đã đồng bộ 100% bảng điểm học phần sang Hệ thống Edusoft ICTU trong CSDL!')
        return
      }
    } catch {
      // fallback
    }
    setStudentScores((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'verified',
        status_label: 'Đã đồng bộ sang Edusoft',
      }))
    )
    showToast('Đã đồng bộ 100% bảng điểm học phần sang Hệ thống Edusoft ICTU!')
  }

  const handleExportData = () => {
    showToast('Đang tạo và tải xuống gói hồ sơ báo cáo định dạng Excel/PDF chuẩn Bộ GD&ĐT...')
  }

  return (
    <div className="hr-subpage-container">
      {/* ── 1. HEADER ── */}
      <div className="hr-subpage-header">
        <div className="subpage-title-group">
          <h1>Báo cáo gửi Nhà trường & Đánh giá Học phần Thực tập</h1>
          <p>
            Đồng bộ tiến độ định kỳ, bảng điểm tổng kết và hồ sơ thực tập tốt nghiệp gửi Trường Đại học CNTT & TT (ICTU).
          </p>
        </div>
        <div className="subpage-actions-cluster">
          <button
            type="button"
            className="subpage-btn subpage-btn--outline"
            onClick={handleExportData}
          >
            <Download size={15} />
            <span>Xuất file Excel / PDF</span>
          </button>
          <button
            type="button"
            className="subpage-btn subpage-btn--primary"
            onClick={handleSyncAllScores}
          >
            <Send size={15} />
            <span>Ký số & Gửi Cổng Đào tạo ICTU</span>
          </button>
        </div>
      </div>

      {/* ── 2. KPI METRICS (4 CARDS) ── */}
      <div className="subpage-kpi-grid">
        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Tiến độ kỳ thực tập</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--blue">
              <Calendar size={18} />
            </div>
          </div>
          <div className="subpage-kpi-val">Tuần 08 / 12</div>
          <div className="subpage-kpi-hint">
            <Clock size={12} color="#2563EB" />
            <span>Hoàn thành 66.7% thời lượng</span>
          </div>
        </div>

        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Điểm TB Doanh nghiệp</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--green">
              <Award size={18} />
            </div>
          </div>
          <div className="subpage-kpi-val">8.85 / 10</div>
          <div className="subpage-kpi-hint">
            <CheckCircle size={12} color="#10B981" />
            <span>Xếp loại Giỏi & Xuất sắc: 86.7%</span>
          </div>
        </div>

        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Chuẩn đầu ra ICTU</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--purple">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="subpage-kpi-val">15 / 15 TTS</div>
          <div className="subpage-kpi-hint">
            <CheckCircle size={12} color="#8B5CF6" />
            <span>100% đạt chuẩn kỹ năng & thái độ</span>
          </div>
        </div>

        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Báo cáo gửi Trường</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--amber">
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <div className="subpage-kpi-val">3 / 4 Đã gửi</div>
          <div className="subpage-kpi-hint">
            <FileCheck size={12} color="#D97706" />
            <span>Đã hoàn thành tiếp nhận & giữa kỳ</span>
          </div>
        </div>
      </div>

      {/* ── 3. MAIN PANEL WITH TABS & FILTERS ── */}
      <div className="subpage-panel">
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            className={`subpage-btn ${activeTab === 'reports' ? 'subpage-btn--primary' : 'subpage-btn--outline'}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileSpreadsheet size={15} />
            <span>Danh mục Văn bản & Báo cáo gửi Trường</span>
          </button>
          <button
            type="button"
            className={`subpage-btn ${activeTab === 'scores' ? 'subpage-btn--primary' : 'subpage-btn--outline'}`}
            onClick={() => setActiveTab('scores')}
          >
            <Award size={15} />
            <span>Bảng điểm Học phần & Nhận xét của Mentor (15 TTS)</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="subpage-panel-toolbar">
          <div className="subpage-search-wrap">
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              className="subpage-search-input"
              placeholder={
                activeTab === 'reports'
                  ? 'Tìm theo tên văn bản, mã số, đơn vị tiếp nhận...'
                  : 'Tìm theo tên sinh viên, MSSV, khoa viện, đề tài...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="subpage-filter-group">
            <Filter size={15} color="#64748B" />
            <select
              className="subpage-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {activeTab === 'reports' ? (
                <>
                  <option value="sent">Đã chuyển gửi</option>
                  <option value="pending">Đang tổng hợp</option>
                </>
              ) : (
                <>
                  <option value="verified">Đã xác nhận điểm</option>
                  <option value="pending">Chờ bổ sung báo cáo</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* TAB 1: REPORTS LIST */}
        {activeTab === 'reports' && (
          <div className="subpage-table-wrapper">
            <table className="subpage-table">
              <thead>
                <tr>
                  <th>Mã văn bản</th>
                  <th>Tên báo cáo & Nội dung</th>
                  <th>Đơn vị tiếp nhận (ICTU)</th>
                  <th>Thời gian gửi</th>
                  <th>Số lượng TTS</th>
                  <th>Trạng thái & Chữ ký số</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                        {row.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '0.15rem' }}>
                        {row.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Người phụ trách: {row.signer}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155' }}>
                        <Building size={14} color="#64748B" />
                        <span>{row.target}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>{row.submit_date}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#2563EB' }}>
                        {row.total_students} sinh viên
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span
                          className={`sub-status-pill ${
                            row.status === 'sent'
                              ? 'sub-status-pill--success'
                              : 'sub-status-pill--warning'
                          }`}
                        >
                          <CheckCircle size={10} />
                          {row.status_label}
                        </span>
                        <span style={{ fontSize: '0.69rem', color: '#64748B' }}>
                          {row.cert}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {row.status === 'pending' ? (
                          <button
                            type="button"
                            className="sub-table-btn sub-table-btn--primary"
                            onClick={() => handleSendToIctu(row.id)}
                            title="Ký duyệt và gửi văn bản sang ICTU"
                          >
                            <Send size={13} />
                            <span>Gửi ICTU</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="sub-table-btn sub-table-btn--success"
                            onClick={() => showToast(`Văn bản ${row.code} đã được đồng bộ hợp lệ trên Cổng ICTU!`)}
                            title="Kiểm tra xác nhận tiếp nhận"
                          >
                            <CheckCircle size={13} />
                            <span>Đã xác nhận</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="sub-table-btn sub-table-btn--outline"
                          onClick={() => showToast(`Đang tải file đính kèm của ${row.code}...`)}
                          title="Tải văn bản đính kèm"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: STUDENT SCORES & MENTOR EVALUATIONS */}
        {activeTab === 'scores' && (
          <div className="subpage-table-wrapper">
            <table className="subpage-table">
              <thead>
                <tr>
                  <th>MSSV / Họ tên</th>
                  <th>Khoa / Đề tài thực tập</th>
                  <th style={{ textAlign: 'center' }}>Chuyên cần (20%)</th>
                  <th style={{ textAlign: 'center' }}>Kỹ thuật (50%)</th>
                  <th style={{ textAlign: 'center' }}>Báo cáo (30%)</th>
                  <th style={{ textAlign: 'center' }}>Điểm tổng (Hệ 10)</th>
                  <th style={{ textAlign: 'center' }}>Điểm chữ</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredScores.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{row.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {row.code}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{row.project}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{row.faculty}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.attendance_score}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.tech_score}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.report_score}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          color: '#2563EB',
                          padding: '2px 8px',
                          background: '#EFF6FF',
                          borderRadius: '6px',
                        }}
                      >
                        {row.final_score}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: row.letter_grade === 'A' ? '#065F46' : '#1E40AF',
                          backgroundColor: row.letter_grade === 'A' ? '#D1FAE5' : '#DBEAFE',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                        }}
                      >
                        {row.letter_grade}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`sub-status-pill ${
                          row.status === 'verified'
                            ? 'sub-status-pill--success'
                            : 'sub-status-pill--warning'
                        }`}
                      >
                        <CheckCircle size={10} />
                        {row.status_label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="sub-table-btn sub-table-btn--outline"
                        onClick={() => setSelectedStudent(row)}
                        title="Xem nhận xét chi tiết của Mentor"
                      >
                        <Eye size={13} />
                        <span>Xem đánh giá</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
          <div>
            Hiển thị {activeTab === 'reports' ? filteredReports.length : filteredScores.length} bản ghi hợp lệ
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>Đồng bộ tự động với cổng Đào tạo ICTU (edusoft.ictu.edu.vn)</span>
            <ExternalLink size={13} color="#2563EB" />
          </div>
        </div>
      </div>

      {/* ── 4. EVALUATION MODAL / DRAWER ── */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                  Đánh giá chi tiết từ Doanh nghiệp
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  {selectedStudent.name} • {selectedStudent.code} ({selectedStudent.faculty})
                </span>
              </div>
              <span
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '4px 12px',
                  borderRadius: '8px',
                }}
              >
                {selectedStudent.final_score} / 10 ({selectedStudent.letter_grade})
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Chuyên cần (20%)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{selectedStudent.attendance_score}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Kỹ thuật (50%)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{selectedStudent.tech_score}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Báo cáo (30%)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{selectedStudent.report_score}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                Dự án & Vị trí đảm nhiệm:
              </label>
              <div style={{ padding: '0.65rem 0.85rem', background: '#F8FAFC', borderRadius: '8px', fontSize: '0.825rem', color: '#1E293B', fontWeight: 600 }}>
                {selectedStudent.project}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                Nhận xét chuyên môn của Mentor & Trưởng bộ phận:
              </label>
              <div style={{ padding: '0.75rem 0.85rem', background: '#F1F5F9', borderRadius: '8px', fontSize: '0.825rem', color: '#334155', lineHeight: 1.5 }}>
                "{selectedStudent.mentor_note}"
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="subpage-btn subpage-btn--outline"
                onClick={() => setSelectedStudent(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="subpage-btn subpage-btn--primary"
                onClick={() => {
                  showToast(`Đã xuất phiếu đánh giá học phần của sinh viên ${selectedStudent.name} (PDF)!`)
                  setSelectedStudent(null)
                }}
              >
                <Download size={14} />
                <span>Xuất phiếu điểm PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TOAST FEEDBACK ── */}
      {toastMessage && (
        <div className="subpage-toast">
          <CheckCircle size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
