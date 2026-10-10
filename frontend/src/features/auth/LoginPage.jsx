import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import { dashboardPathForRole } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import './LoginPage.css'

// Cấu hình hiển thị nút đăng nhập nhanh
const SHOW_QUICK_LOGIN = true

const QUICK_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@ictu.edu.vn',
    password: 'Admin@123',
    variant: 'admin',
  },
  {
    role: 'HR',
    email: 'hr@ictu.edu.vn',
    password: 'Hr@123',
    variant: 'hr',
  },
  {
    role: 'Mentor',
    email: 'mentor@ictu.edu.vn',
    password: 'Mentor@123',
    variant: 'mentor',
  },
  {
    role: 'TTS 1 (An)',
    email: 'intern@ictu.edu.vn',
    password: 'Intern@123',
    variant: 'intern',
  },
  {
    role: 'TTS 2 (Nam)',
    email: 'tts02@student.ictu.edu.vn',
    password: 'Intern@123',
    variant: 'intern',
  },
  {
    role: 'TTS 3 (Phương)',
    email: 'tts03@student.ictu.edu.vn',
    password: 'Intern@123',
    variant: 'intern',
  },
  {
    role: 'TTS 4 (Đức)',
    email: 'tts04@student.ictu.edu.vn',
    password: 'Intern@123',
    variant: 'intern',
  },
  {
    role: 'TTS 5 (Yến)',
    email: 'tts05@student.ictu.edu.vn',
    password: 'Intern@123',
    variant: 'intern',
  },
  {
    role: 'Ứng viên',
    email: 'ungvien@ictu.edu.vn',
    password: 'Intern@123',
    variant: 'applicant',
  },
]

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickLoadingRole, setQuickLoadingRole] = useState('')

  if (isAuthenticated && user) {
    const roleDest = dashboardPathForRole(user.role)
    const target =
      location.state?.from && location.state.from.startsWith(`/${user.role}`)
        ? location.state.from
        : roleDest
    return <Navigate to={target} replace />
  }

  async function performLogin(targetEmail, targetPassword, forcedDest) {
    setError('')
    setLoading(true)

    const isApplicantAccount = targetEmail.trim().toLowerCase().includes('ungvien')
    if (isApplicantAccount) {
      try {
        localStorage.removeItem('applicant_onboarded')
        localStorage.removeItem('applicant_pending_contract')
        sessionStorage.removeItem('applicant_reject_modal_dismissed')
      } catch {}
    }

    try {
      const result = await login(targetEmail.trim(), targetPassword)
      if (!result.ok) {
        setError(result.message)
        return
      }

      const roleDest = dashboardPathForRole(result.user.role)
      let dest = forcedDest || roleDest
      if (!forcedDest && location.state?.from) {
        const fromPath = location.state.from
        if (fromPath.startsWith(`/${result.user.role}`)) {
          dest = fromPath
        }
      }
      navigate(dest, { replace: true })
    } catch {
      setError('Không kết nối được máy chủ. Thử lại sau.')
    } finally {
      setLoading(false)
      setQuickLoadingRole('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    await performLogin(email, password)
  }

  async function handleQuickLogin(account) {
    setEmail(account.email)
    setPassword(account.password)
    setQuickLoadingRole(account.role)
    await performLogin(account.email, account.password)
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
              {loading && !quickLoadingRole ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>

            {SHOW_QUICK_LOGIN && (
              <>
                {/* ── Nút đăng nhập nhanh các vai trò ── */}
                <div className="login-divider">
                  <span>Hoặc đăng nhập nhanh</span>
                </div>

                <div className="login-quick-actions" aria-label="Đăng nhập nhanh các vai trò">
                  {QUICK_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.role}
                      type="button"
                      className={`login-quick-btn login-quick-btn--${acc.variant}`}
                      onClick={() => handleQuickLogin(acc)}
                      disabled={loading}
                      title={`Đăng nhập nhanh với quyền ${acc.role}`}
                    >
                      <span className="login-quick-btn__name">{acc.role}</span>
                      {quickLoadingRole === acc.role && (
                        <span className="login-quick-btn__spinner" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

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
