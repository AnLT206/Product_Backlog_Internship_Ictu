import { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import './InternDashboardPage.css'
import './InternAllowancePage.css'

// Dữ liệu mẫu danh sách phụ cấp theo từng tháng
const INITIAL_ALLOWANCE_DATA = [
  {
    id: 'ALW-2026-10',
    periodMonth: 10,
    periodYear: 2026,
    periodLabel: 'Tháng 10 / 2026',
    actualWorkDays: 22,
    standardWorkDays: 22,
    baseAllowance: 3500000,
    lunchAllowance: 660000,
    bonusAmount: 500000,
    bonusReason: 'Thưởng hoàn thành xuất sắc Sprint 1 & chuyên cần 100%',
    deductionAmount: 0,
    deductionReason: '',
    netTotal: 4660000,
    paymentDate: '2026-11-05 (Dự kiến)',
    status: 'processing', // 'paid' | 'processing' | 'pending'
    statusLabel: 'Đang xử lý tính công',
    bankAccount: 'MB Bank • 999908123456 • NGUYEN VAN BINH',
    transactionCode: 'CHỜ CẤP MÃ GD',
    note: 'Đang đợi chốt bảng chấm công ngày 31/10/2026',
  },
  {
    id: 'ALW-2026-09',
    periodMonth: 9,
    periodYear: 2026,
    periodLabel: 'Tháng 09 / 2026',
    actualWorkDays: 21.5,
    standardWorkDays: 22,
    baseAllowance: 3500000,
    lunchAllowance: 645000,
    bonusAmount: 500000,
    bonusReason: 'Thưởng đóng góp xây dựng hệ thống Intern Portal',
    deductionAmount: 0,
    deductionReason: '',
    netTotal: 4645000,
    paymentDate: '2026-10-05',
    status: 'paid',
    statusLabel: 'Đã thanh toán',
    bankAccount: 'MB Bank • 999908123456 • NGUYEN VAN BINH',
    transactionCode: 'FT2627891823901',
    note: 'Đã chuyển khoản qua Internet Banking MB Priority',
  },
  {
    id: 'ALW-2026-08',
    periodMonth: 8,
    periodYear: 2026,
    periodLabel: 'Tháng 08 / 2026',
    actualWorkDays: 22,
    standardWorkDays: 22,
    baseAllowance: 3500000,
    lunchAllowance: 660000,
    bonusAmount: 300000,
    bonusReason: 'Thưởng điểm danh đúng giờ và bài test onboarding đạt loại A',
    deductionAmount: 0,
    deductionReason: '',
    netTotal: 4460000,
    paymentDate: '2026-09-05',
    status: 'paid',
    statusLabel: 'Đã thanh toán',
    bankAccount: 'MB Bank • 999908123456 • NGUYEN VAN BINH',
    transactionCode: 'FT2624510984213',
    note: 'Đã hoàn tất chi trả',
  },
  {
    id: 'ALW-2026-07',
    periodMonth: 7,
    periodYear: 2026,
    periodLabel: 'Tháng 07 / 2026',
    actualWorkDays: 20,
    standardWorkDays: 21,
    baseAllowance: 3500000,
    lunchAllowance: 600000,
    bonusAmount: 0,
    bonusReason: '',
    deductionAmount: 0,
    deductionReason: '',
    netTotal: 4100000,
    paymentDate: '2026-08-05',
    status: 'paid',
    statusLabel: 'Đã thanh toán',
    bankAccount: 'MB Bank • 999908123456 • NGUYEN VAN BINH',
    transactionCode: 'FT2621487612044',
    note: 'Đã hoàn tất chi trả',
  },
  {
    id: 'ALW-2026-06',
    periodMonth: 6,
    periodYear: 2026,
    periodLabel: 'Tháng 06 / 2026',
    actualWorkDays: 15,
    standardWorkDays: 15,
    baseAllowance: 2500000,
    lunchAllowance: 450000,
    bonusAmount: 0,
    bonusReason: '',
    deductionAmount: 0,
    deductionReason: '',
    netTotal: 2950000,
    paymentDate: '2026-07-05',
    status: 'paid',
    statusLabel: 'Đã thanh toán',
    bankAccount: 'MB Bank • 999908123456 • NGUYEN VAN BINH',
    transactionCode: 'FT2618309182741',
    note: 'Kỳ Onboarding gia nhập nửa cuối tháng 6',
  },
]

function formatVND(amount) {
  if (amount === null || amount === undefined) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export default function InternAllowancePage() {
  const { user } = useAuth()
  const [data] = useState(INITIAL_ALLOWANCE_DATA)
  const [filterYear, setFilterYear] = useState('2026')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSlip, setSelectedSlip] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 4

  // Filter logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filterYear !== 'all' && item.periodYear.toString() !== filterYear) return false
      if (filterMonth !== 'all' && item.periodMonth.toString() !== filterMonth) return false
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchCode = item.id.toLowerCase().includes(query)
        const matchTx = item.transactionCode.toLowerCase().includes(query)
        const matchNote = item.note.toLowerCase().includes(query)
        if (!matchCode && !matchTx && !matchNote) return false
      }
      return true
    })
  }, [data, filterYear, filterMonth, filterStatus, searchQuery])

  // Total summary calculations
  const totalPaid = useMemo(() => {
    return data
      .filter((i) => i.status === 'paid')
      .reduce((sum, item) => sum + item.netTotal, 0)
  }, [data])

  const pendingAllowance = useMemo(() => {
    return data
      .filter((i) => i.status !== 'paid')
      .reduce((sum, item) => sum + item.netTotal, 0)
  }, [data])

  const totalWorkDays = useMemo(() => {
    return data.reduce((sum, item) => sum + item.actualWorkDays, 0)
  }, [data])

  // Pagination slice
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  // Handle filter changes with simulated brief loading
  const handleFilterChange = (setter, value) => {
    setIsLoading(true)
    setter(value)
    setCurrentPage(1)
    setTimeout(() => {
      setIsLoading(false)
    }, 250)
  }

  const handlePrintSlip = () => {
    window.print()
  }

  return (
    <div className="intern-dashboard-page intern-allowance-page">
      {/* ── Page Header ── */}
      <div className="idp-page-header">
        <div className="idp-header-left">
          <h1 className="idp-header-title">Lịch Sử Phụ Cấp & Thu Nhập</h1>
          <p className="idp-header-sub">
            Theo dõi danh sách các kỳ phụ cấp thực tập, chi tiết ngày công, mức hỗ trợ ăn trưa và trạng thái chi trả qua tài khoản ngân hàng.
          </p>
        </div>
        <div className="idp-header-actions">
          <button
            type="button"
            className="idp-btn-secondary"
            onClick={() => {
              setIsLoading(true)
              setTimeout(() => setIsLoading(false), 400)
            }}
            title="Làm mới dữ liệu"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Đồng bộ dữ liệu
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="alw-summary-grid">
        <div className="alw-kpi-card alw-card-paid">
          <div className="alw-kpi-icon-wrap green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="alw-kpi-content">
            <span className="alw-kpi-label">Tổng phụ cấp đã nhận</span>
            <div className="alw-kpi-value">{formatVND(totalPaid)}</div>
            <span className="alw-kpi-sub">Lũy kế 4 kỳ chi trả thành công</span>
          </div>
        </div>

        <div className="alw-kpi-card alw-card-pending">
          <div className="alw-kpi-icon-wrap blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="alw-kpi-content">
            <span className="alw-kpi-label">Phụ cấp ước tính T10/2026</span>
            <div className="alw-kpi-value">{formatVND(pendingAllowance)}</div>
            <span className="alw-kpi-sub">Dự kiến chi trả ngày 05/11/2026</span>
          </div>
        </div>

        <div className="alw-kpi-card alw-card-workdays">
          <div className="alw-kpi-icon-wrap amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="alw-kpi-content">
            <span className="alw-kpi-label">Tổng ngày công tích lũy</span>
            <div className="alw-kpi-value">{totalWorkDays} <span className="unit">ngày</span></div>
            <span className="alw-kpi-sub">Tỷ lệ chuyên cần đạt 98.2%</span>
          </div>
        </div>

        <div className="alw-kpi-card alw-card-bank">
          <div className="alw-kpi-icon-wrap purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div className="alw-kpi-content">
            <span className="alw-kpi-label">Tài khoản thụ hưởng</span>
            <div className="alw-kpi-value-bank">MB Bank • 999908123456</div>
            <span className="alw-kpi-sub">NGUYEN VAN BINH • Đã xác thực</span>
          </div>
        </div>
      </div>

      {/* ── Main Data Section ── */}
      <div className="idp-card alw-main-card">
        {/* Filter Controls Bar */}
        <div className="alw-filter-bar">
          <div className="alw-filter-controls">
            <div className="alw-filter-item">
              <label htmlFor="filter-year">Năm</label>
              <select
                id="filter-year"
                className="alw-select"
                value={filterYear}
                onChange={(e) => handleFilterChange(setFilterYear, e.target.value)}
              >
                <option value="all">Tất cả năm</option>
                <option value="2026">Năm 2026</option>
                <option value="2025">Năm 2025</option>
              </select>
            </div>

            <div className="alw-filter-item">
              <label htmlFor="filter-month">Kỳ phụ cấp</label>
              <select
                id="filter-month"
                className="alw-select"
                value={filterMonth}
                onChange={(e) => handleFilterChange(setFilterMonth, e.target.value)}
              >
                <option value="all">Tất cả tháng</option>
                <option value="10">Tháng 10</option>
                <option value="9">Tháng 09</option>
                <option value="8">Tháng 08</option>
                <option value="7">Tháng 07</option>
                <option value="6">Tháng 06</option>
              </select>
            </div>

            <div className="alw-filter-item">
              <label htmlFor="filter-status">Trạng thái chi trả</label>
              <select
                id="filter-status"
                className="alw-select"
                value={filterStatus}
                onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="paid">Đã thanh toán</option>
                <option value="processing">Đang xử lý</option>
                <option value="pending">Chờ phê duyệt</option>
              </select>
            </div>

            <div className="alw-filter-item alw-search-wrap">
              <label htmlFor="alw-search">Tìm kiếm</label>
              <div className="alw-search-input-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="alw-search"
                  type="text"
                  placeholder="Mã phiếu, mã giao dịch..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="alw-count-badge">
            Tổng cộng: <strong>{filteredData.length}</strong> kỳ phụ cấp
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="alw-loading-state">
            <div className="idp-spinner" />
            <p>Đang tải dữ liệu lịch sử phụ cấp...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="alw-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 12V7H3v10a2 2 0 0 0 2 2h7" />
              <line x1="1" y1="10" x2="23" y2="10" />
              <line x1="16" y1="16" x2="22" y2="22" />
              <circle cx="19" cy="19" r="2" />
            </svg>
            <h3>Không tìm thấy dữ liệu phụ cấp</h3>
            <p>Không có kỳ phụ cấp nào khớp với bộ lọc đã chọn. Vui lòng thử lại với các tiêu chí khác.</p>
            <button
              type="button"
              className="idp-btn-secondary"
              onClick={() => {
                setFilterYear('all')
                setFilterMonth('all')
                setFilterStatus('all')
                setSearchQuery('')
              }}
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="alw-table-wrapper">
            <table className="alw-table">
              <thead>
                <tr>
                  <th>Kỳ phụ cấp</th>
                  <th className="text-center">Ngày công</th>
                  <th className="text-right">Phụ cấp cơ bản</th>
                  <th className="text-right">Trợ cấp ăn trưa</th>
                  <th className="text-right">Thưởng / KPI</th>
                  <th className="text-right">Thực nhận</th>
                  <th>Ngày chi trả</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id} className="alw-row">
                    <td>
                      <div className="alw-period-title">{item.periodLabel}</div>
                      <div className="alw-period-code">Mã: {item.id}</div>
                    </td>
                    <td className="text-center">
                      <span className="alw-workdays-badge">
                        <strong>{item.actualWorkDays}</strong> / {item.standardWorkDays} công
                      </span>
                    </td>
                    <td className="text-right">{formatVND(item.baseAllowance)}</td>
                    <td className="text-right">{formatVND(item.lunchAllowance)}</td>
                    <td className="text-right">
                      {item.bonusAmount > 0 ? (
                        <span className="alw-bonus-text" title={item.bonusReason}>
                          +{formatVND(item.bonusAmount)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="alw-net-amount">{formatVND(item.netTotal)}</div>
                    </td>
                    <td>
                      <div className="alw-date-text">{item.paymentDate}</div>
                      {item.transactionCode && item.transactionCode !== 'CHỜ CẤP MÃ GD' && (
                        <div className="alw-tx-code" title={item.transactionCode}>
                          Ref: {item.transactionCode}
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      {item.status === 'paid' && (
                        <span className="alw-status-badge badge-paid">
                          <span className="badge-dot dot-paid" />
                          Đã chi trả
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="alw-status-badge badge-processing">
                          <span className="badge-dot dot-processing" />
                          Đang xử lý
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="alw-status-badge badge-pending">
                          <span className="badge-dot dot-pending" />
                          Chờ duyệt
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="alw-btn-view"
                        onClick={() => setSelectedSlip(item)}
                        title="Xem phiếu chi tiết (Payslip)"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Phiếu lương
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Controls ── */}
        {!isLoading && filteredData.length > 0 && (
          <div className="alw-pagination">
            <div className="alw-page-info">
              Hiển thị {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredData.length)} trong tổng số{' '}
              {filteredData.length} kỳ phụ cấp
            </div>
            <div className="alw-page-controls">
              <button
                type="button"
                className="alw-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`alw-page-number ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="alw-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Trang kế
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Payslip Detail Modal ── */}
      {selectedSlip && (
        <div className="idp-modal-backdrop" onClick={() => setSelectedSlip(null)}>
          <div
            className="idp-modal-content alw-slip-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="alw-slip-header">
              <div className="alw-slip-org">
                <span className="alw-slip-org-badge">ICTU ENTERPRISE HUB</span>
                <h3>PHIẾU CHI TRẢ PHỤ CẤP THỰC TẬP</h3>
                <p>Kỳ hạch toán: <strong>{selectedSlip.periodLabel}</strong> (Mã: {selectedSlip.id})</p>
              </div>
              <button
                type="button"
                className="idp-modal-close"
                onClick={() => setSelectedSlip(null)}
              >
                ✕
              </button>
            </div>

            <div className="alw-slip-body">
              {/* Intern Information Box */}
              <div className="alw-slip-intern-box">
                <div className="alw-slip-info-col">
                  <div><strong>Họ và tên:</strong> {user?.full_name || 'TTS'}</div>
                  <div><strong>Mã TTS:</strong> TTS0002</div>
                  <div><strong>Vị trí:</strong> Thực tập sinh Fullstack / React-FastAPI</div>
                </div>
                <div className="alw-slip-info-col">
                  <div><strong>Mentor phụ trách:</strong> Mentor</div>
                  <div><strong>Phòng ban:</strong> Ban Đào tạo & Dự án Doanh nghiệp</div>
                  <div><strong>Trạng thái:</strong> {selectedSlip.statusLabel}</div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="alw-slip-breakdown">
                <h4>Chi tiết các khoản phụ cấp & hỗ trợ</h4>
                <div className="alw-slip-item-row">
                  <span>1. Mức phụ cấp thực tập cơ bản theo thỏa thuận</span>
                  <strong>{formatVND(selectedSlip.baseAllowance)}</strong>
                </div>
                <div className="alw-slip-item-row">
                  <span>2. Ngày công thực tế ghi nhận ({selectedSlip.actualWorkDays} / {selectedSlip.standardWorkDays} ngày công tiêu chuẩn)</span>
                  <span className="alw-sub-calc">Hệ số: 100%</span>
                </div>
                <div className="alw-slip-item-row">
                  <span>3. Trợ cấp ăn trưa & đi lại (30.000 ₫/ngày công thực tế)</span>
                  <strong>{formatVND(selectedSlip.lunchAllowance)}</strong>
                </div>
                {selectedSlip.bonusAmount > 0 && (
                  <div className="alw-slip-item-row bonus-highlight">
                    <div>
                      <span>4. Thưởng hiệu quả công việc / Chuyên cần</span>
                      <div className="alw-slip-note">{selectedSlip.bonusReason}</div>
                    </div>
                    <strong className="text-success">+{formatVND(selectedSlip.bonusAmount)}</strong>
                  </div>
                )}
                {selectedSlip.deductionAmount > 0 && (
                  <div className="alw-slip-item-row">
                    <span>5. Các khoản giảm trừ</span>
                    <strong className="text-danger">-{formatVND(selectedSlip.deductionAmount)}</strong>
                  </div>
                )}

                <div className="alw-slip-total-row">
                  <span>TỔNG CỘNG THỰC LĨNH (NET):</span>
                  <span className="alw-slip-total-amount">{formatVND(selectedSlip.netTotal)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="alw-slip-bank-info">
                <div className="alw-bank-info-line">
                  <strong>Tài khoản chuyển khoản:</strong> {selectedSlip.bankAccount}
                </div>
                <div className="alw-bank-info-line">
                  <strong>Mã tham chiếu ngân hàng:</strong> {selectedSlip.transactionCode}
                </div>
                <div className="alw-bank-info-line">
                  <strong>Thời gian hạch toán:</strong> {selectedSlip.paymentDate}
                </div>
                <div className="alw-bank-info-line">
                  <strong>Ghi chú từ Phòng Kế toán:</strong> {selectedSlip.note}
                </div>
              </div>

              {/* Signatures */}
              <div className="alw-slip-signatures">
                <div className="alw-sig-box">
                  <span className="alw-sig-title">Người lập biểu</span>
                  <div className="alw-sig-space" />
                  <span className="alw-sig-name">Trần Thị Thu Thảo</span>
                  <span className="alw-sig-role">Phòng Nhân sự & Đào tạo</span>
                </div>
                <div className="alw-sig-box">
                  <span className="alw-sig-title">Kế toán trưởng duyệt</span>
                  <div className="alw-sig-space digital-stamp">ĐÃ KÝ ĐIỆN TỬ</div>
                  <span className="alw-sig-name">Vũ Quang Hưng</span>
                  <span className="alw-sig-role">Phòng Kế toán - Tài vụ</span>
                </div>
              </div>
            </div>

            <div className="alw-slip-footer">
              <button
                type="button"
                className="idp-btn-secondary"
                onClick={handlePrintSlip}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                In / Lưu file PDF
              </button>
              <button
                type="button"
                className="idp-btn-primary"
                onClick={() => setSelectedSlip(null)}
              >
                Đóng phiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
