import { Link } from 'react-router-dom'
import './NotFoundPage.css'

function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1>Trang chưa sẵn sàng</h1>
      <p className="not-found__desc">
        Đường dẫn này chưa được triển khai hoặc không tồn tại. Quay lại trang chủ hoặc đăng ký thực tập.
      </p>
      <div className="not-found__actions">
        <Link className="not-found__btn not-found__btn--primary" to="/">
          Về trang chủ
        </Link>
        <Link className="not-found__btn not-found__btn--ghost" to="/register">
          Đăng ký thực tập
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
