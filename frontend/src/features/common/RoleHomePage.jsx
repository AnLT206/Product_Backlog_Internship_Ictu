import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './RoleHomePage.css'

/** Dashboard tạm cho role chưa có UI đầy đủ. */
export default function RoleHomePage({ roleLabel }) {
  const { user, logout } = useAuth()

  return (
    <div className="role-home">
      <div className="role-home__card">
        <p className="role-home__badge">{roleLabel}</p>
        <h1>Xin chào, {user?.full_name || user?.email}</h1>
        <p>
          Dashboard dành cho vai trò <strong>{user?.role}</strong> đang được hoàn thiện.
          Bạn đã đăng nhập thành công.
        </p>
        <div className="role-home__actions">
          <Link to="/">Về trang chủ</Link>
          <button type="button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  )
}
