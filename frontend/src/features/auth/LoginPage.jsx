import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { dashboardPathForRole } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated && user) {
    const target = location.state?.from || dashboardPathForRole(user.role)
    return <Navigate to={target} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setLoading(true)
    try {
      const result = await login(email.trim(), password)
      if (!result.ok) {
        setError(result.message)
        return
      }

      const dest =
        location.state?.from || dashboardPathForRole(result.user.role)
      navigate(dest, { replace: true })
    } catch {
      setError('Không kết nối được máy chủ. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

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

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="Nhập địa chỉ email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-pass">Mật khẩu</label>
              <input
                id="login-pass"
                type="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="login-meta">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {error ? (
              <p className="login-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
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
