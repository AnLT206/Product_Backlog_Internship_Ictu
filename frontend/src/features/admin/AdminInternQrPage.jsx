import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  QrCode,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Eye,
  RefreshCw,
  Users,
  Cpu,
  Layers,
  X,
} from 'lucide-react'
import {
  fetchInternQrList,
  generateInternQr,
  batchGenerateInternQr,
} from './adminInternQrMock'
import { getSavedAvatar } from '../../utils/avatarHelper'
import InternQrViewModal from './components/InternQrViewModal'
import InternQrCard from './components/InternQrCard'
import './AdminPage.css'
import './AdminInternQrPage.css'

function getUserInitials(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'TTS'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AdminInternQrPage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    grand_total: 0,
    has_qr_count: 0,
    no_qr_count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'has_qr' | 'no_qr'
  const [deptFilter, setDeptFilter] = useState('all')

  // Chọn dòng (Batch selection)
  const [selectedIds, setSelectedIds] = useState([])
  const [creatingId, setCreatingId] = useState(null)
  const [isBatchCreating, setIsBatchCreating] = useState(false)

  // Modals
  const [activeModalIntern, setActiveModalIntern] = useState(null)
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false)

  // Toast
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3200)
  }

  // Tải danh sách từ tầng Mock Service (sau này là API)
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchInternQrList({
        query: searchQuery,
        status: statusFilter,
        department: deptFilter,
      })
      if (res.ok) {
        setItems(res.data.items)
        setTotal(res.data.total)
        setStats({
          grand_total: res.data.grand_total,
          has_qr_count: res.data.has_qr_count,
          no_qr_count: res.data.no_qr_count,
        })
      } else {
        setError('Không tải được danh sách mã QR thực tập sinh.')
      }
    } catch {
      setError('Đã xảy ra lỗi khi kết nối dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, deptFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Lắng nghe sự kiện cập nhật dữ liệu nội bộ
  useEffect(() => {
    function handleSync() {
      loadData()
    }
    window.addEventListener('admin_intern_qr_updated', handleSync)
    return () => window.removeEventListener('admin_intern_qr_updated', handleSync)
  }, [loadData])

  // Danh sách các phòng ban duy nhất để hiển thị dropdown lọc
  const departmentOptions = useMemo(() => {
    const set = new Set()
    items.forEach((item) => {
      if (item.department) set.add(item.department)
    })
    return Array.from(set)
  }, [items])

  // Checkbox: Chọn tất cả / Bỏ chọn tất cả
  const isAllSelected = items.length > 0 && selectedIds.length === items.length
  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((i) => i.id))
    }
  }

  function toggleSelectRow(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // ── Xử lý: Tạo mã QR cho 1 thực tập sinh ──
  async function handleCreateQr(intern) {
    setCreatingId(intern.id)
    try {
      const res = await generateInternQr(intern.id)
      if (res.ok) {
        showToast(`Đã tạo mã QR thành công cho ${intern.full_name} (${intern.code})!`)
        await loadData()
      } else {
        showToast(res.data?.detail || 'Không thể tạo mã QR.', 'error')
      }
    } catch {
      showToast('Đã xảy ra lỗi khi tạo mã QR.', 'error')
    } finally {
      setCreatingId(null)
    }
  }

  // ── Xử lý: Tạo mã QR hàng loạt cho các TTS đã chọn ──
  async function handleBatchCreateQr() {
    if (selectedIds.length === 0) return
    setIsBatchCreating(true)
    try {
      const res = await batchGenerateInternQr(selectedIds)
      if (res.ok) {
        const count = res.data.updated_count
        showToast(
          count > 0
            ? `Đã tạo mã QR thành công cho ${count} thực tập sinh được chọn!`
            : 'Các thực tập sinh được chọn đều đã có mã QR.',
          'success'
        )
        setSelectedIds([])
        await loadData()
      } else {
        showToast('Không thể tạo mã QR hàng loạt.', 'error')
      }
    } catch {
      showToast('Đã xảy ra lỗi khi tạo mã QR hàng loạt.', 'error')
    } finally {
      setIsBatchCreating(false)
    }
  }

  // ── Xử lý: In nhanh mã QR 1 TTS ──
  function handleQuickPrint(intern) {
    setActiveModalIntern(intern)
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print()
      }
    }, 200)
  }

  // ── Lấy danh sách TTS để in hàng loạt ──
  const batchPrintList = useMemo(() => {
    if (selectedIds.length > 0) {
      return items.filter((i) => selectedIds.includes(i.id) && i.has_qr)
    }
    return items.filter((i) => i.has_qr)
  }, [items, selectedIds])

  return (
    <div className="admin-page admin-qr-page">
      {/* ── Thông báo Toast ── */}
      {toast && (
        <div
          className={`admin-toast admin-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      {/* ── Header trang ── */}
      <header className="admin-page__head admin-page__head--row">
        <div>
          <nav className="admin-page__crumb" aria-label="Breadcrumb">
            <Link to="/admin/dashboard">Admin Console</Link>
            <span aria-hidden="true">/</span>
            <span>Mã QR Chấm công Thực tập sinh</span>
          </nav>
          <h1>Mã QR Chấm công Thực tập sinh</h1>
          <p>
            Tạo, quản lý và in mã QR định danh cá nhân cho từng thực tập sinh để sử dụng
            khi quét thẻ tại cửa và đầu đọc máy chấm công IoT.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn--outline"
            onClick={() => setBatchPrintModalOpen(true)}
            data-testid="batch-print-btn"
          >
            <Printer size={15} />
            <span>In thẻ QR hàng loạt</span>
          </button>
        </div>
      </header>

      {/* ── 4 Thẻ KPI Tổng hợp ── */}
      <section className="admin-qr-kpi-grid" aria-label="Thống kê mã QR">
        <div className="admin-qr-kpi-card">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--blue">
            <Users size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">{stats.grand_total}</span>
            <span className="admin-qr-kpi-label">Tổng số thực tập sinh</span>
          </div>
        </div>

        <div className="admin-qr-kpi-card">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--green">
            <CheckCircle2 size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">{stats.has_qr_count}</span>
            <span className="admin-qr-kpi-label">Đã có mã QR (Hoạt động)</span>
          </div>
        </div>

        <div className="admin-qr-kpi-card">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--amber">
            <AlertCircle size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">{stats.no_qr_count}</span>
            <span className="admin-qr-kpi-label">Chưa có mã QR</span>
          </div>
        </div>

        <div className="admin-qr-kpi-card">
          <div className="admin-qr-kpi-icon admin-qr-kpi-icon--purple">
            <Cpu size={22} />
          </div>
          <div className="admin-qr-kpi-info">
            <span className="admin-qr-kpi-value">2 Cổng IoT</span>
            <span className="admin-qr-kpi-label">Lab 302 & Tòa C1 (Online)</span>
          </div>
        </div>
      </section>

      {/* ── Thanh công cụ & Bộ lọc (Search / Filter) ── */}
      <section className="admin-qr-toolbar" aria-label="Bộ lọc thực tập sinh">
        <div className="admin-qr-toolbar__filters">
          <div className="admin-qr-search-box">
            <Search size={16} className="admin-qr-search-icon" />
            <input
              type="search"
              className="admin-qr-search-input"
              placeholder="Tìm theo họ tên, mã TTS, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm thực tập sinh"
            />
          </div>

          <div className="admin-qr-status-pills" role="tablist" aria-label="Lọc trạng thái QR">
            <button
              type="button"
              className={`admin-qr-pill-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('all')}
              role="tab"
              aria-selected={statusFilter === 'all'}
            >
              Tất cả ({stats.grand_total})
            </button>
            <button
              type="button"
              className={`admin-qr-pill-btn ${statusFilter === 'has_qr' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('has_qr')}
              role="tab"
              aria-selected={statusFilter === 'has_qr'}
            >
              Đã có QR ({stats.has_qr_count})
            </button>
            <button
              type="button"
              className={`admin-qr-pill-btn ${statusFilter === 'no_qr' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('no_qr')}
              role="tab"
              aria-selected={statusFilter === 'no_qr'}
            >
              Chưa có QR ({stats.no_qr_count})
            </button>
          </div>

          {departmentOptions.length > 0 && (
            <select
              className="admin-qr-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Lọc theo phòng ban"
            >
              <option value="all">Tất cả phòng ban / bộ phận</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-btn--sm"
            onClick={loadData}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} />
            <span>Làm mới</span>
          </button>
        </div>

        <p className="admin-page__meta">
          {loading
            ? 'Đang tải…'
            : `Hiển thị ${items.length} / ${total} thực tập sinh`}
        </p>
      </section>

      {/* ── Thanh thao tác nhanh khi chọn nhiều TTS ── */}
      {selectedIds.length > 0 && (
        <section className="admin-qr-selection-bar" aria-label="Thao tác hàng loạt">
          <span>
            Đã chọn <strong>{selectedIds.length}</strong> thực tập sinh
          </span>
          <div className="selection-bar-actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--sm"
              onClick={handleBatchCreateQr}
              disabled={isBatchCreating}
            >
              <PlusCircle size={14} />
              <span>{isBatchCreating ? 'Đang tạo…' : 'Tạo QR cho mục đã chọn'}</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--outline admin-btn--sm"
              onClick={() => setBatchPrintModalOpen(true)}
            >
              <Printer size={14} />
              <span>In thẻ các mục đã chọn</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn
            </button>
          </div>
        </section>
      )}

      {/* ── Bảng danh sách thực tập sinh & Mã QR ── */}
      <section className="admin-qr-table-card">
        {error && <p className="admin-page__error">{error}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả thực tập sinh"
                  />
                </th>
                <th>Mã TTS</th>
                <th>Thực tập sinh</th>
                <th>Email</th>
                <th>Bộ phận / Phòng ban</th>
                <th>Trạng thái mã QR</th>
                <th>Chuỗi định danh QR</th>
                <th className="admin-table__actions-col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--admin-muted)' }}>
                      <RefreshCw size={16} className="stream-icon-pulse" />
                      <span>Đang tải danh sách thực tập sinh & trạng thái QR...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && !error && (
                <tr>
                  <td colSpan={8}>
                    <div className="admin-empty">
                      <strong>Không tìm thấy thực tập sinh</strong>
                      <span>
                        {searchQuery.trim() || statusFilter !== 'all' || deptFilter !== 'all'
                          ? 'Không có kết quả phù hợp với bộ lọc hiện tại. Hãy thử tìm kiếm bằng từ khóa khác.'
                          : 'Hiện chưa có thực tập sinh nào trong hệ thống.'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((intern) => {
                  const isChecked = selectedIds.includes(intern.id)
                  const resolvedAvatar =
                    getSavedAvatar(intern.email, intern.id, intern.full_name) || intern.avatar

                  return (
                    <tr
                      key={intern.id}
                      className={isChecked ? 'is-selected-row' : ''}
                      data-testid={`intern-row-${intern.code}`}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(intern.id)}
                          aria-label={`Chọn ${intern.full_name}`}
                        />
                      </td>

                      <td>
                        <strong className="admin-user-code">{intern.code}</strong>
                      </td>

                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar-thumb">
                            {resolvedAvatar ? (
                              <img
                                src={resolvedAvatar}
                                alt={intern.full_name || ''}
                                className="admin-avatar-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display = 'flex'
                                  }
                                }}
                              />
                            ) : null}
                            <span
                              className="admin-avatar-initials"
                              style={{ display: resolvedAvatar ? 'none' : 'flex' }}
                            >
                              {getUserInitials(intern.full_name)}
                            </span>
                          </div>
                          <div className="admin-user-info">
                            <span className="admin-user-name">{intern.full_name}</span>
                          </div>
                        </div>
                      </td>

                      <td>{intern.email}</td>

                      <td>
                        <div>
                          <strong>{intern.department || 'Phát triển Phần mềm'}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--admin-muted)' }}>
                            {intern.major || 'Công nghệ thông tin'}
                          </div>
                        </div>
                      </td>

                      <td>
                        {intern.has_qr ? (
                          <span
                            className="admin-qr-badge admin-qr-badge--success"
                            data-testid={`badge-has-qr-${intern.code}`}
                          >
                            <CheckCircle2 size={13} />
                            <span>Đã có mã QR</span>
                          </span>
                        ) : (
                          <span
                            className="admin-qr-badge admin-qr-badge--warning"
                            data-testid={`badge-no-qr-${intern.code}`}
                          >
                            <AlertCircle size={13} />
                            <span>Chưa có mã QR</span>
                          </span>
                        )}
                      </td>

                      <td>
                        {intern.has_qr && intern.qr_code ? (
                          <code className="admin-qr-code-text">{intern.qr_code}</code>
                        ) : (
                          <span style={{ color: 'var(--admin-muted)' }}>—</span>
                        )}
                      </td>

                      <td className="admin-table__actions-col">
                        <div className="admin-qr-actions-cell">
                          {intern.has_qr ? (
                            <>
                              <button
                                type="button"
                                className="admin-btn admin-btn--outline admin-btn--sm"
                                onClick={() => setActiveModalIntern(intern)}
                                title="Xem mã QR và thông tin thẻ"
                                data-testid={`view-qr-btn-${intern.code}`}
                              >
                                <Eye size={13} />
                                <span>Xem QR</span>
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={() => handleQuickPrint(intern)}
                                title="In mã QR này"
                                data-testid={`print-qr-btn-${intern.code}`}
                              >
                                <Printer size={13} />
                                <span>In</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn--primary admin-btn--sm"
                              onClick={() => handleCreateQr(intern)}
                              disabled={creatingId === intern.id}
                              data-testid={`create-qr-btn-${intern.code}`}
                            >
                              <PlusCircle size={13} />
                              <span>
                                {creatingId === intern.id ? 'Đang tạo…' : 'Tạo mã QR'}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── MODAL XEM CHI TIẾT VÀ IN MÃ QR CÁ NHÂN ── */}
      {activeModalIntern && (
        <InternQrViewModal
          intern={activeModalIntern}
          isOpen={Boolean(activeModalIntern)}
          onClose={() => setActiveModalIntern(null)}
          onPrint={() => {
            if (typeof window !== 'undefined' && typeof window.print === 'function') {
              window.print()
            }
          }}
        />
      )}

      {/* ── MODAL IN THẺ QR HÀNG LOẠT ── */}
      {batchPrintModalOpen && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-print-modal-title"
        >
          <button
            type="button"
            className="admin-modal-backdrop"
            aria-label="Đóng"
            onClick={() => setBatchPrintModalOpen(false)}
          />
          <div className="admin-modal-card batch-print-modal">
            <div className="admin-modal-head">
              <div>
                <h2 id="batch-print-modal-title" style={{ fontSize: '1.1rem', fontWeight: 750 }}>
                  In Thẻ QR Điểm danh Hàng loạt
                </h2>
                <p className="admin-modal-subtitle">
                  Kết xuất danh sách {batchPrintList.length} thẻ thực tập sinh theo chuẩn thẻ đeo PVC.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setBatchPrintModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              {batchPrintList.length === 0 ? (
                <div className="admin-empty">
                  <strong>Chưa có thẻ sẵn sàng để in</strong>
                  <span>
                    Chưa có thực tập sinh nào trong danh mục đã được cấp mã QR. Vui lòng bấm
                    &quot;Tạo mã QR&quot; trước khi in.
                  </span>
                </div>
              ) : (
                <div className="batch-print-preview-list">
                  <div className="printable-batch-area">
                    {batchPrintList.map((intern) => (
                      <div key={intern.id} className="printable-batch-card-item">
                        <InternQrCard intern={intern} size={200} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-foot">
              <span className="intern-qr-modal__footer-tip">
                Mỗi thẻ sinh viên sẽ được in trên 1 trang riêng biệt.
              </span>
              <div className="admin-modal-foot-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setBatchPrintModalOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  disabled={batchPrintList.length === 0}
                  onClick={() => {
                    if (typeof window !== 'undefined' && typeof window.print === 'function') {
                      window.print()
                    }
                  }}
                  data-testid="start-batch-print-btn"
                >
                  <Printer size={15} />
                  <span>Bắt đầu in ({batchPrintList.length} thẻ)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
