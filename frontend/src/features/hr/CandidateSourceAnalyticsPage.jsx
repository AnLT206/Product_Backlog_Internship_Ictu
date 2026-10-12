import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import { getPrograms } from '../../api/programs'
import { getCandidateSourceStats } from '../../api/reports'
import './CandidateSourceAnalyticsPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   CHART COLOR PALETTE
   Đồng bộ với hệ thống HR Analytics & Dashboard
   ───────────────────────────────────────────────────────────────────────── */
const PIE_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
  '#84cc16', // Lime
  '#f97316', // Orange
  '#0ea5e9', // Sky
]

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: HORIZONTAL BAR CHART THEO TRƯỜNG
   Đồ họa SVG kết hợp thanh bar trực quan chống tràn màn hình (No overflow)
   ───────────────────────────────────────────────────────────────────────── */
function UniversityBarChart({ data = [], totalInterns = 0 }) {
  const [activeItem, setActiveItem] = useState(null)

  // Giá trị max để tính tỷ lệ vẽ thanh bar
  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1
    const counts = data.map((d) => Number(d.count || 0))
    return Math.max(...counts, 1)
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="csa-empty-chart">
        <GraduationCap size={28} className="csa-empty-icon" />
        <p>Không có dữ liệu thực tập sinh theo trường trong đợt này</p>
      </div>
    )
  }

  // Tạo các mốc thước đo tương ứng với maxCount
  const scaleStep = Math.max(1, Math.ceil(maxCount / 4))
  const scaleTicks = [0, scaleStep, scaleStep * 2, scaleStep * 3, Math.max(maxCount, scaleStep * 4)]

  return (
    <div className="csa-bar-chart-container">
      {/* Thước đo tỷ lệ */}
      <div className="csa-bar-scale" aria-hidden="true">
        {scaleTicks.map((tick, idx) => (
          <span key={idx}>
            {tick} {idx === scaleTicks.length - 1 ? 'TTS' : ''}
          </span>
        ))}
      </div>

      <div className="csa-bar-list" role="list">
        {data.map((item, index) => {
          const countNum = Number(item.count || 0)
          const widthPercent = Math.min(100, Math.round((countNum / maxCount) * 100))
          const sharePercent =
            item.percentage != null
              ? Number(item.percentage).toFixed(1)
              : totalInterns > 0
              ? ((countNum / totalInterns) * 100).toFixed(1)
              : '0.0'
          const isActive = activeItem === item.name

          return (
            <div
              key={item.name || index}
              className={`csa-bar-row ${isActive ? 'is-active' : ''}`}
              role="listitem"
              onMouseEnter={() => setActiveItem(item.name)}
              onMouseLeave={() => setActiveItem(null)}
            >
              {/* Cột Tên trường */}
              <div className="csa-bar-label-wrap">
                <span className="csa-bar-rank">#{index + 1}</span>
                <span className="csa-bar-name" title={item.name}>
                  {item.name}
                </span>
              </div>

              {/* Cột Thanh Bar SVG/CSS */}
              <div className="csa-bar-track-wrap">
                <div className="csa-bar-track">
                  <div
                    className="csa-bar-fill"
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    role="progressbar"
                    aria-valuenow={countNum}
                    aria-valuemin={0}
                    aria-valuemax={maxCount}
                    aria-label={`${item.name}: ${countNum} thực tập sinh`}
                  >
                    <span className="csa-bar-fill-glow" />
                  </div>
                </div>
              </div>

              {/* Cột Số lượng & Tỷ lệ */}
              <div className="csa-bar-val-wrap">
                <span className="csa-bar-count">
                  {countNum} <small>TTS</small>
                </span>
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
function MajorPieChart({ data = [], totalInterns = 0 }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const totalCount = useMemo(() => {
    const sum = data.reduce((acc, item) => acc + Number(item.count || 0), 0)
    return sum > 0 ? sum : Number(totalInterns || 0)
  }, [data, totalInterns])

  // Tính toán góc vẽ từng slice
  const slices = useMemo(() => {
    if (!data || data.length === 0 || totalCount === 0) return []
    const cx = 120
    const cy = 120
    const r = 95
    let currentAngle = -Math.PI / 2 // Bắt đầu từ 12h

    return data.map((item, idx) => {
      const countNum = Number(item.count || 0)
      const sliceAngle = totalCount > 0 ? (countNum / totalCount) * 2 * Math.PI : 0
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle
      currentAngle = endAngle

      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0
      const pathData =
        sliceAngle >= 2 * Math.PI - 0.001
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
          : `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`

      const percent =
        item.percentage != null
          ? Number(item.percentage).toFixed(1)
          : totalCount > 0
          ? ((countNum / totalCount) * 100).toFixed(1)
          : '0.0'

      const color = PIE_COLORS[idx % PIE_COLORS.length]

      return {
        ...item,
        idx,
        color,
        count: countNum,
        pathData,
        percent,
      }
    })
  }, [data, totalCount])

  if (!data || data.length === 0 || totalCount === 0) {
    return (
      <div className="csa-empty-chart">
        <Layers size={28} className="csa-empty-icon" />
        <p>Không có dữ liệu thực tập sinh theo ngành trong đợt này</p>
      </div>
    )
  }

  const activeSlice = hoveredIndex != null ? slices[hoveredIndex] : null

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
            const isHovered = hoveredIndex === slice.idx
            return (
              <path
                key={slice.name || slice.idx}
                d={slice.pathData}
                fill={slice.color}
                stroke="#ffffff"
                strokeWidth={isHovered ? '2.5' : '1.5'}
                className={`csa-pie-slice ${isHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredIndex(slice.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
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
          const isHovered = hoveredIndex === slice.idx
          return (
            <div
              key={slice.name || slice.idx}
              className={`csa-legend-item ${isHovered ? 'is-hovered' : ''}`}
              role="listitem"
              onMouseEnter={() => setHoveredIndex(slice.idx)}
              onMouseLeave={() => setHoveredIndex(null)}
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
  // Danh sách các đợt thực tập từ API GET /api/hr/programs
  const [programs, setPrograms] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('all')
  const [loadingPrograms, setLoadingPrograms] = useState(true)

  // Dữ liệu thống kê nguồn ứng viên từ API GET /api/hr/analytics/sources
  const [stats, setStats] = useState({
    total_interns: 0,
    by_university: [],
    by_major: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 1. Tải danh sách đợt thực tập từ backend
  useEffect(() => {
    let isMounted = true
    async function loadProgramsList() {
      try {
        const res = await getPrograms()
        if (!isMounted) return
        if (res.ok && res.data) {
          const list = Array.isArray(res.data) ? res.data : res.data.items || []
          setPrograms(list)
        }
      } catch {
        // Giữ fallback mảng rỗng nếu có lỗi mạng
      } finally {
        if (isMounted) setLoadingPrograms(false)
      }
    }
    void loadProgramsList()
    return () => {
      isMounted = false
    }
  }, [])

  // 2. Tải thống kê số lượng TTS theo trường/ngành với bộ lọc đợt thực tập
  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const progId = selectedProgramId === 'all' ? null : Number(selectedProgramId)
      const res = await getCandidateSourceStats(progId)
      if (res.ok && res.data) {
        setStats({
          total_interns: Number(res.data.total_interns || 0),
          by_university: Array.isArray(res.data.by_university) ? res.data.by_university : [],
          by_major: Array.isArray(res.data.by_major) ? res.data.by_major : [],
        })
      } else {
        setError(res.data?.detail || res.data?.message || 'Không thể tải dữ liệu thống kê từ hệ thống')
      }
    } catch {
      setError('Lỗi kết nối máy chủ khi tải thống kê nguồn ứng viên')
    } finally {
      setLoading(false)
    }
  }, [selectedProgramId])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  // Tính toán các chỉ số KPI từ dữ liệu API thực tế
  const kpiData = useMemo(() => {
    return {
      totalInterns: Number(stats.total_interns || 0),
      totalUniversities: stats.by_university.length,
      totalMajors: stats.by_major.length,
    }
  }, [stats])

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

        {/* Dropdown bộ lọc theo Đợt thực tập */}
        <div className="csa-hero-aside">
          <div className="csa-filter-box">
            <label htmlFor="csa-program-filter" className="csa-filter-label">
              <Calendar size={14} className="csa-filter-icon" />
              <span>Kỳ thực tập:</span>
            </label>
            <div className="csa-select-wrap">
              <select
                id="csa-program-filter"
                className="csa-filter-select"
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                disabled={loadingPrograms}
                aria-label="Chọn kỳ thực tập để lọc"
              >
                <option value="all">Tất cả các đợt thực tập</option>
                {programs.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name}
                  </option>
                ))}
              </select>
              <Filter size={13} className="csa-select-chevron" aria-hidden="true" />
            </div>
            {loading && (
              <RefreshCw size={14} className="csa-filter-spin" title="Đang cập nhật..." aria-hidden="true" />
            )}
          </div>
        </div>
      </header>

      {/* ── Thông báo Lỗi nếu có ── */}
      {error && !loading && (
        <div className="csa-error-banner" role="alert">
          <div className="csa-error-content">
            <AlertCircle size={18} className="csa-error-icon" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="csa-retry-btn"
            onClick={loadStats}
          >
            <RefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

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
            <div className="csa-kpi-val">{kpiData.totalInterns}</div>
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
            <div className="csa-kpi-val">{kpiData.totalUniversities}</div>
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
            <div className="csa-kpi-val">{kpiData.totalMajors}</div>
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
              data={stats.by_university}
              totalInterns={kpiData.totalInterns}
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
            <MajorPieChart
              data={stats.by_major}
              totalInterns={kpiData.totalInterns}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
