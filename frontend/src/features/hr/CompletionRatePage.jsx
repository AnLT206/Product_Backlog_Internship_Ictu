/**
 * CompletionRatePage.jsx
 * Route: /hr/completion-rate
 *
 * Thẻ KPI tổng quan và biểu đồ vòng (SVG thuần, không thư viện)
 * thể hiện tỷ lệ hoàn thành chương trình thực tập.
 *
 * US: "Là HR, tôi muốn xem tỷ lệ hoàn thành chương trình để đánh giá
 * chất lượng thực tập."
 *
 * Tích hợp API qua getCompletionStats() từ src/api/programs.js:
 *   - Lấy dữ liệu thống kê kỳ hiện tại và đợt trước
 *   - Phần trăm làm tròn bằng Math.round (dạng "78%")
 *   - Xử lý an toàn khi chia cho 0: hiển thị "0%" hoặc "Chưa có dữ liệu", tuyệt đối không để NaN
 *   - So sánh tỷ lệ với đợt trước: mũi tên và màu xanh khi tăng, đỏ khi giảm, xám khi bằng nhau,
 *     hoặc "Chưa có dữ liệu so sánh" nếu thiếu dữ liệu đợt trước
 *   - Trạng thái loading và trạng thái lỗi rõ ràng
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCompletionStats } from '../../api/programs'
import './CompletionRatePage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   KPI Card definitions
   ───────────────────────────────────────────────────────────────────────── */
const KPI_CARDS = [
  {
    key: 'total',
    label: 'Tổng thực tập sinh',
    hint: 'Toàn bộ TTS trong hệ thống',
    tone: 'primary',
    getValue: (s) => s.total ?? 0,
  },
  {
    key: 'completed',
    label: 'Đã hoàn thành',
    hint: 'Kết thúc chương trình thành công',
    tone: 'success',
    getValue: (s) => s.completed ?? 0,
  },
  {
    key: 'in_progress',
    label: 'Đang thực hiện',
    hint: 'Hiện đang trong chương trình',
    tone: 'warn',
    getValue: (s) => s.in_progress ?? 0,
  },
  {
    key: 'not_completed',
    label: 'Không hoàn thành',
    hint: 'Rời chương trình hoặc thất bại',
    tone: 'danger',
    getValue: (s) => s.not_completed ?? 0,
  },
]

/* ─────────────────────────────────────────────────────────────────────────────
   Helper tính toán & định dạng phần trăm an toàn (tránh NaN khi chia cho 0)
   ───────────────────────────────────────────────────────────────────────── */
function getPercentage(value, total) {
  if (!total || total <= 0) return 0
  return Math.round((Number(value || 0) / Number(total)) * 100)
}

function formatPercentage(value, total) {
  if (!total || total <= 0) return '0%'
  return `${getPercentage(value, total)}%`
}

/**
 * Tính toán chênh lệch tỷ lệ hoàn thành so với đợt trước.
 * Trả về { hasData, diff, arrow, tone, text, badgeText, currentRate, prevRate }
 */
function getComparison(currentSummary, prevPeriod) {
  if (!prevPeriod || prevPeriod.total == null || prevPeriod.total === undefined) {
    return {
      hasData: false,
      diff: 0,
      arrow: '',
      tone: 'muted',
      text: 'Chưa có dữ liệu so sánh',
      badgeText: 'Chưa có dữ liệu so sánh',
      currentRate: 0,
      prevRate: 0,
    }
  }

  const currentRate = (currentSummary && currentSummary.total > 0)
    ? Math.round((Number(currentSummary.completed || 0) / Number(currentSummary.total)) * 100)
    : 0

  const prevRate = Number(prevPeriod.total || 0) > 0
    ? (prevPeriod.completion_rate != null
        ? Math.round(Number(prevPeriod.completion_rate))
        : Math.round((Number(prevPeriod.completed || 0) / Number(prevPeriod.total)) * 100))
    : (prevPeriod.completion_rate != null ? Math.round(Number(prevPeriod.completion_rate)) : 0)

  const diff = currentRate - prevRate

  if (diff > 0) {
    return {
      hasData: true,
      diff,
      arrow: '↑',
      tone: 'up', // xanh khi tăng
      badgeText: `+${diff}%`,
      text: `↑ +${diff}% so với đợt trước`,
      currentRate,
      prevRate,
    }
  }
  if (diff < 0) {
    return {
      hasData: true,
      diff,
      arrow: '↓',
      tone: 'down', // đỏ khi giảm
      badgeText: `${diff}%`,
      text: `↓ ${diff}% so với đợt trước`,
      currentRate,
      prevRate,
    }
  }
  return {
    hasData: true,
    diff: 0,
    arrow: '→',
    tone: 'same', // xám khi bằng nhau
    badgeText: '0%',
    text: '→ 0% so với đợt trước',
    currentRate,
    prevRate,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG Donut Chart — thuần SVG, không thư viện
   Kích thước 200×200, stroke bán kính 80 (circumference ≈ 502.65)
   ───────────────────────────────────────────────────────────────────────── */
const DONUT_RADIUS = 80
const DONUT_SIZE = 200
const DONUT_CENTER = DONUT_SIZE / 2
const DONUT_STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

function DonutSegment({ percentage, color, offset, strokeWidth }) {
  const dash = (percentage / 100) * CIRCUMFERENCE
  const gap = CIRCUMFERENCE - dash
  return (
    <circle
      cx={DONUT_CENTER}
      cy={DONUT_CENTER}
      r={DONUT_RADIUS}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={`${dash} ${gap}`}
      strokeDashoffset={-offset}
      strokeLinecap="butt"
    />
  )
}

function DonutChart({ summary }) {
  const total = Number(summary?.total || 0)
  const completed = Number(summary?.completed || 0)
  const in_progress = Number(summary?.in_progress || 0)
  const not_completed = Number(summary?.not_completed || 0)

  // Xử lý an toàn khi tổng bằng 0: không chia cho 0, không để NaN
  if (total === 0) {
    return <div className="crp-donut-empty">Chưa có dữ liệu</div>
  }

  // Tính phần trăm các nhóm
  const pCompleted = (completed / total) * 100
  const pInProgress = (in_progress / total) * 100
  const pNotCompleted = (not_completed / total) * 100
  const pOther = Math.max(0, 100 - pCompleted - pInProgress - pNotCompleted)

  // Cumulative offset từ vị trí 12h
  const quarterCirc = CIRCUMFERENCE * 0.25
  const offsetCompleted = quarterCirc
  const offsetInProgress = offsetCompleted + (pCompleted / 100) * CIRCUMFERENCE
  const offsetNotCompleted = offsetInProgress + (pInProgress / 100) * CIRCUMFERENCE
  const offsetOther = offsetNotCompleted + (pNotCompleted / 100) * CIRCUMFERENCE

  const displayRate = Math.round(pCompleted)

  return (
    <div className="crp-donut-wrap">
      <svg
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        aria-label={`Biểu đồ vòng: ${displayRate}% hoàn thành`}
        role="img"
      >
        {/* Background track */}
        <circle
          cx={DONUT_CENTER}
          cy={DONUT_CENTER}
          r={DONUT_RADIUS}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={DONUT_STROKE}
        />
        {/* Phần Other / chưa phân loại */}
        {pOther > 0 && (
          <DonutSegment
            percentage={pOther}
            color="#e2e8f0"
            offset={offsetOther}
            strokeWidth={DONUT_STROKE}
          />
        )}
        {/* Không hoàn thành */}
        {pNotCompleted > 0 && (
          <DonutSegment
            percentage={pNotCompleted}
            color="#ef4444"
            offset={offsetNotCompleted}
            strokeWidth={DONUT_STROKE}
          />
        )}
        {/* Đang thực hiện */}
        {pInProgress > 0 && (
          <DonutSegment
            percentage={pInProgress}
            color="#f59e0b"
            offset={offsetInProgress}
            strokeWidth={DONUT_STROKE}
          />
        )}
        {/* Đã hoàn thành */}
        {pCompleted > 0 && (
          <DonutSegment
            percentage={pCompleted}
            color="#16a34a"
            offset={offsetCompleted}
            strokeWidth={DONUT_STROKE}
          />
        )}

        {/* Text ở giữa vòng */}
        <text
          x={DONUT_CENTER}
          y={DONUT_CENTER - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="crp-donut-pct"
        >
          {displayRate}%
        </text>
        <text
          x={DONUT_CENTER}
          y={DONUT_CENTER + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="crp-donut-sub"
        >
          hoàn thành
        </text>
      </svg>

      {/* Legend */}
      <ul className="crp-legend" aria-label="Chú thích biểu đồ">
        <li className="crp-legend__item">
          <span className="crp-legend__dot" style={{ background: '#16a34a' }} />
          <span className="crp-legend__text">Đã hoàn thành</span>
          <strong className="crp-legend__val">{completed}</strong>
        </li>
        <li className="crp-legend__item">
          <span className="crp-legend__dot" style={{ background: '#f59e0b' }} />
          <span className="crp-legend__text">Đang thực hiện</span>
          <strong className="crp-legend__val">{in_progress}</strong>
        </li>
        <li className="crp-legend__item">
          <span className="crp-legend__dot" style={{ background: '#ef4444' }} />
          <span className="crp-legend__text">Không hoàn thành</span>
          <strong className="crp-legend__val">{not_completed}</strong>
        </li>
        <li className="crp-legend__item">
          <span className="crp-legend__dot" style={{ background: '#e2e8f0' }} />
          <span className="crp-legend__text">Tổng</span>
          <strong className="crp-legend__val">{total}</strong>
        </li>
      </ul>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Mini progress bar (dùng trong bảng theo chương trình)
   ───────────────────────────────────────────────────────────────────────── */
function MiniBar({ value, total, color }) {
  const pct = !total || total <= 0 ? 0 : Math.round((Number(value || 0) / Number(total)) * 100)
  return (
    <div className="crp-mini-bar" title={`${pct}%`}>
      <div
        className="crp-mini-bar__fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page Component
   ───────────────────────────────────────────────────────────────────────── */
export default function CompletionRatePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  /* ── Gọi API lấy dữ liệu thống kê ──
     Quy tắc ESLint (set-state-in-effect):
     Mọi setState trong hàm phải nằm sau dòng await */
  async function loadStats() {
    const res = await getCompletionStats()
    if (res.ok && res.data) {
      setStats(res.data)
      setError(null)
    } else {
      setError(res.data?.message || 'Không thể tải dữ liệu thống kê. Vui lòng thử lại.')
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStats()
  }, [])

  const summary = stats?.summary ?? {
    total: 0,
    completed: 0,
    in_progress: 0,
    not_completed: 0,
    completion_rate: 0,
  }
  const previousPeriod = stats?.previous_period ?? null
  const programs = stats?.programs ?? []

  const comparison = getComparison(summary, previousPeriod)

  function handleRetry() {
    setLoading(true)
    setError(null)
    void loadStats()
  }

  return (
    <div className="crp-page">
      {/* ── Breadcrumb & Header ── */}
      <div className="crp-header">
        <div>
          <div className="crp-crumb">
            <Link to="/hr/dashboard" className="crp-crumb__link">HR</Link>
            <span className="crp-crumb__sep">/</span>
            <span>Tỷ lệ hoàn thành</span>
          </div>
          <h1>Tỷ lệ hoàn thành chương trình</h1>
          <p className="crp-lead">
            Tổng quan tỷ lệ hoàn thành chương trình thực tập — theo dõi chất lượng
            từng kỳ và đánh giá hiệu quả đào tạo.
          </p>
        </div>
      </div>

      {/* ── Trạng thái Loading ── */}
      {loading && (
        <div className="crp-state crp-state--loading" role="status" aria-live="polite">
          <span className="crp-spinner" aria-hidden="true" />
          <span>Đang tải dữ liệu thống kê…</span>
        </div>
      )}

      {/* ── Trạng thái Lỗi ── */}
      {!loading && error && (
        <div className="crp-state crp-state--error" role="alert">
          <span className="crp-state__icon" aria-hidden="true">⚠️</span>
          <div className="crp-state__content">
            <p className="crp-state__msg">{error}</p>
            <button
              type="button"
              className="crp-btn-retry"
              onClick={handleRetry}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* ── Nội dung chính khi đã tải xong và không có lỗi ── */}
      {!loading && !error && (
        <>
          {/* ── KPI Cards Row ── */}
          <section className="crp-kpi-grid" aria-label="Thẻ chỉ số KPI">
            {KPI_CARDS.map((card) => (
              <article key={card.key} className={`crp-kpi crp-kpi--${card.tone}`}>
                <div className="crp-kpi__header">
                  <p className="crp-kpi__label">{card.label}</p>
                  {card.key === 'completed' && (
                    <span
                      className={`crp-comp-tag crp-comp-tag--${comparison.tone}`}
                      title={comparison.hasData ? comparison.text : 'Chưa có dữ liệu so sánh'}
                    >
                      {comparison.hasData ? (
                        <>
                          <span className="crp-comp-tag__arrow">{comparison.arrow}</span>
                          <span>{comparison.badgeText}</span>
                        </>
                      ) : (
                        <span>Chưa có so sánh</span>
                      )}
                    </span>
                  )}
                </div>
                <p className="crp-kpi__value">{card.getValue(summary)}</p>
                <p className="crp-kpi__hint">{card.hint}</p>
              </article>
            ))}
          </section>

          {/* ── Chart + Legend row ── */}
          <section className="crp-chart-section" aria-label="Biểu đồ tỷ lệ hoàn thành">
            <div className="crp-chart-card">
              <h2 className="crp-section-title">Biểu đồ vòng tỷ lệ hoàn thành</h2>
              <p className="crp-section-desc">
                Tổng hợp tất cả chương trình thực tập hiện có trong hệ thống.
              </p>
              <DonutChart summary={summary} />
            </div>

            {/* ── Quick insights ── */}
            <div className="crp-insights-card">
              <h2 className="crp-section-title">Chỉ số nổi bật & So sánh</h2>
              <p className="crp-section-desc">So sánh tỷ lệ và phân tích nhanh với đợt trước.</p>

              <div className="crp-insight-list">
                {/* Tỷ lệ thành công */}
                <div className="crp-insight-item">
                  <div className="crp-insight-item__icon crp-insight-item__icon--green">✓</div>
                  <div className="crp-insight-item__body">
                    <p className="crp-insight-item__label">Tỷ lệ thành công</p>
                    <div className="crp-insight-rate-row">
                      <p className="crp-insight-item__val crp-insight-item__val--green">
                        {formatPercentage(summary.completed, summary.total)}
                      </p>
                      {comparison.hasData ? (
                        <span
                          className={`crp-diff-badge crp-diff-badge--${comparison.tone}`}
                          title={`Kỳ trước: ${comparison.prevRate}%`}
                        >
                          {comparison.arrow} {comparison.badgeText}
                        </span>
                      ) : (
                        <span className="crp-diff-badge crp-diff-badge--muted">
                          Chưa có dữ liệu so sánh
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* So sánh với đợt trước */}
                <div className="crp-insight-item">
                  <div
                    className={`crp-insight-item__icon crp-insight-item__icon--${
                      comparison.tone === 'up'
                        ? 'green'
                        : comparison.tone === 'down'
                        ? 'red'
                        : 'gray'
                    }`}
                  >
                    {comparison.tone === 'up' ? '📈' : comparison.tone === 'down' ? '📉' : '📊'}
                  </div>
                  <div className="crp-insight-item__body">
                    <p className="crp-insight-item__label">
                      So với đợt trước {previousPeriod?.name ? `(${previousPeriod.name})` : ''}
                    </p>
                    {comparison.hasData ? (
                      <p
                        className={`crp-insight-item__val crp-insight-item__val--${
                          comparison.tone === 'up'
                            ? 'green'
                            : comparison.tone === 'down'
                            ? 'red'
                            : 'gray'
                        }`}
                      >
                        <span className="crp-diff-arrow">{comparison.arrow}</span>{' '}
                        <span>{comparison.badgeText}</span>
                        <span className="crp-insight-item__sub">
                          {' '}(kỳ trước: {formatPercentage(previousPeriod.completed, previousPeriod.total)})
                        </span>
                      </p>
                    ) : (
                      <p className="crp-insight-item__val crp-insight-item__val--muted crp-insight-item__val--text">
                        Chưa có dữ liệu so sánh
                      </p>
                    )}
                  </div>
                </div>

                {/* Đang thực hiện */}
                <div className="crp-insight-item">
                  <div className="crp-insight-item__icon crp-insight-item__icon--amber">⏳</div>
                  <div className="crp-insight-item__body">
                    <p className="crp-insight-item__label">Đang thực hiện</p>
                    <p className="crp-insight-item__val crp-insight-item__val--amber">
                      {formatPercentage(summary.in_progress, summary.total)}
                    </p>
                  </div>
                </div>

                {/* Không hoàn thành */}
                <div className="crp-insight-item">
                  <div className="crp-insight-item__icon crp-insight-item__icon--red">✗</div>
                  <div className="crp-insight-item__body">
                    <p className="crp-insight-item__label">Không hoàn thành</p>
                    <p className="crp-insight-item__val crp-insight-item__val--red">
                      {formatPercentage(summary.not_completed, summary.total)}
                    </p>
                  </div>
                </div>

                {/* Số chương trình */}
                <div className="crp-insight-item">
                  <div className="crp-insight-item__icon crp-insight-item__icon--blue">📋</div>
                  <div className="crp-insight-item__body">
                    <p className="crp-insight-item__label">Số chương trình</p>
                    <p className="crp-insight-item__val crp-insight-item__val--blue">
                      {programs.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Per-program breakdown table ── */}
          <section className="crp-table-section" aria-label="Chi tiết theo chương trình">
            <div className="crp-table-card">
              <div className="crp-table-head">
                <h2 className="crp-section-title">Chi tiết theo chương trình</h2>
                <p className="crp-section-desc">Tỷ lệ hoàn thành của từng kỳ thực tập.</p>
              </div>
              <div className="crp-table-wrap">
                <table className="crp-table">
                  <thead>
                    <tr>
                      <th scope="col">Chương trình</th>
                      <th scope="col">Bộ phận</th>
                      <th scope="col">Tổng TTS</th>
                      <th scope="col">Hoàn thành</th>
                      <th scope="col">Đang TH</th>
                      <th scope="col">Không HT</th>
                      <th scope="col" style={{ width: '18%' }}>Tỷ lệ HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          Chưa có dữ liệu chương trình
                        </td>
                      </tr>
                    ) : (
                      programs.map((prog) => {
                        const rate = formatPercentage(prog.completed, prog.total)
                        return (
                          <tr key={prog.id} className="crp-tr">
                            <td>
                              <span className="crp-prog-name">{prog.name}</span>
                            </td>
                            <td>
                              <span className="crp-dept-badge">{prog.department}</span>
                            </td>
                            <td className="crp-num">{prog.total ?? 0}</td>
                            <td className="crp-num crp-num--green">{prog.completed ?? 0}</td>
                            <td className="crp-num crp-num--amber">{prog.in_progress ?? 0}</td>
                            <td className="crp-num crp-num--red">{prog.not_completed ?? 0}</td>
                            <td>
                              <div className="crp-rate-cell">
                                <MiniBar value={prog.completed} total={prog.total} color="#16a34a" />
                                <span className="crp-rate-pct">{rate}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
