import { useAuth } from '../../context/AuthContext'
import './InternDashboardPage.css'

const STATS = [
  { label: 'Trạng thái hồ sơ', value: 'Chờ duyệt', hint: 'Hồ sơ đang được HR xem xét', tone: 'warn', icon: '📋' },
  { label: 'Chương trình', value: 'Chưa có', hint: 'Chưa được phân công', tone: 'neutral', icon: '📁' },
  { label: 'Báo cáo tuần', value: '0/0', hint: 'Không có báo cáo chờ nộp', tone: 'info', icon: '📊' },
  { label: 'Đánh giá', value: '--', hint: 'Chưa có đánh giá', tone: 'primary', icon: '⭐' },
]

const PROGRESS_STEPS = [
  { label: 'Nộp hồ sơ', done: true },
  { label: 'Chờ duyệt', active: true },
  { label: 'Được phân công', done: false },
  { label: 'Thực tập', done: false },
  { label: 'Đánh giá', done: false },
]

const ACTIVITY_ROWS = [
  { time: '10:00, Hôm nay', action: 'Đăng ký tài khoản thực tập sinh', status: 'success', statusLabel: 'Thành công' },
  { time: '10:05, Hôm nay', action: 'Hệ thống tiếp nhận hồ sơ', status: 'pending', statusLabel: 'Đang xử lý' },
]

export default function InternDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="intern-dash-page">

      {/* ── HERO ── */}
      <header className="intern-dash__header">
        <div className="intern-dash__hero-body">
          <div>
            <span className="intern-dash__badge">Thực tập sinh</span>
            <h1>Xin chào, {user?.full_name || 'Thực tập sinh'} 👋</h1>
            <p className="intern-dash__lead">
              Theo dõi hồ sơ và quá trình thực tập của bạn trên hệ thống.
            </p>
          </div>
          <div className="intern-dash__header-actions">
            <nav className="intern-dash__crumb" aria-label="Breadcrumb">
              <span>Thực tập sinh</span>
              <span aria-hidden="true">/</span>
              <span>Tổng quan</span>
            </nav>
          </div>
        </div>
      </header>

      {/* ── B. THỐNG KÊ ── */}
      <section className="intern-dash__stats" aria-label="Thống kê nhanh">
        {STATS.map((item) => (
          <article key={item.label} className={`intern-stat intern-stat--${item.tone}`}>
            <span className="intern-stat__icon" aria-hidden="true">{item.icon}</span>
            <p className="intern-stat__label">{item.label}</p>
            <p className="intern-stat__value">{item.value}</p>
            <p className="intern-stat__hint">{item.hint}</p>
          </article>
        ))}
      </section>

      {/* ── C. TIẾN TRÌNH ── */}
      <section className="intern-dash__panel" aria-label="Tiến trình thực tập">
        <div className="intern-dash__panel-head">
          <div>
            <h2>Tiến trình thực tập</h2>
            <p className="intern-dash__panel-desc">Các giai đoạn trong chương trình thực tập của bạn.</p>
          </div>
        </div>
        <div className="intern-progress">
          {PROGRESS_STEPS.map((step, idx) => (
            <div
              key={step.label}
              className={
                `intern-progress__step` +
                (step.done ? ' intern-progress__step--done' : '') +
                (step.active ? ' intern-progress__step--active' : '')
              }
            >
              <div className="intern-progress__dot">
                {step.done ? '✓' : idx + 1}
              </div>
              {idx < PROGRESS_STEPS.length - 1 && (
                <div className={`intern-progress__line${step.done ? ' intern-progress__line--done' : ''}`} />
              )}
              <span className="intern-progress__label">{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── D. TRUY CẬP NHANH ── */}
      <section className="intern-dash__panel" aria-label="Truy cập nhanh">
        <div className="intern-dash__panel-head">
          <div>
            <h2>Truy cập nhanh</h2>
            <p className="intern-dash__panel-desc">Các tác vụ phổ biến dành cho bạn.</p>
          </div>
        </div>
        <div className="intern-quick-grid">
          <a className="intern-quick-card" href="/intern/documents/upload">
            <span className="intern-quick-card__icon" aria-hidden="true">📄</span>
            <span className="intern-quick-card__title">CV / Đơn xin thực tập</span>
            <span className="intern-quick-card__desc">Tải lên hoặc cập nhật hồ sơ của bạn</span>
          </a>
          <a className="intern-quick-card" href="/intern/reports">
            <span className="intern-quick-card__icon" aria-hidden="true">📝</span>
            <span className="intern-quick-card__title">Báo cáo tuần</span>
            <span className="intern-quick-card__desc">Nộp và xem báo cáo thực tập</span>
          </a>
          <a className="intern-quick-card" href="/intern/schedule">
            <span className="intern-quick-card__icon" aria-hidden="true">📅</span>
            <span className="intern-quick-card__title">Lịch thực tập</span>
            <span className="intern-quick-card__desc">Xem lịch và kế hoạch của bạn</span>
          </a>
          <a className="intern-quick-card" href="/intern/leave">
            <span className="intern-quick-card__icon" aria-hidden="true">🗒️</span>
            <span className="intern-quick-card__title">Đơn xin nghỉ</span>
            <span className="intern-quick-card__desc">Gửi đơn và theo dõi tình trạng</span>
          </a>
        </div>
      </section>

      {/* ── E. HOẠT ĐỘNG GẦN ĐÂY ── */}
      <section className="intern-dash__panel intern-dash__panel--stretch" aria-label="Hoạt động gần đây">
        <div className="intern-dash__panel-head">
          <div>
            <h2>Hoạt động gần đây</h2>
            <p className="intern-dash__panel-desc">Tiến trình và cập nhật hồ sơ của bạn.</p>
          </div>
        </div>
        <div className="intern-table-wrap">
          <table className="intern-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Hành động</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITY_ROWS.map((row) => (
                <tr key={row.time + row.action}>
                  <td className="intern-table__time">{row.time}</td>
                  <td>{row.action}</td>
                  <td>
                    <span className={`intern-status-badge intern-status-badge--${row.status}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
