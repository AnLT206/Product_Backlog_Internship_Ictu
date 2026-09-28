import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './AdminDashboardPage.css'

const STATS = [
  { label: 'Người dùng', value: '—', hint: 'Tổng tài khoản hệ thống', tone: 'neutral' },
  { label: 'TTS chờ duyệt', value: '—', hint: 'Hồ sơ đang chờ xử lý', tone: 'warn' },
  { label: 'Chương trình', value: '—', hint: 'Chương trình thực tập', tone: 'neutral' },
  { label: 'Nhật ký hôm nay', value: '—', hint: 'Thao tác trong ngày', tone: 'info' },
]

const ACTIVITY_COLUMNS = ['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Kết quả']

export default function AdminDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="admin-dash">
      <header className="admin-dash__header">
        <div>
          <nav className="admin-dash__crumb" aria-label="Breadcrumb">
            <span>Admin</span>
            <span aria-hidden="true">/</span>
            <span>Tổng quan</span>
          </nav>
          <h1>Xin chào, {user?.full_name || 'Admin'}</h1>
          <p className="admin-dash__lead">
            Quản trị người dùng và theo dõi hoạt động hệ thống thực tập ICTU.
          </p>
        </div>
        <div className="admin-dash__header-actions">
          <Link className="admin-dash__btn admin-dash__btn--ghost" to="/admin/users">
            Người dùng
          </Link>
          <Link className="admin-dash__btn admin-dash__btn--ghost" to="/admin/system-logs">
            Nhật ký
          </Link>
          <Link className="admin-dash__btn admin-dash__btn--primary" to="/admin/users/new">
            + Tạo tài khoản
          </Link>
        </div>
      </header>

      <section className="admin-dash__stats" aria-label="Thống kê nhanh">
        {STATS.map((item) => (
          <article key={item.label} className={`admin-stat admin-stat--${item.tone}`}>
            <p className="admin-stat__label">{item.label}</p>
            <p className="admin-stat__value">{item.value}</p>
            <p className="admin-stat__hint">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="admin-dash__panel admin-dash__panel--stretch">
        <div className="admin-dash__panel-head">
          <div>
            <h2>Hoạt động gần đây</h2>
            <p className="admin-dash__panel-desc">Các thao tác mới nhất trên hệ thống.</p>
          </div>
          <Link className="admin-dash__text-link" to="/admin/system-logs">
            Xem tất cả →
          </Link>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {ACTIVITY_COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={ACTIVITY_COLUMNS.length}>
                  <div className="admin-empty">
                    <strong>Chưa có hoạt động</strong>
                    <span>Các thao tác mới sẽ xuất hiện tại đây.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
