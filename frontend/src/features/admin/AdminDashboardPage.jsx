import { useState, useMemo } from 'react'
import {
  Users,
  ShieldCheck,
  Database,
  Search,
  CheckCircle2,
  UserPlus,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  Check,
  Minus,
  QrCode,
  ScanLine,
  ArrowRightLeft,
  Radio,
  Cpu,
  Printer,
  Layout,
  Network,
  Lock,
  FileText,
  TrendingUp,
  Gauge,
  Info,
  Clock,
  Key,
} from 'lucide-react'
import './AdminDashboardPage.css'

const RBAC_ROLES = [
  {
    role: 'Admin (ROOT)',
    desc: 'Toàn hệ thống All Domains & Security Infrastructure',
    read: true,
    create: true,
    update: true,
    approve: true,
    delete: true,
  },
  {
    role: 'HR Manager',
    desc: 'Hồ sơ tuyển dụng, Chấm công & Phê duyệt tiếp nhận',
    read: true,
    create: true,
    update: true,
    approve: true,
    delete: false,
  },
  {
    role: 'Mentor',
    desc: 'Nhiệm vụ Sprint, Đánh giá sinh viên gắn kèm & Code Review',
    read: true,
    create: true,
    update: true,
    approve: true,
    delete: false,
  },
  {
    role: 'Intern TTS',
    desc: 'Dữ liệu cá nhân, Báo cáo tuần & Chấm công riêng',
    read: true,
    create: true,
    update: true,
    approve: false,
    delete: false,
  },
]

const AUDIT_LOGS_DATA = [
  {
    id: 1,
    time: '11:15:42 (25/08)',
    actor: 'admin@ictu.edu.vn',
    ip: '10.20.1.1',
    network: 'Internal Admin VLAN',
    method: 'POST',
    endpoint: '/api/v2/rbac/roles/assign',
    description: 'Admin cấp quyền Mentor cho Nguyễn Văn Bình (K20-Khoa CNTT)',
    status: 200,
    statusText: '200 OK',
  },
  {
    id: 2,
    time: '10:48:19 (25/08)',
    actor: 'hr_director@ictu.edu.vn',
    ip: '192.168.10.45',
    network: 'HR Subnet',
    method: 'GET',
    endpoint: '/api/v2/finance/intern-stipend/export',
    description: 'HR xuất bảng phụ cấp thực tập sinh tháng 08/2026 (.xlsx)',
    status: 200,
    statusText: '200 OK',
  },
  {
    id: 3,
    time: '09:32:04 (25/08)',
    actor: 'intern.k20@ictu.edu.vn',
    ip: '14.162.24.112',
    network: 'Viettel Mobile',
    method: 'PUT',
    endpoint: '/api/v2/auth/totp/verify-activate',
    description: 'TTS kích hoạt xác thực 2FA thành công qua Google Authenticator',
    status: 200,
    statusText: '200 OK',
  },
  {
    id: 4,
    time: '08:05:11 (25/08)',
    actor: 'gateway.daemon@ictu.edu.vn',
    ip: '127.0.0.1',
    network: 'Loopback API Gateway',
    method: 'POST',
    endpoint: '/api/v2/auth/jwt/refresh-token',
    description: 'Token refresh định kỳ: Gia hạn 14 phiên làm việc hợp lệ',
    status: 200,
    statusText: '200 OK',
  },
]

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'hrm' | 'rbac' | 'logs'
  const [isSyncingHRM, setIsSyncingHRM] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [httpStatusFilter, setHttpStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)

  // Dialogs
  const [newUserModal, setNewUserModal] = useState(false)
  const [printQrModal, setPrintQrModal] = useState(false)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSyncHRM() {
    setIsSyncingHRM(true)
    setTimeout(() => {
      setIsSyncingHRM(false)
      showToast('Đồng bộ FastHRM thành công! Đã nạp thêm 48 bản ghi mới vào ICTU Intern Core DB.', 'success')
    }, 1200)
  }

  // Filter logs
  const filteredLogs = useMemo(() => {
    return AUDIT_LOGS_DATA.filter((log) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        log.actor.toLowerCase().includes(q) ||
        log.ip.toLowerCase().includes(q) ||
        log.endpoint.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q)

      const matchesStatus =
        httpStatusFilter === 'all' || String(log.status) === httpStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchQuery, httpStatusFilter])

  return (
    <div className="admin-portal-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`portal-toast portal-toast--${toast.type}`} role="alert">
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. TIÊU ĐỀ TRANG & CỤM NÚT TÁC VỤ CHÍNH (PROMPT 1) ── */}
      <section className="admin-hero-header">
        <div className="admin-hero-content">
          {/* Nhãn phiên bản & Badge xanh mint */}
          <div className="engine-version-row">
            <span className="engine-version-tag">ICTU CORE ENGINE V4.8-LTS</span>
            <span className="sync-bus-badge">
              <span className="sync-bus-dot" />
              Sync Bus Online
            </span>
          </div>

          <h1 className="admin-main-title">Quản trị Hệ thống & Điều phối DevOps</h1>
          <p className="admin-intro-desc">
            Trung tâm quản trị dữ liệu tích hợp HRM bên thứ ba, điều phối cổng chấm công phần cứng IoT/QR, kiểm soát ma trận RBAC đa cấp và kiểm toán nhật ký truy vết bảo mật chuẩn ISO/IEC 27001.
          </p>
        </div>

        {/* 3 nút hành động bên phải: 2 nút trên, 1 nút dưới */}
        <div className="admin-action-cluster-two-rows">
          <div className="admin-action-row-top">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={handleSyncHRM}
              disabled={isSyncingHRM}
            >
              {isSyncingHRM ? (
                <RefreshCw size={15} className="is-spinning" />
              ) : (
                <Zap size={15} fill="currentColor" />
              )}
              <span>{isSyncingHRM ? 'Đang đồng bộ FastHRM...' : 'Đồng bộ HRM ngay'}</span>
            </button>

            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setNewUserModal(true)}
            >
              <UserPlus size={15} />
              <span>+ Tạo tài khoản mới</span>
            </button>
          </div>

          <div className="admin-action-row-bottom">
            <button
              type="button"
              className="admin-btn admin-btn--tertiary"
              onClick={() => setPrintQrModal(true)}
            >
              <QrCode size={15} />
              <span>In thẻ QR hàng loạt</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── THANH TAB NGANG 4 MỤC (PROMPT 1) ── */}
      <nav className="admin-cards-tabs-row" aria-label="Phân hệ Quản trị Admin">
        <button
          type="button"
          className={`admin-card-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layout size={18} className="tab-icon" />
          <span className="tab-label">Tổng quan & Chỉ số nhanh</span>
        </button>

        <button
          type="button"
          className={`admin-card-tab ${activeTab === 'hrm' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('hrm')}
        >
          <Network size={18} className="tab-icon" />
          <span className="tab-label">Tích hợp HRM & Chấm công QR</span>
        </button>

        <button
          type="button"
          className={`admin-card-tab ${activeTab === 'rbac' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('rbac')}
        >
          <Lock size={18} className="tab-icon" />
          <span className="tab-label">Tài khoản & Ma trận RBAC</span>
        </button>

        <button
          type="button"
          className={`admin-card-tab ${activeTab === 'logs' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FileText size={18} className="tab-icon" />
          <span className="tab-label">Nhật ký Truy vết (System Logs)</span>
        </button>
      </nav>

      {/* ── 2. HÀNG 4 THẺ CHỈ SỐ KPI TỔNG QUAN (PROMPT 2) ── */}
      <section className="admin-kpi-grid" aria-label="Thống kê tổng quan hạ tầng">
        {/* Thẻ 1 (HRM Records): Bản ghi HRM liên kết */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Bản ghi HRM liên kết</span>
            <div className="kpi-icon-box kpi-icon-box--blue">
              <Database size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">1,482</span>
          </div>
          <div className="kpi-hint kpi-hint--green">
            <TrendingUp size={14} />
            <span>+48 hồ sơ từ FastHRM (02:00 AM)</span>
          </div>
        </div>

        {/* Thẻ 2 (Attendance): Điểm danh hôm nay (QR/Thẻ) */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Điểm danh hôm nay (QR/Thẻ)</span>
            <div className="kpi-icon-box kpi-icon-box--green">
              <ScanLine size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">894</span>
            <span className="kpi-value-sub">/ 940 TTS</span>
          </div>
          <div className="kpi-hint kpi-hint--slate">
            <span>Tỷ lệ quẹt thẻ đạt 95.1%</span>
          </div>
        </div>

        {/* Thẻ 3 (Accounts): Tài khoản Hoạt động (Active) */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tài khoản Hoạt động (Active)</span>
            <div className="kpi-icon-box kpi-icon-box--purple">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">1,120</span>
          </div>
          <div className="kpi-hint kpi-hint--teal">
            <Check size={14} strokeWidth={2.5} />
            <span>88.4% đã kích hoạt 2FA TOTP</span>
          </div>
        </div>

        {/* Thẻ 4 (API Gateway): Trạng thái API Gateway */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Trạng thái API Gateway</span>
            <div className="kpi-icon-box kpi-icon-box--teal">
              <Gauge size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">24ms</span>
          </div>
          <div className="kpi-hint kpi-hint--green">
            <Check size={14} strokeWidth={2.5} />
            <span>Uptime 99.98% - 0 Rate Limit Hits</span>
          </div>
        </div>
      </section>

      {/* ── 3. KHU VỰC CHI TIẾT 2 CỘT CHÍNH (65% - 35%) (PROMPT 2) ── */}
      {activeTab === 'overview' && (
        <section className="admin-two-cols-grid">
          {/* CỘT TRÁI (65%) - Tuyến Đồng bộ Dữ liệu Tự động (ETL Pipeline) */}
          <div className="admin-col-left">
            <div className="admin-panel etl-pipeline-card">
              <div className="etl-card-header">
                <div>
                  <div className="etl-title-row">
                    <h2 className="etl-main-title">Tuyến Đồng bộ Dữ liệu Tự động (ETL Pipeline)</h2>
                    <span className="live-socket-pill">
                      Live Socket Connected
                    </span>
                  </div>
                  <p className="etl-sub-desc">
                    Đồng bộ hai chiều giữa FastHRM Cloud, Smart IoT Reader và PostgreSQL DB
                  </p>
                </div>
              </div>

              {/* Sơ đồ luồng đồ họa 3 khối ngang */}
              <div className="etl-diagram-container">
                {/* Khối 1: Nguồn - FastHRM ERP */}
                <div className="diagram-node-card">
                  <div className="node-icon-wrap node-icon-wrap--blue">
                    <RefreshCw size={20} />
                  </div>
                  <h4 className="node-name">FastHRM ERP</h4>
                  <span className="node-sub">Webhook v2.4 (TLS 1.3)</span>
                  <span className="node-cron-pill">Cron: 02:00 AM</span>
                </div>

                {/* Khối 2: Trung gian - Kafka Pipeline */}
                <div className="diagram-connector-middle">
                  <span className="kafka-text-top">Kafka Pipeline</span>
                  <div className="kafka-arrows-row">
                    <span className="kafka-line" />
                    <ArrowRightLeft size={16} className="kafka-arrow-icon" />
                    <span className="kafka-line" />
                  </div>
                  <span className="kafka-text-bottom">Transform &amp; Validate</span>
                </div>

                {/* Khối 3: Đích - ICTU Core Intern DB */}
                <div className="diagram-node-card">
                  <div className="node-icon-wrap node-icon-wrap--green">
                    <Database size={20} />
                  </div>
                  <h4 className="node-name">ICTU Core Intern DB</h4>
                  <span className="node-sub">PostgreSQL v16 HA Cluster</span>
                  <span className="node-rbac-pill">Ready for RBAC</span>
                </div>
              </div>

              {/* Dòng trạng thái đối soát */}
              <div className="etl-reconcile-row">
                <span className="reconcile-left">
                  Đợt nạp tự động gần nhất: Hôm nay 02:00:14 ICT
                </span>
                <span className="reconcile-right">
                  Tự động đối soát: <strong>100% Khớp khóa UID</strong>
                </span>
              </div>

              {/* Footer gồm 3 thông số */}
              <div className="etl-bottom-metrics-row">
                <div className="metric-cell">
                  <span className="metric-cell-lbl">Độ trễ trung bình</span>
                  <strong className="metric-cell-val">118ms</strong>
                </div>
                <div className="metric-cell">
                  <span className="metric-cell-lbl">Tỷ lệ bản ghi hợp lệ</span>
                  <strong className="metric-cell-val">99.99%</strong>
                </div>
                <div className="metric-cell">
                  <span className="metric-cell-lbl">Chính sách Retry</span>
                  <strong className="metric-cell-val">Exponential (x3)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (35%) - An ninh & Bảo mật */}
          <div className="admin-col-right">
            <div className="admin-panel security-policies-panel">
              <div className="sec-panel-header">
                <div>
                  <h3 className="sec-panel-title">An ninh & Bảo mật</h3>
                  <span className="sec-panel-sub">Chỉ số tuân thủ chính sách định danh</span>
                </div>
                <ShieldCheck size={22} className="sec-panel-shield" />
              </div>

              {/* Danh sách 4 thẻ chính sách bảo mật */}
              <div className="sec-policies-stack">
                {/* 1. Mật khẩu tạm hết hạn */}
                <div className="policy-box">
                  <div className="policy-box-left">
                    <div className="policy-icon-circle policy-icon-circle--teal">
                      <RefreshCw size={14} />
                    </div>
                    <div>
                      <strong className="policy-title">Mật khẩu tạm hết hạn</strong>
                      <p className="policy-desc">Thời hạn tối đa 72h</p>
                    </div>
                  </div>
                  <span className="policy-status-pill policy-status-pill--green">
                    Đang bật
                  </span>
                </div>

                {/* 2. Chống dội quét QR (< 60s) */}
                <div className="policy-box">
                  <div className="policy-box-left">
                    <div className="policy-icon-circle policy-icon-circle--blue">
                      <QrCode size={14} />
                    </div>
                    <div>
                      <strong className="policy-title">Chống dội quét QR (&lt; 60s)</strong>
                      <p className="policy-desc">Hardware debouncing</p>
                    </div>
                  </div>
                  <span className="policy-status-pill policy-status-pill--mint">
                    Kích hoạt
                  </span>
                </div>

                {/* 3. JWT Revocation List */}
                <div className="policy-box">
                  <div className="policy-box-left">
                    <div className="policy-icon-circle policy-icon-circle--amber">
                      <Key size={14} />
                    </div>
                    <div>
                      <strong className="policy-title">JWT Revocation List</strong>
                      <p className="policy-desc">Redis In-Memory blacklist</p>
                    </div>
                  </div>
                  <span className="policy-status-text">
                    0 active tokens
                  </span>
                </div>

                {/* 4. Kiểm toán tự động chuẩn bị chạy */}
                <div className="policy-box policy-box--alert">
                  <div className="policy-box-left">
                    <div className="policy-icon-circle policy-icon-circle--info">
                      <Info size={16} />
                    </div>
                    <div>
                      <strong className="policy-title policy-title--alert">Kiểm toán tự động chuẩn bị chạy</strong>
                      <p className="policy-desc policy-desc--alert">
                        Đợt rà soát định kỳ toàn cụm Kubernetes lúc 23:59 tối nay.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 2: TÍCH HỢP HRM & CHẤM CÔNG QR ── */}
      {activeTab === 'hrm' && (
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Điều phối Cổng Chấm công IoT & Cấu hình FastHRM</h2>
              <p>Quản lý đầu đọc thẻ QR phần cứng tại cổng phòng Lab và thông số tích hợp FastHRM API.</p>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => setPrintQrModal(true)}
            >
              <Printer size={15} />
              <span>In thẻ QR Thực tập sinh</span>
            </button>
          </div>

          <div className="hrm-grid-layout">
            <div className="hrm-scanner-box">
              <div className="scanner-header">
                <Cpu size={18} className="text-primary" />
                <h3>Cổng IoT Scanner Lab 302</h3>
                <span className="live-socket-badge">Online</span>
              </div>
              <p className="scanner-desc">
                Địa chỉ IP: <strong>192.168.10.88</strong> · Firmware: v3.4.1-IoT · Thiết bị: Hikvision QR Reader
              </p>
              <div className="scanner-metric-row">
                <span>Lượt quẹt hôm nay: <strong>894 lượt</strong></span>
                <span>Tỷ lệ nhận diện: <strong>99.8%</strong></span>
              </div>
            </div>

            <div className="hrm-scanner-box">
              <div className="scanner-header">
                <Cpu size={18} className="text-primary" />
                <h3>Cổng IoT Scanner Tòa C1</h3>
                <span className="live-socket-badge">Online</span>
              </div>
              <p className="scanner-desc">
                Địa chỉ IP: <strong>192.168.10.89</strong> · Firmware: v3.4.1-IoT · Thiết bị: ZKTeco Barcode / RFID
              </p>
              <div className="scanner-metric-row">
                <span>Lượt quẹt hôm nay: <strong>512 lượt</strong></span>
                <span>Tỷ lệ nhận diện: <strong>99.5%</strong></span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 3: TÀI KHOẢN & MA TRẬN RBAC ── */}
      {activeTab === 'rbac' && (
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <div className="panel-title-row">
                <h2>Ma trận Phân quyền Vai trò (RBAC Access Matrix)</h2>
                <span className="nist-badge">Model: NIST RBAC 2.0 Compliant</span>
              </div>
              <p>Quy định chi tiết 5 mức đặc quyền truy cập trên 4 nhóm người dùng trong toàn hệ thống.</p>
            </div>

            <div className="admin-header-actions">
              <button
                type="button"
                className="admin-btn admin-btn--outline admin-btn--sm"
                onClick={() => showToast('Đã mở chế độ tùy chỉnh quyền hạn RBAC', 'info')}
              >
                <SlidersHorizontal size={14} />
                <span>Tùy chỉnh quyền</span>
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--sm"
                onClick={() => showToast('Cấu hình ma trận phân quyền đã được lưu và đồng bộ lên Redis Token Cache!')}
              >
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="enterprise-data-table rbac-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '36%' }}>Nhóm vai trò (Role Domain)</th>
                  <th style={{ textAlign: 'center' }}>XEM<br /><span className="th-sub">(READ)</span></th>
                  <th style={{ textAlign: 'center' }}>THÊM<br /><span className="th-sub">(CREATE)</span></th>
                  <th style={{ textAlign: 'center' }}>SỬA<br /><span className="th-sub">(UPDATE)</span></th>
                  <th style={{ textAlign: 'center' }}>DUYỆT<br /><span className="th-sub">(APPROVE)</span></th>
                  <th style={{ textAlign: 'center' }}>XÓA<br /><span className="th-sub">(DELETE)</span></th>
                </tr>
              </thead>
              <tbody>
                {RBAC_ROLES.map((r, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="rbac-role-cell">
                        <strong className="rbac-role-name">{r.role}</strong>
                        <span className="rbac-role-desc">{r.desc}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.read ? (
                        <span className="rbac-icon-tick" title="Được cấp quyền Xem"><Check size={16} /></span>
                      ) : (
                        <span className="rbac-icon-dash"><Minus size={16} /></span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.create ? (
                        <span className="rbac-icon-tick" title="Được cấp quyền Thêm"><Check size={16} /></span>
                      ) : (
                        <span className="rbac-icon-dash"><Minus size={16} /></span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.update ? (
                        <span className="rbac-icon-tick" title="Được cấp quyền Sửa"><Check size={16} /></span>
                      ) : (
                        <span className="rbac-icon-dash"><Minus size={16} /></span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.approve ? (
                        <span className="rbac-icon-tick" title="Được cấp quyền Duyệt"><Check size={16} /></span>
                      ) : (
                        <span className="rbac-icon-dash"><Minus size={16} /></span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.delete ? (
                        <span className="rbac-icon-tick" title="Được cấp quyền Xóa"><Check size={16} /></span>
                      ) : (
                        <span className="rbac-icon-dash"><Minus size={16} /></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── TAB 4: NHẬT KÝ TRUY VẾT (SYSTEM LOGS) ── */}
      {activeTab === 'logs' && (
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <div className="panel-title-row">
                <h2>Nhật ký Truy vết An ninh Thời gian thực (Real-time Audit Logs)</h2>
                <span className="live-stream-badge">
                  <Radio size={13} className="stream-icon-pulse" />
                  Live Feed
                </span>
              </div>
              <p>Toàn bộ sự kiện xác thực định danh, cấp quyền, API call và xuất dữ liệu được giám sát 24/7.</p>
            </div>

            {/* Thanh tìm kiếm Lọc IP / Endpoint & dropdown lọc HTTP Status */}
            <div className="table-controls">
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Lọc theo IP, Email hoặc Endpoint..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Dropdown lọc HTTP Status */}
              <select
                className="filter-select"
                value={httpStatusFilter}
                onChange={(e) => setHttpStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả HTTP Status</option>
                <option value="200">200 OK</option>
                <option value="401">401 Unauthorized</option>
                <option value="500">500 Server Error</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="enterprise-data-table audit-logs-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Thời gian</th>
                  <th style={{ width: '25%' }}>Tài khoản & IP Network</th>
                  <th style={{ width: '22%' }}>Endpoint & Method</th>
                  <th>Chi tiết hoạt động thực hiện</th>
                  <th style={{ textAlign: 'center', width: '12%' }}>HTTP Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty-row">
                      Không tìm thấy bản ghi Audit Trail nào phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="log-time-cell">
                          <Clock size={13} className="text-muted" />
                          <strong>{log.time}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="log-actor-block">
                          <strong className="actor-email">{log.actor}</strong>
                          <div className="actor-ip-line">
                            <span className="ip-badge">IP: {log.ip}</span>
                            <span className="network-tag">· {log.network}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="method-endpoint-cell">
                          <span className={`method-badge method-badge--${log.method.toLowerCase()}`}>
                            {log.method}
                          </span>
                          <code className="endpoint-code">{log.endpoint}</code>
                        </div>
                      </td>
                      <td>
                        <span className="audit-desc-text">{log.description}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-badge status-badge--success">
                          <CheckCircle2 size={13} />
                          {log.statusText}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL CẤP MỚI TÀI KHOẢN ── */}
      {newUserModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Cấp mới tài khoản hệ thống (Root Admin)</h3>
              <button type="button" className="modal-close-btn" onClick={() => setNewUserModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Họ và tên người dùng:</label>
                <input type="text" className="modal-input" placeholder="Ví dụ: Hoàng Tuấn Anh" />
              </div>
              <div className="modal-field">
                <label>Email định danh ICTU:</label>
                <input type="email" className="modal-input" placeholder="anh.ht@ictu.edu.vn" />
              </div>
              <div className="modal-field">
                <label>Phân quyền vai trò:</label>
                <select className="filter-select" style={{ width: '100%' }}>
                  <option>Mentor (Cán bộ Hướng dẫn Chuyên môn)</option>
                  <option>HR Manager (Cán bộ Nhân sự)</option>
                  <option>Intern TTS (Thực tập sinh)</option>
                  <option>System Admin (Quản trị viên hạ tầng)</option>
                </select>
              </div>
              <div className="modal-field">
                <label>Chính sách xác thực:</label>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ✓ Bắt buộc kích hoạt Google Authenticator (TOTP 2FA) khi đăng nhập lần đầu.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setNewUserModal(false)}>Hủy</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => {
                  setNewUserModal(false)
                  showToast('Đã khởi tạo tài khoản và gửi email kích hoạt bảo mật kèm mã QR 2FA!')
                }}
              >
                Cấp tài khoản ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IN THẺ QR HÀNG LOẠT ── */}
      {printQrModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>In thẻ QR Điểm danh hàng loạt</h3>
              <button type="button" className="modal-close-btn" onClick={() => setPrintQrModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Hệ thống sẽ kết xuất mã định danh mã hóa AES-256 kèm ID sinh viên thực tập dạng mã ma trận QR Code độ phân giải cao chuẩn thẻ nhựa nhân viên PVC.
              </p>
              <div className="modal-field" style={{ marginTop: '1rem' }}>
                <label>Chọn đợt sinh viên cần in thẻ:</label>
                <select className="filter-select" style={{ width: '100%' }}>
                  <option>Kỳ Mùa Thu Q3/2026 (Toàn bộ 15 TTS chính thức)</option>
                  <option>Đợt bổ sung Lab IoT & R&D (4 TTS)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setPrintQrModal(false)}>Hủy</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => {
                  setPrintQrModal(false)
                  showToast('Đang kết xuất tệp PDF in thẻ QR chất lượng cao: QR_Badges_Q3_2026.pdf')
                }}
              >
                <Printer size={15} />
                <span>Bắt đầu in hàng loạt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
