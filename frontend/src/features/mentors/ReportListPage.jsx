/**
 * ReportListPage.jsx
 * Route: /mentor/reports
 *
 * Màn hình danh sách báo cáo tuần cần duyệt dành cho Mentor.
 * Cột: Thực tập sinh, Tiêu đề/Tuần, Ngày nộp, Trạng thái (chưa đọc / đã phản hồi), Nút "Xem chi tiết".
 * Dữ liệu MOCK ở task này (Task 1), sẵn sàng thay thế bằng API GET /api/mentor/reports ở Task 2.
 */

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMockReports } from './mockReports'
import './ReportListPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers & Constants
   ───────────────────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  submitted: {
    label: 'Chưa đọc',
    badgeClass: 'rlp-badge--submitted',
    description: 'Báo cáo mới nộp, chờ mentor xem và phản hồi',
  },
  reviewed: {
    label: 'Đã phản hồi',
    badgeClass: 'rlp-badge--reviewed',
    description: 'Mentor đã gửi nhận xét và chấm điểm',
  },
}

function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatPeriod(start, end) {
  if (!start || !end) return ''
  const s = new Date(start).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  const e = new Date(end).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${s} – ${e}`
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
export default function ReportListPage() {
  const navigate = useNavigate()
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Load mock reports
  const reports = useMemo(() => {
    return getMockReports({ status: filterStatus, search: searchQuery })
  }, [filterStatus, searchQuery])

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const all = getMockReports()
    const pendingCount = all.filter((r) => r.status === 'submitted').length
    const reviewedCount = all.filter((r) => r.status === 'reviewed').length
    return {
      total: all.length,
      pending: pendingCount,
      reviewed: reviewedCount,
    }
  }, [])

  return (
    <div className="rlp-page">
      {/* ── Breadcrumb & Header ── */}
      <div className="rlp-header">
        <div>
          <div className="rlp-crumb">
            <Link to="/mentor/dashboard" className="rlp-crumb__link">
              Mentor
            </Link>
            <span className="rlp-crumb__sep">/</span>
            <span>Báo cáo tuần</span>
          </div>
          <h1>Báo cáo cần duyệt</h1>
          <p className="rlp-lead">
            Theo dõi tiến độ định kỳ và gửi phản hồi, chấm điểm cho các thực tập sinh bạn phụ trách.
          </p>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      <div className="rlp-stats-grid">
        <div className="rlp-stat-card">
          <div className="rlp-stat-card__number">{stats.total}</div>
          <div className="rlp-stat-card__label">Tổng số báo cáo</div>
        </div>
        <div className="rlp-stat-card rlp-stat-card--pending">
          <div className="rlp-stat-card__number">{stats.pending}</div>
          <div className="rlp-stat-card__label">Chưa đọc / Cần duyệt</div>
        </div>
        <div className="rlp-stat-card rlp-stat-card--reviewed">
          <div className="rlp-stat-card__number">{stats.reviewed}</div>
          <div className="rlp-stat-card__label">Đã gửi phản hồi</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="rlp-filter-card">
        <div className="rlp-filter-card__search">
          <svg
            className="rlp-search-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            className="rlp-search-input"
            placeholder="Tìm theo tên thực tập sinh, mã TTS hoặc tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="rlp-filter-card__selects">
          <label className="rlp-filter-label" htmlFor="rlp-status-select">
            Trạng thái:
          </label>
          <select
            id="rlp-status-select"
            className="rlp-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="submitted">Chưa đọc</option>
            <option value="reviewed">Đã phản hồi</option>
          </select>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="rlp-table-wrap">
        <table className="rlp-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '24%' }}>
                Thực tập sinh
              </th>
              <th scope="col" style={{ width: '38%' }}>
                Tiêu đề / Tuần
              </th>
              <th scope="col" style={{ width: '14%' }}>
                Ngày nộp
              </th>
              <th scope="col" style={{ width: '12%' }}>
                Trạng thái
              </th>
              <th scope="col" style={{ width: '12%', textAlign: 'right' }}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="rlp-empty">
                  <div className="rlp-empty__content">
                    <p className="rlp-empty__title">Không tìm thấy báo cáo nào</p>
                    <p className="rlp-empty__sub">
                      {searchQuery || filterStatus
                        ? 'Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.'
                        : 'Hiện tại chưa có báo cáo tuần nào từ thực tập sinh.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const statusMeta = STATUS_CONFIG[report.status] || {
                  label: report.status,
                  badgeClass: '',
                }

                return (
                  <tr key={report.id} className="rlp-row">
                    {/* Cột 1: Thực tập sinh */}
                    <td>
                      <div className="rlp-user-info">
                        <div className="rlp-user-avatar" aria-hidden="true">
                          {report.user_name ? report.user_name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div className="rlp-user-meta">
                          <span className="rlp-user-name">{report.user_name || 'Chưa cập nhật'}</span>
                          <span className="rlp-user-code">
                            {report.user_code || `ID: ${report.user_id}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Tiêu đề / Tuần */}
                    <td>
                      <div className="rlp-report-title-cell">
                        <span className="rlp-week-badge">Tuần {report.week_number}</span>
                        <span className="rlp-report-title" title={report.title}>
                          {report.title}
                        </span>
                        {report.start_date && report.end_date && (
                          <span className="rlp-period-text">
                            {formatPeriod(report.start_date, report.end_date)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 3: Ngày nộp */}
                    <td>
                      <span className="rlp-date-text">{formatDate(report.created_at)}</span>
                    </td>

                    {/* Cột 4: Trạng thái (badge: chưa đọc / đã phản hồi) */}
                    <td>
                      <span className={`rlp-badge ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    </td>

                    {/* Cột 5: Nút "Xem chi tiết" */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="rlp-btn-detail"
                        onClick={() => navigate(`/mentor/reports/${report.id}`)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
