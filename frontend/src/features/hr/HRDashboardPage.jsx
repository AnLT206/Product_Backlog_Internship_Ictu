import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './HRDashboardPage.css'

const STATS = [
  { label: 'Thực tập sinh', value: '124', hint: 'Tổng số TTS hiện tại', tone: 'primary' },
  { label: 'Chờ duyệt', value: '12', hint: 'Hồ sơ chờ phê duyệt', tone: 'warn' },
  { label: 'Chương trình', value: '8', hint: 'Chương trình đang mở', tone: 'neutral' },
  { label: 'Mentor', value: '35', hint: 'Mentor đang hoạt động', tone: 'info' },
]

const ACTIVITY_COLUMNS = ['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Kết quả']

export default function HRDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="hr-dash-page">
      <div className="hr-dash__glow" />
      <div className="hr-dash-shell">
        <header className="hr-dash__header">
          <Link to="/" className="hr-dash__brand">
            <img src="/ictu-logo.png" alt="ICTU" />
            <span>Hệ thống Quản lý Thực tập</span>
          </Link>
          <div>
            <h1>Xin chào, {user?.full_name || 'HR Manager'}</h1>
            <p className="hr-dash__lead">
              Quản lý chương trình thực tập, theo dõi hồ sơ thực tập sinh và điều phối mentor.
            </p>
          </div>
          <div className="hr-dash__header-actions">
            <Link className="hr-dash__btn hr-dash__btn--ghost" to="/hr/interns">
              Danh sách TTS
            </Link>
            <Link className="hr-dash__btn hr-dash__btn--ghost" to="/hr/programs">
              Chương trình
            </Link>
            <Link className="hr-dash__btn hr-dash__btn--ghost" to="/hr/mentors">
              Mentor
            </Link>
          </div>
        </header>

        <section className="hr-dash__stats" aria-label="Thống kê nhanh">
          {STATS.map((item) => (
            <article key={item.label} className={`hr-stat hr-stat--${item.tone}`}>
              <p className="hr-stat__label">{item.label}</p>
              <p className="hr-stat__value">{item.value}</p>
              <p className="hr-stat__hint">{item.hint}</p>
            </article>
          ))}
        </section>

        <section className="hr-dash__panel hr-dash__panel--stretch">
          <div className="hr-dash__panel-head">
            <div>
              <h2>Hoạt động gần đây</h2>
              <p className="hr-dash__panel-desc">Các thao tác mới nhất trong bộ phận HR.</p>
            </div>
          </div>

          <div className="hr-table-wrap">
            <table className="hr-table">
              <thead>
                <tr>
                  {ACTIVITY_COLUMNS.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>10:25, Hôm nay</td>
                  <td>Nguyễn Văn A</td>
                  <td>Duyệt hồ sơ</td>
                  <td>Trần Thị B</td>
                  <td><strong style={{color: '#16a34a'}}>Thành công</strong></td>
                </tr>
                <tr>
                  <td>09:15, Hôm nay</td>
                  <td>Lê Văn C</td>
                  <td>Tạo chương trình</td>
                  <td>Kỳ Thu 2026</td>
                  <td><strong style={{color: '#16a34a'}}>Thành công</strong></td>
                </tr>
                <tr>
                  <td>16:45, Hôm qua</td>
                  <td>Nguyễn Văn A</td>
                  <td>Từ chối hồ sơ</td>
                  <td>Phạm Văn D</td>
                  <td><strong style={{color: '#dc2626'}}>Đã từ chối</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
