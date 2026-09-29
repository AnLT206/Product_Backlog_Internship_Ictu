import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchUsers, fetchSystemLogs } from '../../api/admin'
import { getInterns } from '../../api/interns'
import { getPrograms } from '../../api/programs'
import './AdminDashboardPage.css'

const ACTIVITY_COLUMNS = ['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Kết quả']

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    usersCount: '0',
    pendingInterns: '0',
    programsCount: '0',
    logsToday: '0',
  })
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadAdminData() {
      setLoading(true)
      try {
        const [hrRes, mentorRes, internRes, pendingRes, progRes, logRes] = await Promise.all([
          fetchUsers({ role: 'hr' }),
          fetchUsers({ role: 'mentor' }),
          fetchUsers({ role: 'intern' }),
          getInterns({ status: 'pending' }),
          getPrograms(),
          fetchSystemLogs({ limit: 5 }),
        ])

        if (!isMounted) return

        let totalUsers = 1 // tính cả admin
        if (hrRes.ok && Array.isArray(hrRes.data)) totalUsers += hrRes.data.length
        if (mentorRes.ok && Array.isArray(mentorRes.data)) totalUsers += mentorRes.data.length
        if (internRes.ok && Array.isArray(internRes.data)) totalUsers += internRes.data.length

        const pendingCount = (pendingRes.ok && pendingRes.data?.total != null)
          ? pendingRes.data.total
          : (pendingRes.ok && pendingRes.data?.items?.length) || 0

        const progCount = (progRes.ok && Array.isArray(progRes.data)) ? progRes.data.length : 0

        let logs = []
        let logCountToday = 0
        if (logRes.ok && Array.isArray(logRes.data)) {
          logs = logRes.data
          const todayStr = new Date().toISOString().slice(0, 10)
          logCountToday = logs.filter(
            (l) => l.created_at && l.created_at.startsWith(todayStr)
          ).length
        }

        setStats({
          usersCount: String(totalUsers),
          pendingInterns: String(pendingCount),
          programsCount: String(progCount),
          logsToday: String(logCountToday),
        })
        setRecentLogs(logs)
      } catch (err) {
        console.error('Lỗi tải dữ liệu admin dashboard:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadAdminData()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="admin-dash">
      <header className="admin-dash__header">
        <div>
          <nav className="admin-dash__crumb" aria-label="Breadcrumb">
            <span>Admin</span>
            <span aria-hidden="true">/</span>
            <span>Tổng quan</span>
          </nav>
          <h1>Xin chào, {user?.full_name || 'Quản trị viên'} 👋</h1>
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
        <article className="admin-stat admin-stat--neutral">
          <p className="admin-stat__label">Người dùng</p>
          <p className="admin-stat__value">{stats.usersCount}</p>
          <p className="admin-stat__hint">Tổng tài khoản hệ thống</p>
        </article>

        <article className="admin-stat admin-stat--warn">
          <p className="admin-stat__label">TTS chờ duyệt</p>
          <p className="admin-stat__value">{stats.pendingInterns}</p>
          <p className="admin-stat__hint">Hồ sơ đang chờ xử lý</p>
        </article>

        <article className="admin-stat admin-stat--neutral">
          <p className="admin-stat__label">Chương trình</p>
          <p className="admin-stat__value">{stats.programsCount}</p>
          <p className="admin-stat__hint">Chương trình thực tập</p>
        </article>

        <article className="admin-stat admin-stat--info">
          <p className="admin-stat__label">Nhật ký hôm nay</p>
          <p className="admin-stat__value">{stats.logsToday}</p>
          <p className="admin-stat__hint">Thao tác trong ngày</p>
        </article>
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
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={ACTIVITY_COLUMNS.length}>
                    <div className="admin-empty">
                      <strong>Chưa có hoạt động</strong>
                      <span>Các thao tác mới sẽ xuất hiện tại đây.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : '—'}</td>
                    <td><strong>{log.actor_name || log.actor_email || `User #${log.user_id}`}</strong></td>
                    <td><span className="admin-badge">{log.action}</span></td>
                    <td>{log.target || log.details || '—'}</td>
                    <td><span className="admin-badge admin-badge--success">{log.status || 'OK'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
