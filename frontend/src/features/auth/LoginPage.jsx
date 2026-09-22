import { Link } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import './LoginPage.css'

function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-page__glow" aria-hidden="true" />

      <div className="login-shell">
        <Link className="login-brand" to="/">
          <img src={logoApp} alt="" width={36} height={36} />
          <span>ICTU Internship</span>
        </Link>

        <div className="login-card">
          <header className="login-header">
            <p className="login-badge">Hệ thống thực tập</p>
            <h1>
              Đăng nhập <span>hệ thống</span>
            </h1>
            <p className="login-lead">
              Truy cập tài khoản để theo dõi hồ sơ, tiến độ và đánh giá thực tập.
            </p>
          </header>

          <form className="login-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="Nhập địa chỉ email"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-pass">Mật khẩu</label>
              <input
                id="login-pass"
                type="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
            </div>

            <div className="login-meta">
              <label className="login-remember">
                <input type="checkbox" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <Link className="login-forgot" to="/login">
                Quên mật khẩu?
              </Link>
            </div>

            <button type="submit" className="login-button">
              Đăng nhập
            </button>

            <p className="login-switch">
              Chưa có tài khoản? <Link to="/register">Đăng ký thực tập</Link>
            </p>
          </form>
        </div>

        <Link className="login-back" to="/">
          ← Về trang chủ
        </Link>
      </div>
    </div>
  )
}

export default LoginPage
