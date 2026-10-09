import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import apiFetch from '../../api/client'
import { useInternMetrics } from './utils/internMetrics'
import './InternDashboardPage.css'
import './InternAllowancePage.css'

function numberToVietnameseWords(n) {
  if (!n || isNaN(n) || n === 0) return 'Không đồng chẵn.'
  const units = ['', ' nghìn', ' triệu', ' tỷ']
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

  function readGroup(group, showZeroHundred = false) {
    const h = Math.floor(group / 100)
    const t = Math.floor((group % 100) / 10)
    const u = group % 10
    let res = ''
    if (h > 0 || showZeroHundred) {
      res += digits[h] + ' trăm '
    }
    if (t === 0 && (h > 0 || showZeroHundred) && u > 0) {
      res += 'lẻ '
    } else if (t === 1) {
      res += 'mười '
    } else if (t > 1) {
      res += digits[t] + ' mươi '
    }
    if (t > 1 && u === 1) {
      res += 'mốt'
    } else if (t > 0 && u === 5) {
      res += 'lăm'
    } else if (u > 0) {
      res += digits[u]
    }
    return res.trim()
  }

  let numStr = Math.round(Math.abs(n)).toString()
  const groups = []
  while (numStr.length > 0) {
    groups.unshift(parseInt(numStr.slice(-3), 10))
    numStr = numStr.slice(0, -3)
  }

  const parts = []
  for (let i = 0; i < groups.length; i++) {
    const grp = groups[i]
    const unitIdx = groups.length - 1 - i
    if (grp > 0) {
      const showZero = i > 0
      const read = readGroup(grp, showZero)
      if (read) {
        parts.push(read + units[unitIdx])
      }
    }
  }

  const result = parts.join(' ').trim()
  if (!result) return 'Không đồng chẵn.'
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.'
}

function cleanVietnamese(str, fallback = 'Thưởng hoàn thành xuất sắc nhiệm vụ Sprint & chuyên cần 100%') {
  if (!str || typeof str !== 'string') return fallback
  if (
    str.includes('ThÆ') ||
    str.includes('xuá') ||
    str.includes('hoÃ') ||
    str.includes('nhiá') ||
    str.includes('chuyÃ') ||
    str.includes('cáº') ||
    str.includes('')
  ) {
    return fallback
  }
  return str
}

function getInitialAllowanceData(profile, user, metrics) {
  const bankStr = `${profile?.bank_name || user?.bank_name || 'MB Bank'} • ${profile?.bank_account || user?.bank_account || '001203019123'} • ${user?.full_name || 'TTS'}`
  const actualDays = metrics?.actualWorkDays ?? 22
  const standardDays = metrics?.standardWorkDays ?? 22
  const baseAlw = metrics?.baseAllowance ?? 2500000
  const lunchAlw = metrics?.lunchAllowance ?? (actualDays * 30000)
  const bonus = metrics?.bonusAmount ?? 500000
  const bonusMsg = metrics?.bonusReason || 'Thưởng hoàn thành xuất sắc Sprint 1 & chuyên cần 100%'
  const deduct = metrics?.deductionAmount ?? 0
  const deductMsg = metrics?.deductionReason || ''
  const net = metrics?.netTotal ?? (baseAlw + lunchAlw + bonus - deduct)

  return [
    {
      id: 'ALW-2026-10',
      periodMonth: 10,
      periodYear: 2026,
      periodLabel: 'Tháng 10 / 2026',
      actualWorkDays: actualDays,
      standardWorkDays: standardDays,
      lateDays: metrics?.lateDays ?? 0,
      baseAllowance: baseAlw,
      baseContractAllowance: baseAlw,
      lunchAllowance: lunchAlw,
      bonusAmount: bonus,
      bonusReason: bonusMsg,
      otherAllowance: 0,
      deductionAmount: deduct,
      deductionReason: deductMsg,
      netTotal: net,
      paymentDate: '2026-11-05 (Dự kiến)',
      status: 'processing',
      statusLabel: 'Đang xử lý tính công',
      bankAccount: bankStr,
      transactionCode: 'CHỜ CẤP MÃ GD',
      note: 'Đang đợi chốt bảng chấm công ngày 31/10/2026',
    },
    {
      id: 'ALW-2026-09',
      periodMonth: 9,
      periodYear: 2026,
      periodLabel: 'Tháng 09 / 2026',
      actualWorkDays: 22,
      standardWorkDays: 22,
      lateDays: 0,
      baseAllowance: 2500000,
      lunchAllowance: 660000,
      bonusAmount: 500000,
      bonusReason: 'Thưởng đóng góp xây dựng hệ thống Intern Portal & đạt KPI loại A',
      otherAllowance: 0,
      deductionAmount: 0,
      deductionReason: '',
      netTotal: 3660000,
      paymentDate: '2026-10-05',
      status: 'paid',
      statusLabel: 'Đã thanh toán',
      bankAccount: bankStr,
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
      lateDays: 0,
      baseAllowance: 2500000,
      lunchAllowance: 660000,
      bonusAmount: 300000,
      bonusReason: 'Thưởng điểm danh đúng giờ và bài test onboarding đạt loại A',
      otherAllowance: 0,
      deductionAmount: 0,
      deductionReason: '',
      netTotal: 3460000,
      paymentDate: '2026-09-05',
      status: 'paid',
      statusLabel: 'Đã thanh toán',
      bankAccount: bankStr,
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
      lateDays: 1,
      baseAllowance: 2500000,
      lunchAllowance: 600000,
      bonusAmount: 0,
      bonusReason: '',
      otherAllowance: 0,
      deductionAmount: 50000,
      deductionReason: 'Khấu trừ 01 buổi đi muộn',
      netTotal: 3050000,
      paymentDate: '2026-08-05',
      status: 'paid',
      statusLabel: 'Đã thanh toán',
      bankAccount: bankStr,
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
      lateDays: 0,
      baseAllowance: 1700000,
      lunchAllowance: 450000,
      bonusAmount: 0,
      bonusReason: '',
      otherAllowance: 0,
      deductionAmount: 0,
      deductionReason: '',
      netTotal: 2150000,
      paymentDate: '2026-07-05',
      status: 'paid',
      statusLabel: 'Đã thanh toán',
      bankAccount: bankStr,
      transactionCode: 'FT2618309182741',
      note: 'Kỳ Onboarding gia nhập nửa cuối tháng 6',
    },
  ]
}

function formatVND(amount) {
  if (amount === null || amount === undefined) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export default function InternAllowancePage() {
  const { user } = useAuth()
  const { metrics } = useInternMetrics()
  const [filterYear, setFilterYear] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSlip, setSelectedSlip] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const slipBodyRef = useRef(null)

  useEffect(() => {
    if (selectedSlip && slipBodyRef.current) {
      slipBodyRef.current.scrollTop = 0
    }
  }, [selectedSlip])

  // Profile data from storage/user
  const [profile, setProfile] = useState(() => {
    try {
      const email = user?.email
      const key = email ? `ictu_user_profile_${email.toLowerCase().trim()}` : null
      const p = (key && localStorage.getItem(key)) || localStorage.getItem('ictu_user_profile')
      if (p) return JSON.parse(p)
    } catch {
      // fallback
    }
    return {
      bank_name: user?.bank_name || 'MB Bank',
      bank_account: user?.bank_account || '999908123456',
    }
  })

  const [data, setData] = useState(() => getInitialAllowanceData(profile, user, metrics))

  // Đồng bộ khi user từ Auth thay đổi (đăng xuất/đăng nhập lại)
  useEffect(() => {
    if (user) {
      const email = user.email
      const key = email ? `ictu_user_profile_${email.toLowerCase().trim()}` : null
      let nextProfile = null
      try {
        const raw = (key && localStorage.getItem(key)) || localStorage.getItem('ictu_user_profile')
        if (raw) nextProfile = JSON.parse(raw)
      } catch {
        // fallback
      }
      const activeBank = nextProfile?.bank_account || user.bank_account || '999908123456'
      const activeBankName = nextProfile?.bank_name || user.bank_name || 'MB Bank'
      setProfile({
        bank_name: activeBankName,
        bank_account: activeBank,
      })
      setData((prev) =>
        prev.map((item) => ({
          ...item,
          bankAccount: `${activeBankName} • ${activeBank} • ${user.full_name || 'TTS'}`,
        }))
      )
    }
  }, [user])

  // Cập nhật kỳ Tháng 10/2026 ngay khi các chỉ số toàn hệ thống thay đổi
  useEffect(() => {
    if (metrics) {
      setData((prev) =>
        prev.map((item) => {
          if (item.periodMonth === 10 && item.periodYear === 2026) {
            return {
              ...item,
              actualWorkDays: metrics.actualWorkDays,
              standardWorkDays: metrics.standardWorkDays,
              lateDays: metrics.lateDays,
              baseAllowance: metrics.baseAllowance,
              baseContractAllowance: metrics.baseAllowance,
              lunchAllowance: metrics.lunchAllowance,
              bonusAmount: metrics.bonusAmount,
              bonusReason: metrics.bonusReason,
              deductionAmount: metrics.deductionAmount,
              deductionReason: metrics.deductionReason,
              netTotal: metrics.netTotal,
            }
          }
          return item
        })
      )

      // Nếu đang mở xem chi tiết phiếu lương tháng 10 thì đồng bộ ngay
      setSelectedSlip((current) => {
        if (current && current.periodMonth === 10 && current.periodYear === 2026) {
          return {
            ...current,
            actualWorkDays: metrics.actualWorkDays,
            standardWorkDays: metrics.standardWorkDays,
            lateDays: metrics.lateDays,
            baseAllowance: metrics.baseAllowance,
            baseContractAllowance: metrics.baseAllowance,
            lunchAllowance: metrics.lunchAllowance,
            bonusAmount: metrics.bonusAmount,
            bonusReason: metrics.bonusReason,
            deductionAmount: metrics.deductionAmount,
            deductionReason: metrics.deductionReason,
            netTotal: metrics.netTotal,
          }
        }
        return current
      })
    }
  }, [metrics])

  useEffect(() => {
    function handleProfileUpdate(e) {
      if (e.detail) {
        setProfile(e.detail)
        setData((prev) =>
          prev.map((item) => ({
            ...item,
            bankAccount: `${e.detail.bank_name || 'MB Bank'} • ${e.detail.bank_account || '999908123456'} • ${user?.full_name || 'TTS'}`,
          }))
        )
      } else {
        try {
          const email = user?.email
          const key = email ? `ictu_user_profile_${email.toLowerCase().trim()}` : null
          const p = (key && localStorage.getItem(key)) || localStorage.getItem('ictu_user_profile')
          if (p) {
            const parsed = JSON.parse(p)
            setProfile(parsed)
            setData((prev) =>
              prev.map((item) => ({
                ...item,
                bankAccount: `${parsed.bank_name || 'MB Bank'} • ${parsed.bank_account || '999908123456'} • ${user?.full_name || 'TTS'}`,
              }))
            )
          }
        } catch {
          // fallback
        }
      }
    }
    window.addEventListener('ictu_profile_updated', handleProfileUpdate)
    return () => window.removeEventListener('ictu_profile_updated', handleProfileUpdate)
  }, [user])

  // Fetch real allowance data from API if available
  const fetchAllowances = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/api/intern/allowances')
      if (res?.ok && Array.isArray(res?.data) && res.data.length > 0) {
        const mapped = res.data.map((r) => {
          const [monthStr, yearStr] = (r.month || '09/2026').split('/')
          const monthNum = parseInt(monthStr, 10)
          const yearNum = parseInt(yearStr, 10)
          const isPaid = r.status === 'approved'
          const isProcessing = r.status === 'processing'
          const uiStatus = isPaid ? 'paid' : isProcessing ? 'processing' : 'pending'

          const actualWorkDays = r.actual_days ?? 22
          const standardWorkDays = r.standard_days ?? 22
          const baseAllowance = r.base_allowance ?? 2500000
          const lunchAllowance = r.lunch_allowance ?? (actualWorkDays * 30000)
          const bonusAmount = r.bonus_amount ?? 500000
          const bonusReason = cleanVietnamese(r.bonus_reason, 'Thưởng hoàn thành xuất sắc nhiệm vụ Sprint & chuyên cần 100%')
          const otherAllowance = 0
          const deductionAmount = r.deduction_amount ?? 0
          const deductionReason = r.deduction_reason || ''
          const netTotal = r.allowance || (baseAllowance + lunchAllowance + bonusAmount + otherAllowance - deductionAmount)

          return {
            id: `ALW-${yearNum}-${String(monthNum).padStart(2, '0')}`,
            periodMonth: monthNum,
            periodYear: yearNum,
            periodLabel: `Tháng ${String(monthNum).padStart(2, '0')} / ${yearNum}`,
            actualWorkDays,
            standardWorkDays,
            lateDays: r.late_days || 0,
            baseAllowance,
            baseContractAllowance: baseAllowance,
            lunchAllowance,
            bonusAmount,
            bonusReason,
            otherAllowance,
            deductionAmount,
            deductionReason,
            netTotal,
            paymentDate: `05/${String(monthNum + 1 > 12 ? 1 : monthNum + 1).padStart(2, '0')}/${yearNum}`,
            status: uiStatus,
            statusLabel: r.status_label || (isPaid ? 'Đã duyệt chi trả' : 'Chờ duyệt phụ cấp'),
            bankAccount: `${profile?.bank_name || user?.bank_name || 'MB Bank'} • ${profile?.bank_account || user?.bank_account || '001203019123'} • ${user?.full_name || 'TTS'}`,
            transactionCode: isPaid ? `FT${r.id}26278918` : 'CHỜ CẤP MÃ GD',
            note: isPaid ? 'Đã chuyển khoản qua Internet Banking MB Priority' : (r.status_label || 'Đang chờ xử lý'),
            targetApprover: 'hr',
          }
        })

        const initial = getInitialAllowanceData(profile, user, metrics)
        const combined = [...mapped]
        for (const item of initial) {
          if (!combined.some((m) => m.periodMonth === item.periodMonth && m.periodYear === item.periodYear)) {
            combined.push(item)
          }
        }
        setData(combined)
      } else {
        setData(getInitialAllowanceData(profile, user, metrics))
      }
    } catch {
      setData(getInitialAllowanceData(profile, user, metrics))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllowances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            onClick={fetchAllowances}
            disabled={isLoading}
            title="Làm mới dữ liệu từ hệ thống"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isLoading ? 'Đang tải...' : 'Đồng bộ dữ liệu'}
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
            <span className="alw-kpi-sub">Lũy kế {data.filter(d => d.status === 'paid').length} kỳ chi trả thành công</span>
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
            <div className="alw-kpi-value">{formatVND(pendingAllowance || metrics.netTotal)}</div>
            <span className="alw-kpi-sub">
              {metrics.bonusAmount > 0
                ? `Ăn trưa: ${formatVND(metrics.lunchAllowance)} · Thưởng KPI: +${formatVND(metrics.bonusAmount)}`
                : `Ăn trưa: ${formatVND(metrics.lunchAllowance)} · Dự kiến chi 05/11/2026`}
            </span>
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
            <span className="alw-kpi-sub">Tháng 10: {metrics.actualWorkDays}/{metrics.standardWorkDays} ngày ({metrics.attendanceRate}%)</span>
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
            <div className="alw-kpi-value-bank alw-bank-account-no">
              {profile?.bank_account || user?.bank_account || '001203019123'}
            </div>
            <span className="alw-kpi-bank-name">
              {profile?.bank_name || user?.bank_name || 'MB Bank'}
            </span>
            <span className="alw-kpi-sub">{user?.role === 'intern' ? (user?.full_name || 'TTS') : 'TTS'} • Đã xác thực</span>
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
                    <td className="text-right">
                      <div className="alw-net-amount">{formatVND(item.netTotal)}</div>
                    </td>
                    <td>
                      <div className="alw-date-text">{item.paymentDate}</div>
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
        {!isLoading && filteredData.length > 0 && totalPages > 1 && (
          <div className="alw-pagination">
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
                <span className="alw-slip-org-badge">ICTU ENTERPRISE HUB • BAN ĐÀO TẠO & DOANH NGHIỆP</span>
                <h3>PHIẾU CHI TRẢ PHỤ CẤP THỰC TẬP</h3>
                <p>Kỳ hạch toán: <strong>{selectedSlip.periodLabel}</strong> (Mã phiếu: <strong>{selectedSlip.id}</strong>)</p>
              </div>
              <button
                type="button"
                className="idp-modal-close"
                onClick={() => setSelectedSlip(null)}
              >
                ✕
              </button>
            </div>

            <div className="alw-slip-body" ref={slipBodyRef}>
              {/* Intern Information Box */}
              <div className="alw-slip-intern-box">
                <div className="alw-slip-info-col">
                  <div><strong>Họ và tên:</strong> {user?.role === 'intern' ? (user?.full_name || 'TTS') : 'TTS'}</div>
                  <div><strong>Mã thực tập sinh:</strong> {user?.role === 'intern' ? (user?.code || 'TTS0001') : 'TTS0001'}</div>
                  <div><strong>Vị trí:</strong> Thực tập sinh Fullstack / React-FastAPI</div>
                </div>
                <div className="alw-slip-info-col">
                  <div><strong>Mentor phụ trách:</strong> Mentor</div>
                  <div><strong>Phòng ban:</strong> Ban Đào tạo & Dự án Doanh nghiệp</div>
                  <div>
                    <strong>Trạng thái:</strong>{' '}
                    <span className={`alw-status-badge badge-${selectedSlip.status}`}>
                      <span className={`badge-dot dot-${selectedSlip.status}`} />
                      {selectedSlip.statusLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="alw-slip-breakdown">
                <div className="alw-slip-breakdown-head">
                  <div>
                    <h4>Chi tiết các khoản thu nhập & phụ cấp</h4>
                    <p className="alw-slip-breakdown-sub">
                      Bảng kê chi tiết tiền lương, phụ cấp định mức và các khoản thưởng trong kỳ
                    </p>
                  </div>
                  <span className="alw-slip-unit-badge">Đơn vị: VNĐ</span>
                </div>

                <div className="alw-slip-table-container">
                  <table className="alw-slip-detail-table">
                    <thead>
                      <tr>
                        <th>Khoản mục chi trả</th>
                        <th className="text-center">Số lượng / Định mức</th>
                        <th className="text-right">Đơn giá</th>
                        <th className="text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 1. Lương / Phụ cấp cơ bản */}
                      <tr>
                        <td>
                          <div className="alw-calc-title">
                            <span className="alw-item-idx">1</span>
                            <div>
                              <strong>Lương / Phụ cấp thực tập cơ bản</strong>
                              <span className="alw-item-desc">Mức phụ cấp theo thỏa thuận tiếp nhận thực tập</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="alw-calc-badge">
                            {selectedSlip.actualWorkDays} / {selectedSlip.standardWorkDays} ngày
                          </span>
                          <span className="alw-sub-rate">
                            (Hệ số: {Math.round(((selectedSlip.actualWorkDays || 22) / (selectedSlip.standardWorkDays || 22)) * 100)}%)
                          </span>
                        </td>
                        <td className="text-right text-muted">
                          {formatVND(selectedSlip.baseAllowance)}/tháng
                        </td>
                        <td className="text-right font-bold alw-cell-amount">
                          {formatVND(selectedSlip.baseAllowance)}
                        </td>
                      </tr>

                      {/* 2. Trợ cấp ăn trưa */}
                      <tr>
                        <td>
                          <div className="alw-calc-title">
                            <span className="alw-item-idx">2</span>
                            <div>
                              <strong>Trợ cấp tiền ăn trưa & đi lại</strong>
                              <span className="alw-item-desc">Hỗ trợ ăn trưa & xăng xe theo ngày làm việc thực tế</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="alw-calc-badge">{selectedSlip.actualWorkDays} ngày công</span>
                        </td>
                        <td className="text-right text-muted">
                          30.000 ₫/ngày
                        </td>
                        <td className="text-right font-bold alw-cell-amount">
                          {formatVND(selectedSlip.lunchAllowance)}
                        </td>
                      </tr>

                      {/* 3. Thưởng */}
                      <tr className={selectedSlip.bonusAmount > 0 ? 'alw-row-bonus' : ''}>
                        <td>
                          <div className="alw-calc-title">
                            <span className="alw-item-idx">3</span>
                            <div>
                              <strong>Thưởng hiệu quả công việc & KPI</strong>
                              <span className="alw-item-desc">
                                {cleanVietnamese(selectedSlip.bonusReason, 'Thưởng hoàn thành xuất sắc nhiệm vụ Sprint & chuyên cần 100%')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          {selectedSlip.bonusAmount > 0 ? (
                            <span className="alw-calc-badge">Đạt KPI A</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-right text-muted">
                          {selectedSlip.bonusAmount > 0 ? 'Theo KPI' : '—'}
                        </td>
                        <td className="text-right font-bold alw-cell-amount">
                          {selectedSlip.bonusAmount > 0 ? `+${formatVND(selectedSlip.bonusAmount)}` : '0 ₫'}
                        </td>
                      </tr>

                      {/* 4. Phụ cấp khác */}
                      <tr>
                        <td>
                          <div className="alw-calc-title">
                            <span className="alw-item-idx">4</span>
                            <div>
                              <strong>Phụ cấp gửi xe & hỗ trợ thiết bị</strong>
                              <span className="alw-item-desc">Hỗ trợ vé xe tòa nhà & cấp phát công cụ máy trạm</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="alw-calc-badge">Toàn kỳ</span>
                        </td>
                        <td className="text-right text-muted">
                          Miễn phí 100%
                        </td>
                        <td className="text-right font-bold alw-cell-amount">
                          {formatVND(selectedSlip.otherAllowance || 0)}
                        </td>
                      </tr>

                      {/* 5. Giảm trừ */}
                      <tr className={selectedSlip.deductionAmount > 0 ? 'alw-row-deduct' : ''}>
                        <td>
                          <div className="alw-calc-title">
                            <span className="alw-item-idx">5</span>
                            <div>
                              <strong>Các khoản khấu trừ / Giảm trừ</strong>
                              <span className="alw-item-desc">
                                {selectedSlip.deductionReason || (selectedSlip.deductionAmount > 0 ? 'Khấu trừ vi phạm nội quy' : 'Không có vi phạm / Không có khoản trừ')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          {selectedSlip.lateDays ? (
                            <span className="alw-calc-badge">{selectedSlip.lateDays} ngày muộn</span>
                          ) : (
                            <span className="text-muted">0 vi phạm</span>
                          )}
                        </td>
                        <td className="text-right text-muted">
                          {selectedSlip.deductionAmount > 0 ? 'Theo quy chế' : '—'}
                        </td>
                        <td className="text-right font-bold text-danger alw-cell-amount">
                          {selectedSlip.deductionAmount > 0 ? `-${formatVND(selectedSlip.deductionAmount)}` : '0 ₫'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Total Box */}
                <div className="alw-slip-net-box">
                  <div className="alw-net-formula-text">
                    Công thức: (Lương cơ bản + Trợ cấp ăn trưa + Thưởng + Phụ cấp khác) - Các khoản giảm trừ
                  </div>
                  <div className="alw-slip-total-row">
                    <div className="alw-slip-total-label-wrap">
                      <span className="alw-slip-total-title">TỔNG CỘNG THỰC LĨNH (NET):</span>
                      <span className="alw-slip-total-words">
                        (Bằng chữ: <em>{numberToVietnameseWords(selectedSlip.netTotal)}</em>)
                      </span>
                    </div>
                    <span className="alw-slip-total-amount">{formatVND(selectedSlip.netTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="alw-slip-bank-info">
                <div className="alw-bank-info-line">
                  <strong>Tài khoản chuyển khoản:</strong> {profile?.bank_name || user?.bank_name || 'MB Bank'} • {profile?.bank_account || user?.bank_account || '001203019123'} • {user?.full_name || 'TTS'}
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
                  <span className="alw-sig-name">Hr</span>
                  <span className="alw-sig-role">Ban Nhân sự & Đào tạo</span>
                </div>
                <div className="alw-sig-box">
                  <span className="alw-sig-title">Kế toán trưởng duyệt</span>
                  <div className="alw-sig-space digital-stamp">ĐÃ KÝ ĐIỆN TỬ</div>
                  <span className="alw-sig-name">Kế toán</span>
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
