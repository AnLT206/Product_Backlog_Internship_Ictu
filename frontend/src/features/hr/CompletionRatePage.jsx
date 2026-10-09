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
 * Dữ liệu MOCK — Task 2 sẽ gọi API thật.
 * Tên trường khớp với backend ProgramMember / InternProfile schema:
 *   total, completed, in_progress, not_completed, completion_rate
 */

import { Link } from 'react-router-dom'
import './CompletionRatePage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Mock data (Task 2 thay bằng gọi API /api/hr/programs/stats hoặc tương đương)
   ───────────────────────────────────────────────────────────────────────── */
const MOCK_SUMMARY = {
  total: 124,
  completed: 87,
  in_progress: 29,
  not_completed: 8,
  completion_rate: 70, // phần trăm = completed / total * 100
}

const MOCK_PROGRAMS = [
  {
    id: 1,
    name: 'Kỳ thực tập Hè 2026',
    department: 'Công nghệ Thông tin',
    total: 40,
    completed: 32,
    in_progress: 7,
    not_completed: 1,
  },
  {
    id: 2,
    name: 'Kỳ thực tập Thu 2025',
    department: 'Khoa học Dữ liệu',
    total: 28,
    completed: 25,
    in_progress: 3,
    not_completed: 0,
  },
  {
    id: 3,
    name: 'Kỳ thực tập Xuân 2025',
    department: 'Kỹ thuật Phần mềm',
    total: 35,
    completed: 22,
    in_progress: 10,
    not_completed: 3,
  },
  {
    id: 4,
    name: 'Kỳ thực tập Hè 2025',
    department: 'Trí tuệ Nhân tạo',
    total: 21,
    completed: 8,
    in_progress: 9,
    not_completed: 4,
  },
]

/* ─────────────────────────────────────────────────────────────────────────────
   KPI Card definitions
   ───────────────────────────────────────────────────────────────────────── */
const KPI_CARDS = [
  {
    key: 'total',
    label: 'Tổng thực tập sinh',
    hint: 'Toàn bộ TTS trong hệ thống',
    tone: 'primary',
    getValue: (s) => s.total,
  },
  {
    key: 'completed',
    label: 'Đã hoàn thành',
    hint: 'Kết thúc chương trình thành công',
    tone: 'success',
    getValue: (s) => s.completed,
  },
  {
    key: 'in_progress',
    label: 'Đang thực hiện',
    hint: 'Hiện đang trong chương trình',
    tone: 'warn',
    getValue: (s) => s.in_progress,
  },
  {
    key: 'not_completed',
    label: 'Không hoàn thành',
    hint: 'Rời chương trình hoặc thất bại',
    tone: 'danger',
    getValue: (s) => s.not_completed,
  },
]

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
  const { total, completed, in_progress, not_completed } = summary
  if (total === 0) return <div className="crp-donut-empty">Chưa có dữ liệu</div>

  // Tính phần trăm
  const pCompleted = (completed / total) * 100
  const pInProgress = (in_progress / total) * 100
  const pNotCompleted = (not_completed / total) * 100
  const pOther = Math.max(0, 100 - pCompleted - pInProgress - pNotCompleted)

  // Cumulative offset (theo chiều kim đồng hồ từ top, strokeDashoffset âm = xoay ngược chiều kim)
  // SVG gốc bắt đầu từ 3h, ta offset 90 độ về 12h
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
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
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
  const summary = MOCK_SUMMARY
  const programs = MOCK_PROGRAMS

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

      {/* ── KPI Cards Row ── */}
      <section className="crp-kpi-grid" aria-label="Thẻ chỉ số KPI">
        {KPI_CARDS.map((card) => (
          <article key={card.key} className={`crp-kpi crp-kpi--${card.tone}`}>
            <p className="crp-kpi__label">{card.label}</p>
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
          <h2 className="crp-section-title">Chỉ số nổi bật</h2>
          <p className="crp-section-desc">So sánh và phân tích nhanh.</p>

          <div className="crp-insight-list">
            <div className="crp-insight-item">
              <div className="crp-insight-item__icon crp-insight-item__icon--green">✓</div>
              <div>
                <p className="crp-insight-item__label">Tỷ lệ thành công</p>
                <p className="crp-insight-item__val crp-insight-item__val--green">
                  {Math.round((summary.completed / summary.total) * 100)}%
                </p>
              </div>
            </div>
            <div className="crp-insight-item">
              <div className="crp-insight-item__icon crp-insight-item__icon--amber">⏳</div>
              <div>
                <p className="crp-insight-item__label">Đang thực hiện</p>
                <p className="crp-insight-item__val crp-insight-item__val--amber">
                  {Math.round((summary.in_progress / summary.total) * 100)}%
                </p>
              </div>
            </div>
            <div className="crp-insight-item">
              <div className="crp-insight-item__icon crp-insight-item__icon--red">✗</div>
              <div>
                <p className="crp-insight-item__label">Không hoàn thành</p>
                <p className="crp-insight-item__val crp-insight-item__val--red">
                  {Math.round((summary.not_completed / summary.total) * 100)}%
                </p>
              </div>
            </div>
            <div className="crp-insight-item">
              <div className="crp-insight-item__icon crp-insight-item__icon--blue">📋</div>
              <div>
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
                {programs.map((prog) => {
                  const rate = prog.total === 0
                    ? 0
                    : Math.round((prog.completed / prog.total) * 100)
                  return (
                    <tr key={prog.id} className="crp-tr">
                      <td>
                        <span className="crp-prog-name">{prog.name}</span>
                      </td>
                      <td>
                        <span className="crp-dept-badge">{prog.department}</span>
                      </td>
                      <td className="crp-num">{prog.total}</td>
                      <td className="crp-num crp-num--green">{prog.completed}</td>
                      <td className="crp-num crp-num--amber">{prog.in_progress}</td>
                      <td className="crp-num crp-num--red">{prog.not_completed}</td>
                      <td>
                        <div className="crp-rate-cell">
                          <MiniBar value={prog.completed} total={prog.total} color="#16a34a" />
                          <span className="crp-rate-pct">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
