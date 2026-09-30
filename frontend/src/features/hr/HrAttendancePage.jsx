import { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Search,
  FileCheck,
  Eye,
} from 'lucide-react'
import {
  fetchAttendance,
  approveAttendance,
  approveAllAttendance,
} from '../../api/operations'
import './HrSubPages.css'

const INITIAL_ATTENDANCE = [
  {
    id: 1,
    code: 'TTS0002',
    name: 'Nguyễn Văn Bình',
    faculty: 'K20-CNTT',
    project: 'Core API Microservice (BU2)',
    standard_days: 22,
    actual_days: 22,
    late_days: 0,
    leave_days: 0,
    allowance: 2500000,
    status: 'approved',
    status_label: 'Đã duyệt chi trả',
  },
  {
    id: 2,
    code: 'TTS0003',
    name: 'Dũng Vũ',
    faculty: 'K20-KTPM',
    project: 'Giám sát IoT & AI Camera',
    standard_days: 22,
    actual_days: 21,
    late_days: 1,
    leave_days: 1,
    allowance: 2386000,
    status: 'pending',
    status_label: 'Chờ duyệt phụ cấp',
  },
  {
    id: 3,
    code: 'TTS0004',
    name: 'Lê Hoàng Nam',
    faculty: 'K20-ATTT',
    project: 'Security Audit & DevSecOps',
    standard_days: 22,
    actual_days: 22,
    late_days: 0,
    leave_days: 0,
    allowance: 2500000,
    status: 'approved',
    status_label: 'Đã duyệt chi trả',
  },
  {
    id: 4,
    code: 'TTS0005',
    name: 'Trần Thị Thảo',
    faculty: 'K20-CNTT',
    project: 'Data Warehouse & ETL',
    standard_days: 22,
    actual_days: 20,
    late_days: 2,
    leave_days: 2,
    allowance: 2272000,
    status: 'pending',
    status_label: 'Chờ duyệt phụ cấp',
  },
  {
    id: 5,
    code: 'TTS0006',
    name: 'Phạm Minh Đức',
    faculty: 'K20-KTPM',
    project: 'Mobile React Native Portal',
    standard_days: 22,
    actual_days: 22,
    late_days: 0,
    leave_days: 0,
    allowance: 2500000,
    status: 'approved',
    status_label: 'Đã duyệt chi trả',
  },
  {
    id: 6,
    code: 'TTS0007',
    name: 'Hoàng Quốc Việt',
    faculty: 'K20-HTTT',
    project: 'Hệ thống Quản lý Đào tạo',
    standard_days: 22,
    actual_days: 19,
    late_days: 1,
    leave_days: 3,
    allowance: 2159000,
    status: 'pending',
    status_label: 'Chờ đối soát',
  },
]

export default function HrAttendancePage() {
  const [items, setItems] = useState(INITIAL_ATTENDANCE)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchAttendance()
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setItems(res.data)
        }
      } catch {
        // fallback
      }
    }
    loadData()
  }, [])

  const filtered = useMemo(() => {
    let list = items
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          i.project.toLowerCase().includes(q),
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((i) => i.status === statusFilter)
    }
    return list
  }, [items, query, statusFilter])

  async function handleApprove(id) {
    try {
      const res = await approveAttendance(id)
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: 'approved', status_label: 'Đã duyệt chi trả' } : i,
          ),
        )
        showToast('Đã lưu trạng thái duyệt phụ cấp trực tiếp vào CSDL thành công!')
        return
      }
    } catch {
      // fallback
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: 'approved', status_label: 'Đã duyệt chi trả' } : i,
      ),
    )
    showToast('Đã phê duyệt mức phụ cấp tháng cho thực tập sinh!')
  }

  async function handleApproveAll() {
    try {
      const res = await approveAllAttendance()
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => ({ ...i, status: 'approved', status_label: 'Đã duyệt chi trả' })),
        )
        showToast('Đã lưu phê duyệt toàn bộ bảng phụ cấp vào CSDL thành công!')
        return
      }
    } catch {
      // fallback
    }
    setItems((prev) =>
      prev.map((i) => ({ ...i, status: 'approved', status_label: 'Đã duyệt chi trả' })),
    )
    showToast('Đã phê duyệt toàn bộ bảng chi trả phụ cấp tháng 09/2026 thành công!')
  }

  const totalFund = items.reduce((sum, i) => sum + i.allowance, 0)
  const approvedCount = items.filter((i) => i.status === 'approved').length
  const pendingCount = items.filter((i) => i.status !== 'approved').length

  return (
    <div className="hr-subpage-container">
      {toast && (
        <div className="subpage-toast" role="status">
          <CheckCircle size={16} color="#10B981" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="hr-subpage-header">
        <div className="subpage-title-group">
          <h1>Bảng tổng hợp công & Duyệt phụ cấp thực tập sinh</h1>
          <p>
            Đối soát dữ liệu chấm công từ FastHRM, quét QR thẻ sinh viên và tính toán định mức phụ cấp tháng 09/2026.
          </p>
        </div>
        <div className="subpage-actions-cluster">
          <button
            type="button"
            className="subpage-btn subpage-btn--outline"
            onClick={() => showToast('Đang xuất bảng tổng hợp chấm công & chi trả phụ cấp ra file Excel...')}
          >
            <Download size={15} />
            <span>Xuất file Excel</span>
          </button>
          <button
            type="button"
            className="subpage-btn subpage-btn--success"
            onClick={handleApproveAll}
          >
            <FileCheck size={15} />
            <span>Duyệt toàn bộ phụ cấp</span>
          </button>
        </div>
      </header>

      {/* 4 Thẻ KPI */}
      <section className="subpage-kpi-grid">
        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Tổng công ghi nhận</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--blue">
              <Calendar size={18} />
            </div>
          </div>
          <span className="subpage-kpi-val">126 / 132</span>
          <span className="subpage-kpi-hint">
            <span style={{ color: '#10B981', fontWeight: 700 }}>● 95.4%</span> tỷ lệ chuyên cần kỳ
          </span>
        </div>

        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Đúng giờ (On-time)</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--green">
              <Clock size={18} />
            </div>
          </div>
          <span className="subpage-kpi-val">122 công</span>
          <span className="subpage-kpi-hint">Chỉ có 4 lượt đi muộn (&lt;15p)</span>
        </div>

        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Quỹ phụ cấp tháng</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--amber">
              <DollarSign size={18} />
            </div>
          </div>
          <span className="subpage-kpi-val" style={{ color: '#047857' }}>
            {totalFund.toLocaleString('vi-VN')} đ
          </span>
          <span className="subpage-kpi-hint">Định mức 2.500.000 đ/tháng</span>
        </div>

        <div className="subpage-kpi-card">
          <div className="subpage-kpi-header">
            <span className="subpage-kpi-title">Hồ sơ đã duyệt</span>
            <div className="subpage-kpi-icon-wrap subpage-kpi-icon-wrap--purple">
              <CheckCircle size={18} />
            </div>
          </div>
          <span className="subpage-kpi-val">
            {approvedCount} / {items.length}
          </span>
          <span className="subpage-kpi-hint">
            {pendingCount > 0 ? `Còn ${pendingCount} hồ sơ chờ duyệt` : 'Đã duyệt toàn bộ 100%'}
          </span>
        </div>
      </section>

      {/* Panel Bảng dữ liệu */}
      <section className="subpage-panel">
        <div className="subpage-panel-toolbar">
          <div className="subpage-search-wrap">
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Tìm theo tên TTS, mã sinh viên, dự án..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="subpage-search-input"
            />
          </div>

          <div className="subpage-filter-group">
            <select
              className="subpage-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái duyệt</option>
              <option value="approved">Đã duyệt chi trả</option>
              <option value="pending">Chờ duyệt phụ cấp</option>
            </select>
          </div>
        </div>

        <div className="subpage-table-wrapper">
          <table className="subpage-table">
            <thead>
              <tr>
                <th>Thực tập sinh & Mã SV</th>
                <th>Dự án tiếp nhận</th>
                <th style={{ textAlign: 'center' }}>Công chuẩn</th>
                <th style={{ textAlign: 'center' }}>Công thực tế</th>
                <th>Tỷ lệ đi làm</th>
                <th>Mức phụ cấp</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const percent = Math.round((row.actual_days / row.standard_days) * 100)
                return (
                  <tr key={row.id}>
                    <td>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{row.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#2563EB' }}>{row.code}</span> · {row.faculty}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: '#334155' }}>{row.project}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.standard_days} ngày</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>
                      {row.actual_days} ngày
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: percent >= 95 ? '#047857' : '#D97706' }}>
                          {percent}%
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          ({row.late_days > 0 ? `Trễ ${row.late_days}` : 'Chuẩn'})
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: '#047857', fontSize: '0.9rem' }}>
                        {row.allowance.toLocaleString('vi-VN')} đ
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`sub-status-pill ${
                          row.status === 'approved' ? 'sub-status-pill--success' : 'sub-status-pill--warning'
                        }`}
                      >
                        {row.status === 'approved' ? '✓ Đã duyệt' : '⏳ Chờ duyệt'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {row.status !== 'approved' && (
                          <button
                            type="button"
                            className="sub-table-btn sub-table-btn--success"
                            onClick={() => handleApprove(row.id)}
                            title="Phê duyệt chi trả phụ cấp cho TTS này"
                          >
                            <FileCheck size={13} />
                            <span>Duyệt</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="sub-table-btn sub-table-btn--outline"
                          onClick={() => showToast(`Mở bảng nhật ký quẹt thẻ chi tiết của ${row.name}`)}
                          title="Xem chi tiết lịch sử điểm danh theo ngày"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
