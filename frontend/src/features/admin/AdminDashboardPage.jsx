import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './AdminDashboardPage.css'

const STATS = [
  { label: 'Người dùng', value: '—', hint: 'Tổng tài khoản hệ thống' },
  { label: 'TTS chờ duyệt', value: '—', hint: 'Hồ sơ status = pending' },
  { label: 'Chương trình', value: '—', hint: 'Internship programs' },
  { label: 'Nhật ký hôm nay', value: '—', hint: 'System logs CREATE/UPDATE/DELETE' },
]

const ACTIONS = [
  {
    title: 'Tạo tài khoản nội bộ',
    desc: 'Thêm HR, mentor hoặc TTS do admin tạo.',
    to: '/admin/users/new',
  },
  {
    title: 'Xem nhật ký hệ thống',
    desc: 'Theo dõi thao tác Thêm / Sửa / Xóa trên hệ thống.',
    to: '/admin/system-logs',
  },
]

export default function AdminDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="admin-dash">
      <header className="admin-dash__header">
        <div>
          <p className="admin-dash__eyebrow">Bảng điều khiển</p>
          <h1>Xin chào, {user?.full_name || 'Admin'}</h1>
          <p className="admin-dash__lead">
            Quản trị người dùng, phân quyền và theo dõi hoạt động hệ thống thực tập ICTU.
          </p>
        </div>
        <Link className="admin-dash__cta" to="/admin/users/new">
          + Tạo tài khoản
        </Link>
      </header>

      <section className="admin-dash__stats" aria-label="Thống kê nhanh">
        {STATS.map((item) => (
          <article key={item.label} className="admin-stat">
            <p className="admin-stat__label">{item.label}</p>
            <p className="admin-stat__value">{item.value}</p>
            <p className="admin-stat__hint">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="admin-dash__panel">
        <h2>Thao tác nhanh</h2>
        <div className="admin-dash__actions">
          {ACTIONS.map((action) => (
            <Link key={action.to} className="admin-action" to={action.to}>
              <strong>{action.title}</strong>
              <span>{action.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
