import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './NotFoundPage.css'

function NotFoundPage() {
  const location = useLocation()
  const auth = useAuth()

  const isAdmin =
    location.pathname.startsWith('/admin') || auth?.user?.role === 'admin'

  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1>{isAdmin ? 'Hệ thống chưa cập nhật chức năng' : 'Trang chưa sẵn sàng'}</h1>
      <p className="not-found__desc">
        {isAdmin
          ? 'Đường dẫn này chưa được triển khai hoặc không tồn tại. Vui lòng quay lại bảng điều khiển quản trị.'
          : 'Đường dẫn này chưa được triển khai hoặc không tồn tại. Quay lại trang chủ hoặc đăng ký thực tập.'}
      </p>
      <div className="not-found__actions">
        {isAdmin ? (
          <Link className="not-found__btn not-found__btn--primary" to="/admin/dashboard">
            Về trang chủ
          </Link>
        ) : (
          <>
            <Link className="not-found__btn not-found__btn--primary" to="/">
              Về trang chủ
            </Link>
            <Link className="not-found__btn not-found__btn--ghost" to="/register">
              Đăng ký thực tập
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default NotFoundPage

