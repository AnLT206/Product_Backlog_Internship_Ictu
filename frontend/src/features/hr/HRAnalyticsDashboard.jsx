import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Users,
  Award,
  UserX,
  TrendingUp,
  TrendingDown,
  Search,
  RotateCcw,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  PieChart as PieIcon,
  HelpCircle,
} from 'lucide-react';
import './HRAnalyticsDashboard.css';

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK DATA & FILTER OPTIONS
   ───────────────────────────────────────────────────────────────────────────── */
const BATCH_OPTIONS = [
  { value: 'all', label: 'Tất cả các đợt thực tập' },
  { value: '2026-FALL', label: 'Khóa K20 - Kỳ Thu 2026' },
  { value: '2026-SUMMER', label: 'Khóa K19 - Kỳ Hè 2026' },
  { value: '2026-SPRING', label: 'Khóa K20 - Kỳ Xuân 2026' },
];

const SCHOOL_OPTIONS = [
  { value: 'all', label: 'Tất cả các trường' },
  { value: 'ICTU', label: 'ĐH CNTT & Truyền thông (ICTU)' },
  { value: 'TNU_TECH', label: 'ĐH Kỹ thuật Công nghiệp Thái Nguyên' },
  { value: 'HUST', label: 'ĐH Bách Khoa Hà Nội' },
  { value: 'UET', label: 'ĐH Công nghệ - ĐHQGHN' },
];

const INITIAL_REPORT_DATA = [
  {
    id: 'TTS0001',
    name: 'Nguyễn Văn An',
    school: 'ĐH CNTT & Truyền thông (ICTU)',
    schoolCode: 'ICTU',
    major: 'Kỹ thuật Phần mềm',
    batch: '2026-FALL',
    gpa: 8.8,
    grade: 'Xuất sắc',
    attendanceRate: 98.5,
    attendanceSessions: '24/24',
    mentor: 'Trần Hoàng Quân',
  },
  {
    id: 'TTS0002',
    name: 'Lê Hoàng Nam',
    school: 'ĐH CNTT & Truyền thông (ICTU)',
    schoolCode: 'ICTU',
    major: 'Kỹ thuật Phần mềm',
    batch: '2026-FALL',
    gpa: 8.2,
    grade: 'Giỏi',
    attendanceRate: 95.8,
    attendanceSessions: '23/24',
    mentor: 'Phạm Quốc Hướng',
  },
  {
    id: 'TTS0003',
    name: 'Trần Thị Bình',
    school: 'ĐH CNTT & Truyền thông (ICTU)',
    schoolCode: 'ICTU',
    major: 'Công nghệ Thông tin',
    batch: '2026-FALL',
    gpa: 8.4,
    grade: 'Giỏi',
    attendanceRate: 100.0,
    attendanceSessions: '24/24',
    mentor: 'Phạm Quốc Hướng',
  },
  {
    id: 'TTS0004',
    name: 'Phạm Minh Đức',
    school: 'ĐH Kỹ thuật Công nghiệp Thái Nguyên',
    schoolCode: 'TNU_TECH',
    major: 'Khoa học Máy tính',
    batch: '2026-FALL',
    gpa: 7.6,
    grade: 'Khá',
    attendanceRate: 91.6,
    attendanceSessions: '22/24',
    mentor: 'Trần Hoàng Quân',
  },
  {
    id: 'TTS0005',
    name: 'Hoàng Thu Trang',
    school: 'ĐH Kỹ thuật Công nghiệp Thái Nguyên',
    schoolCode: 'TNU_TECH',
    major: 'Trí tuệ Nhân tạo & KH Dữ liệu',
    batch: '2026-FALL',
    gpa: 9.1,
    grade: 'Xuất sắc',
    attendanceRate: 100.0,
    attendanceSessions: '24/24',
    mentor: 'Nguyễn Thị Thu Hương',
  },
  {
    id: 'TTS0006',
    name: 'Đoàn Nhật Linh',
    school: 'ĐH CNTT & Truyền thông (ICTU)',
    schoolCode: 'ICTU',
    major: 'Khoa học Dữ liệu & AI',
    batch: '2026-FALL',
    gpa: 8.9,
    grade: 'Xuất sắc',
    attendanceRate: 100.0,
    attendanceSessions: '24/24',
    mentor: 'Phạm Quốc Hướng',
  },
  {
    id: 'TTS0007',
    name: 'Hoàng Kim Chi',
    school: 'ĐH Kỹ thuật Công nghiệp Thái Nguyên',
    schoolCode: 'TNU_TECH',
    major: 'Công nghệ Thông tin',
    batch: '2026-FALL',
    gpa: 6.8,
    grade: 'Trung bình',
    attendanceRate: 83.3,
    attendanceSessions: '20/24',
    mentor: 'Trần Hoàng Quân',
  },
  {
    id: 'TTS0008',
    name: 'Bùi Gia Huy',
    school: 'ĐH Bách Khoa Hà Nội',
    schoolCode: 'HUST',
    major: 'Kỹ thuật Phần mềm',
    batch: '2026-SUMMER',
    gpa: 8.4,
    grade: 'Giỏi',
    attendanceRate: 95.8,
    attendanceSessions: '23/24',
    mentor: 'Phạm Quốc Hướng',
  },
  {
    id: 'TTS0009',
    name: 'Ngô Thanh Vân',
    school: 'ĐH CNTT & Truyền thông (ICTU)',
    schoolCode: 'ICTU',
    major: 'Mạng máy tính & ATTT',
    batch: '2026-SUMMER',
    gpa: 7.9,
    grade: 'Khá',
    attendanceRate: 92.0,
    attendanceSessions: '22/24',
    mentor: 'Trần Hoàng Quân',
  },
  {
    id: 'TTS0010',
    name: 'Dương Văn Toàn',
    school: 'ĐH Công nghệ - ĐHQGHN',
    schoolCode: 'UET',
    major: 'Kỹ thuật Phần mềm',
    batch: '2026-SPRING',
    gpa: 9.3,
    grade: 'Xuất sắc',
    attendanceRate: 100.0,
    attendanceSessions: '24/24',
    mentor: 'Phạm Quốc Hướng',
  },
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT 1: MINI DONUT PROGRESS (CHO THẺ KPI 2)
   ───────────────────────────────────────────────────────────────────────────── */
export function MiniDonutProgress({ percentage = 0, size = 52, strokeWidth = 6, color = '#10b981' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPercent = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (validPercent / 100) * circumference;

  return (
    <div className="mini-donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="mini-donut-label">
        <span className="mini-donut-value">{Math.round(validPercent)}%</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT 2: STAT CARD (KPI CARD)
   ───────────────────────────────────────────────────────────────────────────── */
export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  iconColorClass = 'text-blue-600',
  iconBgClass = 'bg-blue-50',
  trendType = 'up',
  trendValue = '+0%',
  trendLabel = 'so với kỳ trước',
  donutPercentage = null,
}) {
  const isPositive = trendType === 'up';

  return (
    <div className="analytics-kpi-card">
      <div className="kpi-top-row">
        <div className="kpi-info-col">
          <span className="kpi-title">{title}</span>
          <div className="kpi-value-row">
            <span className="kpi-main-value">{value}</span>
            {subValue && <span className="kpi-sub-value">{subValue}</span>}
          </div>
        </div>

        {donutPercentage !== null ? (
          <MiniDonutProgress percentage={donutPercentage} color="#10b981" />
        ) : (
          <div className={`kpi-icon-pill ${iconBgClass}`}>
            <Icon size={22} className={iconColorClass} />
          </div>
        )}
      </div>

      <div className="kpi-bottom-row">
        <div className={`kpi-trend-badge ${isPositive ? 'is-positive' : 'is-negative'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trendValue}</span>
        </div>
        <span className="kpi-trend-label">{trendLabel}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT 3: INTERACTIVE SVG BAR CHART (CỘT TRÁI - THEO TRƯỜNG ĐẠI HỌC)
   ───────────────────────────────────────────────────────────────────────────── */
export function UniversityBarChart({ data }) {
  const [activeBar, setActiveBar] = useState(null);

  const maxVal = useMemo(() => {
    if (!data || data.length === 0) return 5;
    const max = Math.max(...data.map((d) => d.count), 0);
    return Math.max(max + 1, 5);
  }, [data]);

  return (
    <div className="analytics-chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">
            <BarChart2 size={18} className="chart-header-icon" />
            Phân bố TTS theo Cơ sở Đào tạo
          </h3>
          <p className="chart-subtitle">Thống kê số lượng sinh viên tiếp nhận từ các Trường Đại học liên kết</p>
        </div>
        {activeBar && (
          <div className="active-chart-badge">
            <span>{activeBar.name}: <strong>{activeBar.count} TTS</strong></span>
          </div>
        )}
      </div>

      <div className="chart-body bar-chart-body">
        {data.length === 0 ? (
          <div className="chart-empty-state">
            <HelpCircle size={28} />
            <p>Không có dữ liệu phù hợp với bộ lọc</p>
          </div>
        ) : (
          <div className="custom-bar-chart-container">
            <div className="bar-chart-grid-lines">
              <span className="grid-line" style={{ bottom: '100%' }}><label>{maxVal}</label></span>
              <span className="grid-line" style={{ bottom: '75%' }}><label>{Math.round(maxVal * 0.75)}</label></span>
              <span className="grid-line" style={{ bottom: '50%' }}><label>{Math.round(maxVal * 0.5)}</label></span>
              <span className="grid-line" style={{ bottom: '25%' }}><label>{Math.round(maxVal * 0.25)}</label></span>
              <span className="grid-line" style={{ bottom: '0%' }}><label>0</label></span>
            </div>

            <div className="bar-columns-wrapper">
              {data.map((item, index) => {
                const heightPercent = Math.min(100, Math.round((item.count / maxVal) * 100));
                const isHovered = activeBar?.code === item.code;

                return (
                  <div
                    key={item.code || index}
                    className={`bar-column-item ${isHovered ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveBar(item)}
                    onMouseLeave={() => setActiveBar(null)}
                  >
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <span className="bar-tooltip-val">{item.count}</span>
                      </div>
                    </div>
                    <span className="bar-x-label" title={item.name}>
                      {item.code || item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT 4: INTERACTIVE PIE CHART (CỘT PHẢI - THEO CHUYÊN NGÀNH)
   ───────────────────────────────────────────────────────────────────────────── */
export function MajorPieChart({ data }) {
  const [activeItem, setActiveItem] = useState(null);

  const totalValue = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0) || 1;
  }, [data]);

  // Sinh mảng segment với tọa độ SVG góc quay
  const segments = useMemo(() => {
    let currentAngle = 0;
    const result = [];
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const percentage = (item.value / totalValue) * 100;
      const angle = (item.value / totalValue) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      const color = PIE_COLORS[index % PIE_COLORS.length];
      result.push({
        ...item,
        percentage: Math.round(percentage),
        startAngle,
        angle,
        color,
      });
    }
    return result;
  }, [data, totalValue]);

  // Tạo đường dẫn vòng conic-gradient hoặc SVG Donut segments
  const conicGradientStyle = useMemo(() => {
    if (segments.length === 0) return { background: '#f1f5f9' };
    let currentDeg = 0;
    const gradientParts = segments.map((seg) => {
      const start = currentDeg;
      currentDeg += (seg.value / totalValue) * 360;
      return `${seg.color} ${start}deg ${currentDeg}deg`;
    });
    return {
      background: `conic-gradient(${gradientParts.join(', ')})`,
    };
  }, [segments, totalValue]);

  return (
    <div className="analytics-chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">
            <PieIcon size={18} className="chart-header-icon" />
            Cơ cấu Tiếp nhận theo Chuyên ngành
          </h3>
          <p className="chart-subtitle">Tỷ trọng phân bổ chuyên môn sinh viên trong đợt thực tập</p>
        </div>
      </div>

      <div className="chart-body pie-chart-body">
        {data.length === 0 ? (
          <div className="chart-empty-state">
            <HelpCircle size={28} />
            <p>Không có dữ liệu chuyên ngành phù hợp</p>
          </div>
        ) : (
          <div className="pie-layout-wrapper">
            {/* Vòng tròn Donut Pie Chart */}
            <div className="donut-visual-container">
              <div className="conic-donut-outer" style={conicGradientStyle}>
                <div className="conic-donut-inner">
                  <span className="donut-center-total">{totalValue}</span>
                  <span className="donut-center-desc">Tổng TTS</span>
                </div>
              </div>
            </div>

            {/* Chú giải Legend danh sách chuyên ngành */}
            <div className="pie-legend-list">
              {segments.map((seg) => (
                <div
                  key={seg.name}
                  className={`pie-legend-item ${activeItem?.name === seg.name ? 'is-active' : ''}`}
                  onMouseEnter={() => setActiveItem(seg)}
                  onMouseLeave={() => setActiveItem(null)}
                >
                  <span className="legend-indicator" style={{ backgroundColor: seg.color }} />
                  <span className="legend-name">{seg.name}</span>
                  <strong className="legend-percent">{seg.percentage}%</strong>
                  <span className="legend-count">({seg.value} TTS)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT 5: FILTER TOOLBAR
   ───────────────────────────────────────────────────────────────────────────── */
export function FilterToolbar({ filters, onFilterChange, onReset }) {
  return (
    <div className="analytics-filter-toolbar">
      <div className="filter-group-left">
        {/* Bộ lọc Đợt thực tập */}
        <div className="filter-field">
          <label htmlFor="filter-batch" className="filter-label">
            <Calendar size={14} />
            <span>Đợt thực tập</span>
          </label>
          <select
            id="filter-batch"
            className="filter-select"
            value={filters.batch}
            onChange={(e) => onFilterChange('batch', e.target.value)}
          >
            {BATCH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bộ lọc Trường Đại học */}
        <div className="filter-field">
          <label htmlFor="filter-school" className="filter-label">
            <GraduationCap size={14} />
            <span>Trường Đại học</span>
          </label>
          <select
            id="filter-school"
            className="filter-select"
            value={filters.school}
            onChange={(e) => onFilterChange('school', e.target.value)}
          >
            {SCHOOL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tìm kiếm họ tên TTS */}
        <div className="filter-field filter-field--search">
          <label htmlFor="filter-search" className="filter-label">
            <Search size={14} />
            <span>Tìm kiếm sinh viên</span>
          </label>
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              id="filter-search"
              type="text"
              className="filter-input-search"
              placeholder="Nhập họ tên, mã TTS hoặc chuyên ngành..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filter-group-right">
        <button
          type="button"
          className="btn-filter-reset"
          onClick={onReset}
          title="Đặt lại bộ lọc về mặc định"
        >
          <RotateCcw size={15} />
          <span>Đặt lại</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT 6: DATA TABLE (DATAGRID BÁO CÁO CUỐI KỲ)
   ───────────────────────────────────────────────────────────────────────────── */
export function ReportDataTable({ data, loading }) {
  function getGradeBadgeClass(grade) {
    switch (grade) {
      case 'Xuất sắc':
        return 'badge-grade--excellent';
      case 'Giỏi':
        return 'badge-grade--good';
      case 'Khá':
        return 'badge-grade--fair';
      default:
        return 'badge-grade--average';
    }
  }

  function getAttendanceBadgeClass(rate) {
    if (rate >= 95) return 'badge-att--high';
    if (rate >= 85) return 'badge-att--med';
    return 'badge-att--low';
  }

  return (
    <div className="analytics-table-card">
      <div className="table-card-header">
        <div>
          <h3 className="table-title">Bảng Tổng hợp Đánh giá Kết quả Thực tập Cuối kỳ</h3>
          <p className="table-subtitle">Chi tiết hồ sơ học phần, điểm đánh giá tổng hợp và tỷ lệ chuyên cần</p>
        </div>
        <div className="table-count-pill">
          <span>{data.length} thực tập sinh</span>
        </div>
      </div>

      <div className="table-responsive-wrapper">
        <table className="analytics-data-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
              <th style={{ width: '220px' }}>Họ và tên</th>
              <th style={{ minWidth: '220px' }}>Trường Đại học</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Điểm TB</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Xếp loại</th>
              <th style={{ width: '160px', textAlign: 'center' }}>Chuyên cần</th>
              <th style={{ width: '160px' }}>Mentor hướng dẫn</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="table-empty-cell">
                  <div className="table-loading-spinner">
                    <div className="spinner-icon" />
                    <span>Đang tải dữ liệu báo cáo phân tích...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty-cell">
                  <AlertCircle size={28} className="empty-icon" />
                  <p className="empty-text">Không tìm thấy thực tập sinh nào phù hợp với bộ lọc hiện tại.</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center' }} className="col-stt">
                    {index + 1}
                  </td>
                  <td>
                    <div className="intern-profile-cell">
                      <div className="avatar-initials">
                        {row.name.split(' ').slice(-1)[0].charAt(0).toUpperCase()}
                      </div>
                      <div className="intern-name-group">
                        <strong className="intern-name">{row.name}</strong>
                        <span className="intern-code">{row.id} • {row.major}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="school-name">{row.school}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="score-badge">{row.gpa.toFixed(1)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge-grade ${getGradeBadgeClass(row.grade)}`}>
                      {row.grade}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="attendance-cell-wrap">
                      <span className={`badge-att ${getAttendanceBadgeClass(row.attendanceRate)}`}>
                        {row.attendanceRate}%
                      </span>
                      <span className="attendance-sub">{row.attendanceSessions}</span>
                    </div>
                  </td>
                  <td>
                    <span className="mentor-name">{row.mentor}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: HRAnalyticsDashboard
   ───────────────────────────────────────────────────────────────────────────── */
export default function HRAnalyticsDashboard() {
  const [reportList, setReportList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingType, setExportingType] = useState(null); // 'excel' | 'pdf' | null
  const [toast, setToast] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    batch: 'all',
    school: 'all',
    search: '',
  });

  // Hiển thị Toast thông báo
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  }, []);

  // Khởi tạo và nạp dữ liệu ban đầu
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setReportList(INITIAL_REPORT_DATA);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Cập nhật giá trị bộ lọc
  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Đặt lại bộ lọc
  const handleResetFilters = useCallback(() => {
    setFilters({
      batch: 'all',
      school: 'all',
      search: '',
    });
  }, []);

  /* ── 1. LỌC DANH SÁCH BÁO CÁO TỔNG HỢP ── */
  const filteredData = useMemo(() => {
    return reportList.filter((item) => {
      // Lọc theo Đợt thực tập
      if (filters.batch !== 'all' && item.batch !== filters.batch) {
        return false;
      }
      // Lọc theo Trường Đại học
      if (filters.school !== 'all' && item.schoolCode !== filters.school) {
        return false;
      }
      // Lọc theo Từ khóa tìm kiếm (họ tên hoặc mã TTS)
      if (filters.search.trim()) {
        const query = filters.search.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.id.toLowerCase().includes(query);
        const matchMajor = item.major.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchMajor) {
          return false;
        }
      }
      return true;
    });
  }, [reportList, filters]);

  /* ── 2. TÍNH TOÁN CÁC CHỈ SỐ KPI TỔNG HỢP ── */
  const kpiStats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) {
      return {
        totalInterns: 0,
        completionRate: 0,
        excellenceRate: 0,
        dropoutCount: 0,
      };
    }

    // Tỷ lệ hoàn thành (điểm >= 5.0 và chuyên cần >= 80%)
    const completedCount = filteredData.filter((i) => i.gpa >= 5.0 && i.attendanceRate >= 80).length;
    const completionRate = Math.round((completedCount / total) * 100);

    // Tỷ lệ Xuất sắc / Giỏi
    const excellenceCount = filteredData.filter(
      (i) => i.grade === 'Xuất sắc' || i.grade === 'Giỏi'
    ).length;
    const excellenceRate = Math.round((excellenceCount / total) * 100);

    // Số lượng bỏ cuộc / Không đạt
    const dropoutCount = filteredData.filter((i) => i.gpa < 5.0 || i.attendanceRate < 70).length;

    return {
      totalInterns: total,
      completionRate,
      excellenceRate,
      dropoutCount,
    };
  }, [filteredData]);

  /* ── 3. TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ ── */
  const chartData = useMemo(() => {
    // 3.1 Dữ liệu Bar Chart theo Trường Đại học
    const schoolMap = {};
    filteredData.forEach((item) => {
      const schoolKey = item.schoolCode;
      if (!schoolMap[schoolKey]) {
        schoolMap[schoolKey] = {
          code: schoolKey,
          name: item.school.replace('Đại học ', 'ĐH '),
          count: 0,
        };
      }
      schoolMap[schoolKey].count += 1;
    });
    const schoolChartList = Object.values(schoolMap);

    // 3.2 Dữ liệu Pie Chart theo Chuyên ngành
    const majorMap = {};
    filteredData.forEach((item) => {
      const major = item.major;
      majorMap[major] = (majorMap[major] || 0) + 1;
    });
    const totalCount = filteredData.length || 1;
    const majorChartList = Object.entries(majorMap).map(([name, value]) => ({
      name,
      value,
      percent: Math.round((value / totalCount) * 100),
    }));

    return {
      schoolList: schoolChartList,
      majorList: majorChartList,
    };
  }, [filteredData]);

  /* ── 4. LOGIC XUẤT FILE EXCEL / PDF (BLOB STREAMING) ── */
  const handleExport = async (type) => {
    if (exportingType) return;
    setExportingType(type);

    const isExcel = type === 'excel';
    const extension = isExcel ? 'xlsx' : 'pdf';
    const mimeType = isExcel
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    // Tạo timestamp chuẩn ISO: YYYY-MM-DD_HHmmss
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes()
    ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `Bao_Cao_Thuc_Tap_${dateStr}.${extension}`;

    try {
      const params = new URLSearchParams({
        type,
        batch: filters.batch,
        school: filters.school,
      });

      // Gọi API xuất file thật
      const response = await fetch(`/api/hr/reports/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          Accept: mimeType,
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      let blobData = null;

      if (response.ok) {
        blobData = await response.blob();
      } else {
        // Fallback: Tạo blob CSV / PDF tải xuống ngay cả khi backend chưa có API
        if (isExcel) {
          const header = 'STT\tMã TTS\tHọ và tên\tTrường Đại học\tChuyên ngành\tĐiểm TB\tXếp loại\tChuyên cần\tMentor\n';
          const rows = filteredData
            .map(
              (r, idx) =>
                `${idx + 1}\t${r.id}\t${r.name}\t${r.school}\t${r.major}\t${r.gpa}\t${r.grade}\t${r.attendanceRate}%\t${r.mentor}`
            )
            .join('\n');
          const bom = '\uFEFF';
          blobData = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
        } else {
          const pdfMockContent = `%PDF-1.4\n1 0 obj\n<< /Title (Bao Cao Thuc Tap ICTU) /Creator (HR Analytics) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
          blobData = new Blob([pdfMockContent], { type: 'application/pdf' });
        }
      }

      // Kích hoạt tải file xuống
      const blobUrl = window.URL.createObjectURL(blobData);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = filename;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      // Dọn dẹp DOM và giải phóng bộ nhớ
      document.body.removeChild(downloadAnchor);
      window.URL.revokeObjectURL(blobUrl);

      showToast(`Đã xuất báo cáo ${isExcel ? 'Excel' : 'PDF'} thành công: ${filename}`, 'success');
    } catch (error) {
      console.error('Lỗi khi xuất báo cáo:', error);
      showToast(`Không thể tải tệp ${isExcel ? 'Excel' : 'PDF'}. Vui lòng thử lại sau!`, 'error');
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="analytics-page-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`analytics-toast analytics-toast--${toast.type}`} role="alert">
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="analytics-header">
        <div className="header-text-block">
          <div className="badge-live-tag">
            <span className="live-pulse-dot" />
            <span>Kỳ thực tập K20 - 2026</span>
          </div>
          <h1 className="header-main-title">Báo cáo & Thống kê Phân tích Kết quả Thực tập</h1>
          <p className="header-sub-title">
            Hệ thống phân tích học phần thực tập tốt nghiệp, đánh giá năng lực TTS và tỷ trọng tiếp nhận theo cơ sở đào tạo.
          </p>
        </div>

        {/* Cụm nút bấm Xuất file: Xanh lá (Excel) và Đỏ (PDF) */}
        <div className="header-export-actions">
          <button
            type="button"
            className="btn-export btn-export--excel"
            onClick={() => handleExport('excel')}
            disabled={exportingType !== null}
          >
            {exportingType === 'excel' ? (
              <span className="btn-spinner" />
            ) : (
              <FileSpreadsheet size={17} />
            )}
            <span>{exportingType === 'excel' ? 'Đang xuất Excel...' : 'Xuất Excel'}</span>
          </button>

          <button
            type="button"
            className="btn-export btn-export--pdf"
            onClick={() => handleExport('pdf')}
            disabled={exportingType !== null}
          >
            {exportingType === 'pdf' ? (
              <span className="btn-spinner" />
            ) : (
              <FileText size={17} />
            )}
            <span>{exportingType === 'pdf' ? 'Đang xuất PDF...' : 'Xuất PDF'}</span>
          </button>
        </div>
      </header>

      {/* ── KHU VỰC 1: 4 THẺ CHỈ SỐ KPI ── */}
      <section className="analytics-kpi-grid" aria-label="Thống kê chỉ số quan trọng">
        {/* Thẻ 1: Tổng số thực tập sinh */}
        <StatCard
          title="Tổng số thực tập sinh"
          value={kpiStats.totalInterns}
          subValue="sinh viên"
          icon={Users}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-50"
          trendType="up"
          trendValue="+12.5%"
          trendLabel="so với kỳ trước"
        />

        {/* Thẻ 2: Tỷ lệ hoàn thành (Donut chart mini tích hợp) */}
        <StatCard
          title="Tỷ lệ hoàn thành"
          value={`${kpiStats.completionRate}%`}
          subValue="đạt chuẩn"
          icon={CheckCircle2}
          donutPercentage={kpiStats.completionRate}
          trendType="up"
          trendValue="+4.2%"
          trendLabel="so với kỳ trước"
        />

        {/* Thẻ 3: Tỷ lệ Xuất sắc / Khá */}
        <StatCard
          title="Tỷ lệ Xuất sắc & Giỏi"
          value={`${kpiStats.excellenceRate}%`}
          subValue="tổng số TTS"
          icon={Award}
          iconColorClass="text-amber-500"
          iconBgClass="bg-amber-50"
          trendType="up"
          trendValue="+8.1%"
          trendLabel="so với kỳ trước"
        />

        {/* Thẻ 4: Số lượng bỏ cuộc */}
        <StatCard
          title="Số lượng bỏ cuộc"
          value={kpiStats.dropoutCount}
          subValue="trường hợp"
          icon={UserX}
          iconColorClass="text-rose-600"
          iconBgClass="bg-rose-50"
          trendType="down"
          trendValue="-2.3%"
          trendLabel="so với kỳ trước"
        />
      </section>

      {/* ── KHU VỰC 2: BIỂU ĐỒ PHÂN TÍCH (2 CỘT) ── */}
      <section className="analytics-charts-grid" aria-label="Biểu đồ phân tích">
        {/* Cột trái: Bar Chart theo Trường Đại học */}
        <UniversityBarChart data={chartData.schoolList} />

        {/* Cột phải: Pie Chart theo Chuyên ngành */}
        <MajorPieChart data={chartData.majorList} />
      </section>

      {/* ── KHU VỰC 3: BỘ LỌC VÀ BẢNG TỔNG HỢP (DATAGRID) ── */}
      <section className="analytics-table-section" aria-label="Bảng báo cáo chi tiết">
        {/* Bộ lọc filter */}
        <FilterToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* DataGrid bảng tổng hợp */}
        <ReportDataTable data={filteredData} loading={loading} />
      </section>
    </div>
  );
}

