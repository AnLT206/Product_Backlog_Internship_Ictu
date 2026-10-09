import { useState, useEffect } from 'react'
import {
  FileText,
  CheckCircle2,
  Download,
  Eye,
  Trash2,
  Lock,
} from 'lucide-react'
import apiFetch from '../../api/client'
import WeeklyReportForm from './WeeklyReportForm'
import { useInternMetrics, notifyInternDataChanged } from './utils/internMetrics'
import './InternDashboardPage.css'
import './InternReportsPage.css'

/**
 * Format date display safely to DD/MM/YYYY
 */
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '--'
  if (dateStr.includes('/')) return dateStr
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

/**
 * Helper lấy thời gian nộp chuẩn xác (ngày tháng năm giờ phút)
 */
const getSubmissionTime = (r) => {
  if (!r) return '--'
  if (r.report_time && !r.report_time.startsWith('Tuần')) {
    return r.report_time
  }
  if (r.submitted_at && !r.submitted_at.startsWith('Tuần')) {
    return r.submitted_at.replace(' (Vừa xong)', '')
  }
  if (r.submittedDate) {
    return `${formatDateDisplay(r.submittedDate)} 16:45`
  }
  return '28/09/2026 16:45'
}

/**
 * Helper lấy tên công việc hiển thị gọn gàng
 */
const getTaskName = (r) => {
  if (r.task_name) return r.task_name
  if (r.task_title) return r.task_title
  if (r.title) return r.title
  const content = r.contentSummary || r.summary || r.content || ''
  if (!content) return 'Báo cáo tiến độ công việc tuần'
  const firstSentence = content.split(/[.\n]/)[0].trim()
  if (firstSentence && firstSentence.length > 5 && firstSentence.length < 80) {
    return firstSentence
  }
  return content.length > 65 ? content.substring(0, 65) + '...' : content
}

const INITIAL_REPORTS = [
  {
    id: 1,
    report_time: '28/09/2026 16:45',
    submitted_at: '28/09/2026 16:45',
    submittedDate: '2026-09-28',
    task_name: 'Phát triển API phân quyền RBAC & Unit Test Sprint 1',
    summary:
      'Hoàn thiện API phân quyền RBAC bằng JWT, viết Unit Test đạt 85% coverage và chuẩn bị tài liệu báo cáo Sprint 1.',
    contentSummary:
      'Hoàn thiện API phân quyền RBAC bằng JWT, viết Unit Test đạt 85% coverage và chuẩn bị tài liệu báo cáo Sprint 1.',
    issues: 'Gặp conflict nhỏ khi merge nhánh feature/auth vào staging, đã tự giải quyết sau 15 phút.',
    plan: 'Tiếp tục hoàn thiện các endpoint thống kê và chuẩn bị demo với Mentor vào Thứ Hai tới.',
    file_name: 'BaoCaoTuan08_NguyenVanAn.docx',
    fileName: 'BaoCaoTuan08_NguyenVanAn.docx',
    fileSize: '1.42 MB',
    feedback: 'Code sạch, tuân thủ đúng chuẩn GitFlow. Cần chú ý thêm trường hợp validate email trống.',
    status: 'Đã duyệt',
  },
  {
    id: 2,
    report_time: '20/09/2026 17:15',
    submitted_at: '20/09/2026 17:15',
    submittedDate: '2026-09-20',
    task_name: 'Kiểm thử API auth/register & môi trường Docker Compose',
    summary:
      'Tìm hiểu kiến trúc dự án, cài đặt môi trường Docker Compose và kiểm thử API auth/register.',
    contentSummary:
      'Tìm hiểu kiến trúc dự án, cài đặt môi trường Docker Compose và kiểm thử API auth/register.',
    issues: 'Không có vướng mắc kỹ thuật lớn.',
    plan: 'Phát triển tiếp tính năng login và lưu trữ JWT session.',
    file_name: 'BaoCaoTuan07_NguyenVanAn.docx',
    fileName: 'BaoCaoTuan07_NguyenVanAn.docx',
    fileSize: '1.18 MB',
    feedback: 'Báo cáo đầy đủ, tiến độ đạt yêu cầu.',
    status: 'Đã duyệt',
  },
]

export default function InternReportsPage() {
  const { metrics, refreshMetrics } = useInternMetrics()
  const [reports, setReports] = useState(() => {
    try {
      const stored = localStorage.getItem('intern_report_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = parsed.map((item, idx) => ({
            ...item,
            report_time:
              item.report_time && !item.report_time.startsWith('Tuần')
                ? item.report_time
                : (item.submitted_at && !item.submitted_at.startsWith('Tuần')
                    ? item.submitted_at.replace(' (Vừa xong)', '')
                    : (idx === 0 ? '28/09/2026 16:45' : '20/09/2026 17:15')),
            task_name:
              item.task_name ||
              (idx === 0
                ? 'Phát triển API phân quyền RBAC & Unit Test Sprint 1'
                : 'Kiểm thử API auth/register & môi trường Docker Compose'),
          }))
          localStorage.setItem('intern_report_history', JSON.stringify(migrated))
          return migrated
        }
      }
    } catch (err) {
      console.warn('LocalStorage error:', err)
    }
    return INITIAL_REPORTS
  })

  const [reportModal, setReportModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Đồng bộ thời gian thực từ CSDL và localStorage khi component mount
  useEffect(() => {
    async function loadReports() {
      let merged = []
      // 1. Tải từ API CSDL
      try {
        const res = await apiFetch('/api/intern/reports')
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          merged = res.data
        }
      } catch (err) {
        console.warn('Load api reports fallback:', err)
      }

      // 2. Kết hợp với localStorage
      try {
        const stored = localStorage.getItem('intern_report_history')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((item) => {
              const exists = merged.some((m) => m.id === item.id)
              if (!exists) {
                merged.push(item)
              } else {
                merged = merged.map((m) =>
                  m.id === item.id
                    ? {
                        ...item,
                        ...m,
                        feedback: m.mentor_feedback || m.feedback || item.feedback,
                        score: m.score ?? item.score,
                        status: m.status || item.status,
                      }
                    : m
                )
              }
            })
          }
        }
      } catch (err) {
        console.warn('LocalStorage error:', err)
      }

      if (merged.length > 0) {
        setReports(merged)
        try {
          localStorage.setItem('intern_report_history', JSON.stringify(merged))
        } catch {}
      }
    }

    loadReports()

    const handleDataChanged = () => {
      loadReports()
    }
    window.addEventListener('storage', handleDataChanged)
    window.addEventListener('intern_data_changed', handleDataChanged)
    return () => {
      window.removeEventListener('storage', handleDataChanged)
      window.removeEventListener('intern_data_changed', handleDataChanged)
    }
  }, [])

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Xóa báo cáo khi Mentor chưa phê duyệt
  const handleDeleteReport = (id, e) => {
    if (e) e.stopPropagation()
    const report = reports.find((r) => r.id === id)
    if (!report) return

    if (report.status === 'Đã duyệt' || report.status === 'approved') {
      showToast('Báo cáo đã được Mentor phê duyệt, không thể xóa.', 'error')
      return
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa báo cáo "${getTaskName(report)}" không?`)) {
      setReports((prev) => {
        const next = prev.filter((r) => r.id !== id)
        try {
          localStorage.setItem('intern_report_history', JSON.stringify(next))
        } catch {
          // fallback
        }
        notifyInternDataChanged()
        refreshMetrics()
        return next
      })
      if (selectedReport?.id === id) {
        setSelectedReport(null)
      }
      if (typeof id === 'number' && id > 0) {
        apiFetch(`/api/intern/reports/${id}`, { method: 'DELETE' }).catch(() => {})
      }
      showToast('Đã xóa báo cáo thực tập thành công!')
    }
  }

  // Lọc báo cáo theo từ khóa
  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase()
    return (
      (r.week && r.week.toLowerCase().includes(q)) ||
      (r.report_time && r.report_time.toLowerCase().includes(q)) ||
      (r.task_name && r.task_name.toLowerCase().includes(q)) ||
      (r.summary && r.summary.toLowerCase().includes(q)) ||
      (r.contentSummary && r.contentSummary.toLowerCase().includes(q)) ||
      (r.fileName && r.fileName.toLowerCase().includes(q)) ||
      (r.feedback && r.feedback.toLowerCase().includes(q))
    )
  })


  return (
    <div className="intern-dashboard-container">
      {/* Toast thông báo */}
      {toast && (
        <div className={`intern-toast intern-toast--${toast.type}`} role="alert">
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── BANNER TIÊU ĐỀ TRANG ── */}
      <header className="intern-top-banner">
        <div className="intern-top-banner-main">
          <div className="intern-welcome-group">
            <div className="intern-avatar-badge">
              <FileText size={22} color="#FFFFFF" />
            </div>
            <div>
              <div className="intern-welcome-title-row">
                <h1>Báo Cáo Tuần & Lịch Sử Nhận Xét</h1>
                <span className="intern-badge-official">Đánh giá Sprint hàng tuần</span>
              </div>
              <p className="intern-welcome-sub">
                Nộp báo cáo định kỳ trước 18:00 Thứ Sáu để Mentor đánh giá kết quả và hỗ trợ kỹ thuật.
              </p>
            </div>
          </div>

          <div className="intern-action-cluster">
            <button
              type="button"
              className="intern-btn intern-btn--primary"
              onClick={() => setReportModal(true)}
            >
              <span>Nộp báo cáo tuần mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── CÁC THẺ CHỈ SỐ BÁO CÁO & ĐÁNH GIÁ SPRINT (TỰ ĐỘNG LIÊN KẾT) ── */}
      <section className="att-kpi-summary-grid" aria-label="Chỉ số báo cáo Sprint">
        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Báo cáo định kỳ đã nộp</span>
            <div className="att-kpi-value">
              {metrics.submittedReportsCount} <span className="att-kpi-unit">bản</span>
            </div>
            <span className="att-kpi-sub">{metrics.approvedReportsCount} báo cáo đã được Mentor duyệt</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Điểm rèn luyện & KPI</span>
            <div className="att-kpi-value">
              {metrics.kpiScore} <span className="att-kpi-unit">/ 100 đ</span>
            </div>
            <span className="att-kpi-sub">Xếp hạng: Hạng {metrics.kpiGrade} ({metrics.kpiGradeLabel})</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Tiến độ Sprint 1 liên kết</span>
            <div className="att-kpi-value">{metrics.sprintProgress}%</div>
            <span className="att-kpi-sub">{metrics.doneTasks}/{metrics.totalTasks} nhiệm vụ đã hoàn thành</span>
          </div>
        </div>

        <div className="att-kpi-card">
          <div className="att-kpi-icon att-kpi-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="att-kpi-info">
            <span className="att-kpi-label">Chuyên cần tháng 10</span>
            <div className="att-kpi-value">
              {metrics.actualWorkDays} <span className="att-kpi-unit">/ {metrics.standardWorkDays} ngày</span>
            </div>
            <span className="att-kpi-sub">Tỷ lệ chuyên cần đạt {metrics.attendanceRate}%</span>
          </div>
        </div>
      </section>

      {/* ── BẢNG LỊCH SỬ BÁO CÁO ĐÃ NỘP ── */}
      <section className="reports-history-panel">
        <div className="reports-panel-header">
          <div className="reports-panel-titles">
            <h2>Lịch Sử Báo Cáo Thực Tập & Nhận Xét Của Mentor</h2>
            <p>Toàn bộ các báo cáo tuần đã gửi lên hệ thống và phản hồi chi tiết từ cán bộ hướng dẫn.</p>
          </div>

          <div className="reports-search-box">
            <input
              type="text"
              className="reports-search-clean-input"
              placeholder="Tìm theo tuần, nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="reports-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Xóa tìm kiếm"
                aria-label="Xóa nội dung tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Danh sách bảng báo cáo */}
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Thời gian nộp</th>
                <th style={{ minWidth: '300px' }}>Tên công việc</th>
                <th style={{ width: '170px' }}>File đính kèm</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>
                    Không tìm thấy báo cáo nào phù hợp với từ khóa tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r, index) => (
                  <tr key={r.id || index}>
                    <td>
                      <div className="reports-time-wrap">
                        <span className="reports-time-text">
                          {getSubmissionTime(r)}
                        </span>
                        {index === 0 && (
                          <span className="reports-new-badge">Mới</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="reports-task-btn"
                        onClick={() => setSelectedReport(r)}
                        title="Click để xem chi tiết công việc & nhận xét của Mentor"
                      >
                        <span className="reports-task-name">
                          {getTaskName(r)}
                        </span>
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="reports-file-pill"
                        onClick={() =>
                          showToast(`Đang tải file [${r.fileName || r.file_name || 'BaoCao.docx'}]...`)
                        }
                        title={r.fileName || r.file_name || 'BaoCao.docx'}
                      >
                        <Download size={13} style={{ flexShrink: 0 }} />
                        <span>{r.fileName || r.file_name || 'BaoCao.docx'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`reports-status-pill ${
                          r.status === 'Đã duyệt' ? 'status--approved' : 'status--pending'
                        }`}
                      >
                        {r.status || 'Chờ duyệt'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="reports-action-group">
                        <button
                          type="button"
                          className="reports-action-btn reports-action-btn--view"
                          onClick={() => setSelectedReport(r)}
                          title="Xem lại chi tiết báo cáo & nhận xét"
                        >
                          <Eye size={13} />
                          <span>Xem</span>
                        </button>
                        {r.status !== 'Đã duyệt' && r.status !== 'approved' ? (
                          <button
                            type="button"
                            className="reports-action-btn reports-action-btn--delete"
                            onClick={(e) => handleDeleteReport(r.id, e)}
                            title="Xóa báo cáo khi Mentor chưa duyệt"
                          >
                            <Trash2 size={13} />
                            <span>Xóa</span>
                          </button>
                        ) : (
                          <span
                            className="reports-action-locked"
                            title="Mentor đã duyệt — không thể xóa"
                          >
                            <Lock size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── MODAL NỘP BÁO CÁO TUẦN (WEEKLY REPORT FORM) ── */}
      {reportModal && (
        <div
          className="modal-overlay"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '24px 16px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '860px',
              width: '100%',
              margin: 'auto',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <WeeklyReportForm
              isModal={true}
              onCancel={() => setReportModal(false)}
              onSubmitSuccess={(newReport) => {
                const weekName = newReport.report_time || newReport.week || newReport.week_title || 'Báo cáo mới'
                const todayStr =
                  newReport.submittedDate ||
                  newReport.submitted_at ||
                  new Date().toISOString().split('T')[0]
                const contentText =
                  newReport.contentSummary ||
                  newReport.content ||
                  newReport.tasks_done ||
                  'Đã nộp báo cáo tiến độ tuần.'
                const fileDisp = newReport.fileName || newReport.file_name || 'BaoCao.docx'

                const newCard = {
                  id: newReport.id || Date.now(),
                  week: weekName,
                  report_time: weekName,
                  week_range: `${weekName} (${todayStr})`,
                  task_name: newReport.task_name || (contentText.length > 50 ? contentText.substring(0, 50) + '...' : contentText),
                  submittedDate: todayStr,
                  submitted_at: weekName,
                  contentSummary: contentText,
                  summary: contentText,
                  fileName: fileDisp,
                  file_name: fileDisp,
                  fileSize: newReport.fileSize || '1.2 MB',
                  issues: newReport.issues || '',
                  plan: newReport.plan || 'Tiếp tục Sprint kế tiếp theo kế hoạch',
                  status: 'Chờ duyệt',
                  feedback: null,
                }

                setReports((prev) => {
                  const updated = [newCard, ...prev]
                  try {
                    localStorage.setItem('intern_report_history', JSON.stringify(updated))
                  } catch (err) {
                    console.warn('LocalStorage write error:', err)
                  }
                  notifyInternDataChanged()
                  refreshMetrics()
                  return updated
                })

                setReportModal(false)
                showToast(`🎉 Báo cáo (${weekName}) đã được nộp và lưu trực tiếp vào hệ thống thành công!`, 'success')
              }}
            />
          </div>
        </div>
      )}

      {/* ── MODAL CHI TIẾT CÔNG VIỆC & NHẬN XÉT CỦA MENTOR ── */}
      {selectedReport && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedReport(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            zIndex: 1000,
            overflowY: 'auto',
          }}
        >
          <div
            className="reports-detail-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div className="reports-modal-header">
              <div>
                <span className="reports-modal-tag">Báo cáo tuần</span>
                <h3 className="reports-modal-title">Chi Tiết Công Việc & Nhận Xét Của Mentor</h3>
              </div>
              <button
                type="button"
                className="reports-modal-close"
                onClick={() => setSelectedReport(null)}
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="reports-modal-body">
              {/* Meta row: Thời gian & Trạng thái */}
              <div className="reports-detail-meta-grid">
                <div className="reports-meta-item">
                  <span className="reports-meta-label">Thời gian nộp:</span>
                  <span className="reports-meta-val">{getSubmissionTime(selectedReport)}</span>
                </div>
                <div className="reports-meta-item">
                  <span className="reports-meta-label">Trạng thái:</span>
                  <span className={`reports-status-pill ${selectedReport.status === 'Đã duyệt' ? 'status--approved' : 'status--pending'}`}>
                    {selectedReport.status || 'Chờ duyệt'}
                  </span>
                </div>
              </div>

              {/* Tên công việc */}
              <div className="reports-detail-section">
                <div className="reports-section-title">Tên công việc</div>
                <div className="reports-task-title-display">
                  {getTaskName(selectedReport)}
                </div>
              </div>

              {/* Chi tiết nội dung công việc */}
              <div className="reports-detail-section">
                <div className="reports-section-title">Chi tiết nội dung công việc hoàn thành</div>
                <div className="reports-section-box">
                  {selectedReport.contentSummary || selectedReport.summary || selectedReport.content || 'Chưa có nội dung mô tả chi tiết.'}
                </div>
              </div>

              {/* Vướng mắc (nếu có) */}
              {selectedReport.issues && (
                <div className="reports-detail-section">
                  <div className="reports-section-title">Vướng mắc kỹ thuật & giải pháp</div>
                  <div className="reports-issues-box">
                    <span className="reports-issues-label">Vướng mắc:</span> {selectedReport.issues}
                  </div>
                </div>
              )}

              {/* File đính kèm */}
              <div className="reports-detail-section">
                <div className="reports-section-title">File đính kèm</div>
                <div>
                  <button
                    type="button"
                    className="reports-file-pill"
                    onClick={() =>
                      showToast(`Đang tải file [${selectedReport.fileName || selectedReport.file_name || 'BaoCao.docx'}]...`)
                    }
                    title="Tải về file đính kèm"
                  >
                    <Download size={14} style={{ flexShrink: 0 }} />
                    <span>{selectedReport.fileName || selectedReport.file_name || 'BaoCao.docx'}</span>
                  </button>
                </div>
              </div>

              {/* Lời nhận xét từ Mentor (Được làm nổi bật đặc biệt) */}
              <div className="reports-detail-section">
                <div className="reports-section-title" style={{ color: '#1D4ED8' }}>
                  Lời nhận xét từ Mentor
                </div>
                {selectedReport.feedback ? (
                  <div className="reports-mentor-feedback-card">
                    <p className="reports-mentor-feedback-quote">
                      "{selectedReport.feedback}"
                    </p>
                  </div>
                ) : (
                  <div className="reports-mentor-feedback-empty">
                    Hiện tại chưa có nhận xét từ cán bộ hướng dẫn (Mentor). Báo cáo đang trong danh sách chờ review.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="reports-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedReport.status !== 'Đã duyệt' && selectedReport.status !== 'approved' ? (
                <button
                  type="button"
                  className="reports-btn-danger"
                  onClick={() => handleDeleteReport(selectedReport.id)}
                  title="Xóa báo cáo khi Mentor chưa phê duyệt"
                >
                  <Trash2 size={14} />
                  <span>Hủy / Xóa báo cáo này</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                className="wrf-btn wrf-btn-cancel"
                onClick={() => setSelectedReport(null)}
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
