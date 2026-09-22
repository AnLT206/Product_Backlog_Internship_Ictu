import './RegisterPage.css'

function RegisterPage() {
  return (
    <div className="register-page">
      <div className="register-card">

        <div className="register-header">
          <div className="user-icon">👤</div>

          <h1>Đăng ký tài khoản ứng viên</h1>

          <p>Tạo tài khoản để quản lý hồ sơ của bạn</p>
        </div>

        <div className="register-form">

          <div className="form-group">
            <label>Họ và tên</label>
            <input
              type="text"
              placeholder="Nhập họ và tên"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Nhập địa chỉ email"
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>
            <input
              type="text"
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu"
            />
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          <div className="terms">
            <input type="checkbox" />
            <span>Tôi đồng ý với điều khoản sử dụng</span>
          </div>

          <button className="register-button">
            ĐĂNG KÝ
          </button>

          <div className="login-link">
            Đã có tài khoản?
            <a href="#"> Đăng nhập</a>
          </div>

        </div>
      </div>
    </div>
  )
}

export default RegisterPage
