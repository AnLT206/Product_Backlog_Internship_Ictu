import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './InternDashboardPage.css'

const STATS = [
  { label: 'Trạng thái hồ sơ', value: 'Chờ duyệt', hint: 'Hồ sơ đang được HR xem xét', tone: 'warn' },
  { label: 'Chương trình', value: 'Chưa có', hint: 'Chưa được phân công', tone: 'neutral' },
  { label: 'Báo cáo tuần', value: '0/0', hint: 'Không có báo cáo chờ nộp', tone: 'info' },
  { label: 'Đánh giá', value: '--', hint: 'Chưa có đánh giá', tone: 'primary' },
]

const ACTIVITY_COLUMNS = ['Thời gian', 'Hành động', 'Trạng thái']

export default function InternDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="intern-dash-page">
      <div className="intern-dash__glow" aria-hidden="true" />
      <div className="intern-dash-shell">
        <header className="intern-dash__header">
          <Link to="/" className="intern-dash__brand">
            <img src="/ictu-logo.png" alt="ICTU" />
            <span>Hệ thống Quản lý Thực tập</span>
          </Link>
          <div>
            <h1>Xin chào, {user?.full_name || 'Thực tập sinh'}</h1>
            <p className="intern-dash__lead">
              Đăng ký, nộp hồ sơ, chấm công, báo cáo, xem lịch và quyền lợi của bạn trên hệ thống.
            </p>
          </div>
          <div className="intern-dash__header-actions">
            <Link className="intern-dash__btn intern-dash__btn--primary" to="/intern/documents/upload">
              Cập nhật CV / Đơn xin thực tập
            </Link>
          </div>
        </header>

        <section className="intern-dash__stats" aria-label="Thống kê nhanh">
          {STATS.map((item) => (
            <article key={item.label} className={`intern-stat intern-stat--${item.tone}`}>
              <p className="intern-stat__label">{item.label}</p>
              <p className="intern-stat__value">{item.value}</p>
              <p className="intern-stat__hint">{item.hint}</p>
            </article>
          ))}
        </section>

        <section className="intern-dash__panel intern-dash__panel--stretch">
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
                  {ACTIVITY_COLUMNS.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>10:00, Hôm nay</td>
                  <td>Đăng ký tài khoản thực tập sinh</td>
                  <td><strong style={{color: '#16a34a'}}>Thành công</strong></td>
                </tr>
                <tr>
                  <td>10:05, Hôm nay</td>
                  <td>Hệ thống tiếp nhận hồ sơ</td>
                  <td><strong style={{color: '#f59e0b'}}>Đang xử lý</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
