import { Link } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import './RegisterPage.css'

function RegisterPage() {
  return (
    <div className="register-page">
      <div className="register-page__glow" aria-hidden="true" />

      <div className="register-shell">
        <Link className="register-brand" to="/">
          <img src={logoApp} alt="" width={36} height={36} />
          <span>ICTU Internship</span>
        </Link>

        <div className="register-card">
          <header className="register-header">
            <p className="register-badge">Thực tập sinh</p>
            <h1>
              Đăng ký <span>thực tập</span>
            </h1>
            <p className="register-lead">
              Tạo tài khoản TTS để nộp hồ sơ và theo dõi quá trình thực tập trên hệ thống.
            </p>
          </header>

          <form className="register-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="reg-name">Họ và tên</label>
              <input id="reg-name" type="text" placeholder="Nhập họ và tên" autoComplete="name" />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                placeholder="Nhập địa chỉ email"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Số điện thoại</label>
              <input
                id="reg-phone"
                type="tel"
                placeholder="Nhập số điện thoại"
                autoComplete="tel"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-pass">Mật khẩu</label>
                <input
                  id="reg-pass"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-pass2">Xác nhận mật khẩu</label>
                <input
                  id="reg-pass2"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <label className="terms">
              <input type="checkbox" />
              <span>Tôi đồng ý với điều khoản sử dụng</span>
            </label>

            <button type="submit" className="register-button">
              Đăng ký thực tập
            </button>

            <p className="login-link">
              Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </p>
          </form>
        </div>

        <Link className="register-back" to="/">
          ← Về trang chủ
        </Link>
      </div>
    </div>
  )
}

export default RegisterPage
