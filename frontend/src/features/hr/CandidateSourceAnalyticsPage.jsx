import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Info,
} from 'lucide-react'
import './CandidateSourceAnalyticsPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK DATA FOR TASK 1
   // TODO: Replace mock data with real API in Task 2.
   ───────────────────────────────────────────────────────────────────────── */
const MOCK_SUMMARY = {
  totalInterns: 102,
  totalUniversities: 8,
  totalMajors: 5,
}

const MOCK_UNIVERSITIES = [
  { id: 'ictu', name: 'ICTU', count: 35, fullName: 'Đại học Công nghệ Thông tin & Truyền thông Thái Nguyên' },
  { id: 'tnu', name: 'Đại học Thái Nguyên', count: 24, fullName: 'Đại học Thái Nguyên' },
  { id: 'neu', name: 'Đại học Kinh tế Quốc dân', count: 18, fullName: 'Đại học Kinh tế Quốc dân' },
  { id: 'hust', name: 'Đại học Bách khoa Hà Nội', count: 15, fullName: 'Đại học Bách khoa Hà Nội' },
  { id: 'haui', name: 'Đại học Công nghiệp Hà Nội', count: 10, fullName: 'Đại học Công nghiệp Hà Nội' },
]

const MOCK_MAJORS = [
  { id: 'se', name: 'Công nghệ phần mềm', count: 40, color: '#2563eb' },
  { id: 'is', name: 'Hệ thống thông tin', count: 25, color: '#10b981' },
  { id: 'cs', name: 'Khoa học máy tính', count: 20, color: '#f59e0b' },
  { id: 'net', name: 'Mạng máy tính', count: 10, color: '#8b5cf6' },
  { id: 'other', name: 'Khác', count: 5, color: '#64748b' },
]

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: HORIZONTAL BAR CHART THEO TRƯỜNG
   Đồ họa SVG kết hợp thanh bar trực quan chống tràn màn hình (No overflow)
   ───────────────────────────────────────────────────────────────────────── */
function UniversityBarChart({ data = [], totalInterns = 102 }) {
  const [activeItem, setActiveItem] = useState(null)

  // Giá trị max để tính tỷ lệ vẽ thanh bar
  const maxCount = useMemo(() => {
    if (!data.length) return 1
    return Math.max(...data.map((d) => d.count), 1)
  }, [data])

  if (!data.length) {
    return <div className="csa-empty-chart">Chưa có dữ liệu trường đại học</div>
  }

  return (
    <div className="csa-bar-chart-container">
      {/* Thước đo tỷ lệ (Grid scale 0 - 40) */}
      <div className="csa-bar-scale" aria-hidden="true">
        <span>0</span>
        <span>10</span>
        <span>20</span>
        <span>30</span>
        <span>40 TTS</span>
      </div>

      <div className="csa-bar-list" role="list">
        {data.map((item, index) => {
          const widthPercent = Math.min(100, Math.round((item.count / maxCount) * 100))
          const sharePercent = totalInterns > 0 ? ((item.count / totalInterns) * 100).toFixed(1) : '0'
          const isActive = activeItem === item.id

          return (
            <div
              key={item.id}
              className={`csa-bar-row ${isActive ? 'is-active' : ''}`}
              role="listitem"
              onMouseEnter={() => setActiveItem(item.id)}
              onMouseLeave={() => setActiveItem(null)}
            >
              {/* Cột Tên trường */}
              <div className="csa-bar-label-wrap">
                <span className="csa-bar-rank">#{index + 1}</span>
                <span className="csa-bar-name" title={item.fullName || item.name}>
                  {item.name}
                </span>
              </div>

              {/* Cột Thanh Bar SVG/CSS */}
              <div className="csa-bar-track-wrap">
                <div className="csa-bar-track">
                  <div
                    className="csa-bar-fill"
                    style={{ width: `${widthPercent}%` }}
                    role="progressbar"
                    aria-valuenow={item.count}
                    aria-valuemin={0}
                    aria-valuemax={maxCount}
                    aria-label={`${item.name}: ${item.count} thực tập sinh`}
                  >
                    <span className="csa-bar-fill-glow" />
                  </div>
                </div>
              </div>

              {/* Cột Số lượng & Tỷ lệ */}
              <div className="csa-bar-val-wrap">
                <span className="csa-bar-count">{item.count} <small>TTS</small></span>
                <span className="csa-bar-percent">({sharePercent}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: PIE CHART THEO NGÀNH (SVG THUẦN)
   Vẽ các lát cắt SVG Arc chính xác với hiệu ứng tương tác (Hover Legend/Slice)
   ───────────────────────────────────────────────────────────────────────── */
function MajorPieChart({ data = [] }) {
  const [hoveredId, setHoveredId] = useState(null)

  const totalCount = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0)
  }, [data])

  // Tính toán góc vẽ từng slice
  const slices = useMemo(() => {
    if (!totalCount) return []
    const cx = 120
    const cy = 120
    const r = 95
    let currentAngle = -Math.PI / 2 // Bắt đầu từ 12h

    return data.map((item) => {
      const sliceAngle = (item.count / totalCount) * 2 * Math.PI
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle
      currentAngle = endAngle

      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0
      const pathData = `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`

      const percent = ((item.count / totalCount) * 100).toFixed(1)

      return {
        ...item,
        pathData,
        percent,
      }
    })
  }, [data, totalCount])

  if (!data.length || totalCount === 0) {
    return <div className="csa-empty-chart">Chưa có dữ liệu chuyên ngành</div>
  }

  const activeSlice = slices.find((s) => s.id === hoveredId)

  return (
    <div className="csa-pie-chart-container">
      {/* Biểu đồ tròn SVG */}
      <div className="csa-pie-graphic-wrap">
        <svg
          viewBox="0 0 240 240"
          className="csa-pie-svg"
          role="img"
          aria-label="Biểu đồ tròn phân bổ thực tập sinh theo chuyên ngành"
        >
          {slices.map((slice) => {
            const isHovered = hoveredId === slice.id
            return (
              <path
                key={slice.id}
                d={slice.pathData}
                fill={slice.color}
                stroke="#ffffff"
                strokeWidth={isHovered ? '2.5' : '1.5'}
                className={`csa-pie-slice ${isHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredId(slice.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <title>{`${slice.name}: ${slice.count} TTS (${slice.percent}%)`}</title>
              </path>
            )
          })}
          {/* Vòng đệm trung tâm làm điểm nhấn thị giác */}
          <circle cx="120" cy="120" r="32" fill="#ffffff" />
          <circle cx="120" cy="120" r="32" fill="none" stroke="#f1f5f9" strokeWidth="2" />
          <text
            x="120"
            y="116"
            textAnchor="middle"
            className="csa-pie-center-title"
          >
            {activeSlice ? `${activeSlice.count}` : `${totalCount}`}
          </text>
          <text
            x="120"
            y="132"
            textAnchor="middle"
            className="csa-pie-center-sub"
          >
            {activeSlice ? `${activeSlice.percent}%` : 'Tổng TTS'}
          </text>
        </svg>
      </div>

      {/* Legend & Bảng chú thích */}
      <div className="csa-pie-legend" role="list">
        {slices.map((slice) => {
          const isHovered = hoveredId === slice.id
          return (
            <div
              key={slice.id}
              className={`csa-legend-item ${isHovered ? 'is-hovered' : ''}`}
              role="listitem"
              onMouseEnter={() => setHoveredId(slice.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="csa-legend-left">
                <span
                  className="csa-legend-dot"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <span className="csa-legend-name" title={slice.name}>
                  {slice.name}
                </span>
              </div>
              <div className="csa-legend-right">
                <span className="csa-legend-count">{slice.count} TTS</span>
                <span className="csa-legend-percent">{slice.percent}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: CANDIDATE SOURCE ANALYTICS PAGE
   Route: /hr/candidate-source
   ───────────────────────────────────────────────────────────────────────── */
export default function CandidateSourceAnalyticsPage() {
  // TODO: Replace mock data with real API in Task 2.
  const [summary] = useState(MOCK_SUMMARY)
  const [universities] = useState(MOCK_UNIVERSITIES)
  const [majors] = useState(MOCK_MAJORS)

  return (
    <div className="csa-page">
      {/* ── 1. Hero Header Card ── */}
      <header className="csa-hero-card">
        <div className="csa-hero-main">
          <nav className="csa-breadcrumb" aria-label="Breadcrumb">
            <Link to="/hr/dashboard" className="csa-breadcrumb-link">
              HR Dashboard
            </Link>
            <span className="csa-breadcrumb-sep">/</span>
            <span className="csa-breadcrumb-current">Phân tích nguồn ứng viên</span>
          </nav>

          <div className="csa-hero-title-group">
            <span className="csa-hero-badge">PHÂN TÍCH TUYỂN DỤNG</span>
            <h1 className="csa-hero-title">Phân tích nguồn ứng viên</h1>
            <p className="csa-hero-desc">
              Thống kê số lượng thực tập sinh theo trường và ngành.
            </p>
          </div>
        </div>

        <div className="csa-hero-aside">
          <div className="csa-info-pill">
            <Info size={15} className="csa-info-icon" />
            <span>Dữ liệu nguồn thực tập sinh đang hoạt động</span>
          </div>
        </div>
      </header>

      {/* ── 2. KPI Summary Cards ── */}
      <section className="csa-kpi-grid" aria-label="Thẻ chỉ số tổng quan">
        {/* KPI 1: Tổng thực tập sinh */}
        <article className="csa-kpi-card csa-kpi-card--blue">
          <div className="csa-kpi-header">
            <span className="csa-kpi-title">Tổng thực tập sinh</span>
            <div className="csa-kpi-icon csa-kpi-icon--blue" aria-hidden="true">
              <Users size={18} />
            </div>
          </div>
          <div className="csa-kpi-body">
            <div className="csa-kpi-val">{summary.totalInterns}</div>
            <span className="csa-kpi-tag csa-kpi-tag--blue">Ứng viên tiếp nhận</span>
          </div>
          <div className="csa-kpi-hint">Tổng số thực tập sinh từ tất cả các trường</div>
        </article>

        {/* KPI 2: Số trường */}
        <article className="csa-kpi-card csa-kpi-card--green">
          <div className="csa-kpi-header">
            <span className="csa-kpi-title">Số trường</span>
            <div className="csa-kpi-icon csa-kpi-icon--green" aria-hidden="true">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="csa-kpi-body">
            <div className="csa-kpi-val">{summary.totalUniversities}</div>
            <span className="csa-kpi-tag csa-kpi-tag--green">Đối tác liên kết</span>
          </div>
          <div className="csa-kpi-hint">Các cơ sở đại học và cao đẳng có sinh viên</div>
        </article>

        {/* KPI 3: Số ngành */}
        <article className="csa-kpi-card csa-kpi-card--purple">
          <div className="csa-kpi-header">
            <span className="csa-kpi-title">Số ngành</span>
            <div className="csa-kpi-icon csa-kpi-icon--purple" aria-hidden="true">
              <Layers size={18} />
            </div>
          </div>
          <div className="csa-kpi-body">
            <div className="csa-kpi-val">{summary.totalMajors}</div>
            <span className="csa-kpi-tag csa-kpi-tag--purple">Chuyên môn đào tạo</span>
          </div>
          <div className="csa-kpi-hint">Các nhóm ngành công nghệ thông tin & kỹ thuật</div>
        </article>
      </section>

      {/* ── 3. Charts Grid (Bar Chart & Pie Chart) ── */}
      <section className="csa-charts-grid" aria-label="Biểu đồ phân tích nguồn ứng viên">
        {/* Card 1: Bar Chart theo trường */}
        <div className="csa-chart-card">
          <div className="csa-chart-card-header">
            <div className="csa-chart-header-left">
              <div className="csa-chart-header-icon csa-chart-header-icon--blue">
                <BarChart3 size={18} />
              </div>
              <div>
                <h2 className="csa-chart-title">Thực tập sinh theo trường</h2>
                <p className="csa-chart-desc">
                  Phân bổ số lượng sinh viên tuyển dụng từ các trường đại học
                </p>
              </div>
            </div>
            <span className="csa-chart-pill">Cột ngang (Bar Chart)</span>
          </div>

          <div className="csa-chart-card-body">
            <UniversityBarChart
              data={universities}
              totalInterns={summary.totalInterns}
            />
          </div>
        </div>

        {/* Card 2: Pie Chart theo ngành */}
        <div className="csa-chart-card">
          <div className="csa-chart-card-header">
            <div className="csa-chart-header-left">
              <div className="csa-chart-header-icon csa-chart-header-icon--purple">
                <PieIcon size={18} />
              </div>
              <div>
                <h2 className="csa-chart-title">Thực tập sinh theo ngành</h2>
                <p className="csa-chart-desc">
                  Tỷ lệ phần trăm phân bố theo từng chuyên ngành đào tạo
                </p>
              </div>
            </div>
            <span className="csa-chart-pill">Tròn (Pie Chart)</span>
          </div>

          <div className="csa-chart-card-body">
            <MajorPieChart data={majors} />
          </div>
        </div>
      </section>
    </div>
  )
}
