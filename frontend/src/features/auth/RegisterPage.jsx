/**
 * RegisterPage.jsx
 * Route: /register
 *
 * US: "Là thực tập sinh, tôi muốn đăng ký tài khoản và nộp hồ sơ trực tuyến
 *      để tham gia chương trình thực tập."
 *
 * Cấu trúc giao diện (JSX class names) GIỮ NGUYÊN từ bản tĩnh ban đầu.
 * Những gì được BỔ SUNG ở task này:
 *   1. State form (controlled inputs) + state errors.
 *   2. Validate phía FE trước khi gọi API (đồng bộ rule docs/api.md).
 *   3. reCAPTCHA v2 Checkbox — site key từ VITE_RECAPTCHA_SITE_KEY.
 *   4. Gọi registerIntern() (POST /api/auth/register thật — không mock).
 *   5. Xử lý response 201 / 409 / 422 theo docs/api.md.
 *
 * TODO trước khi deploy:
 *   - Điền VITE_RECAPTCHA_SITE_KEY thật vào .env (xem .env.example).
 *   - Backend cần CORS cho origin frontend production.
 *
 * KHÔNG dùng useEffect → không có nguy cơ react-hooks/set-state-in-effect.
 */

import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { registerIntern } from '../../api/auth';
import logoApp from '../../assets/logo_app.png';
import './RegisterPage.css';

/* ─────────────────────────────────────────────
   reCAPTCHA site key
   Đọc từ env — KHÔNG hardcode giá trị thật/giả vào code.
   Nếu env chưa được cấu hình, hiện warning nhưng không crash.
───────────────────────────────────────────── */
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

/* ─────────────────────────────────────────────
   Regex helpers (đồng bộ backend)
───────────────────────────────────────────── */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0[0-9]{8,10}|\+84[0-9]{8,10})$/;

/* ─────────────────────────────────────────────
   Validate toàn bộ form — trả về object errors
   (key = tên field, value = thông báo lỗi)
   Chỉ validate các field bắt buộc theo docs/api.md.
───────────────────────────────────────────── */
function validateForm(form, captchaDone, termChecked) {
  const errors = {};

  // full_name — bắt buộc
  const name = form.full_name.trim();
  if (!name)            errors.full_name = 'Vui lòng nhập họ và tên.';
  else if (name.length > 100) errors.full_name = 'Họ và tên tối đa 100 ký tự.';

  // email — bắt buộc, đúng định dạng
  const email = form.email.trim();
  if (!email)               errors.email = 'Vui lòng nhập email.';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Email không đúng định dạng.';

  // phone_number — tuỳ chọn, nhưng nếu nhập phải đúng định dạng
  const phone = form.phone_number.trim().replace(/[\s-]/g, '');
  if (phone && !PHONE_REGEX.test(phone))
    errors.phone_number = 'Số điện thoại phải bắt đầu bằng "0" (9–11 số) hoặc "+84".';

  // password — bắt buộc, tối thiểu 8 ký tự
  if (!form.password)          errors.password = 'Vui lòng nhập mật khẩu.';
  else if (form.password.length < 8) errors.password = 'Mật khẩu tối thiểu 8 ký tự.';

  // confirm_password — phải khớp password
  if (!form.confirm_password)  errors.confirm_password = 'Vui lòng xác nhận mật khẩu.';
  else if (form.confirm_password !== form.password)
    errors.confirm_password = 'Mật khẩu xác nhận không khớp.';

  // Điều khoản sử dụng
  if (!termChecked) errors.terms = 'Bạn cần đồng ý với điều khoản sử dụng.';

  // reCAPTCHA
  if (!captchaDone) errors.captcha = 'Vui lòng xác nhận bạn không phải robot.';

  return errors;
}

/* ─────────────────────────────────────────────
   State mặc định của form
───────────────────────────────────────────── */
const EMPTY_FORM = {
  full_name:        '',
  email:            '',
  phone_number:     '',
  password:         '',
  confirm_password: '',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
function RegisterPage() {
  const navigate = useNavigate();
  const captchaRef = useRef(null);

  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState({});
  const [termChecked,  setTermChecked]  = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null); // null = chưa tick
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState(null); // { type, message }

  /* ── Toast helper ── */
  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  /* ── Controlled input change ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Xóa lỗi field ngay khi user gõ lại
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  }

  /* ── reCAPTCHA callbacks ── */
  function handleCaptchaChange(token) {
    setCaptchaToken(token);
    if (token && errors.captcha) {
      setErrors((prev) => { const n = { ...prev }; delete n.captcha; return n; });
    }
  }
  function handleCaptchaExpired() { setCaptchaToken(null); }

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault();

    // 1. Validate phía FE
    const validationErrors = validateForm(form, !!captchaToken, termChecked);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 2. Gọi API thật
    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        full_name:        form.full_name.trim(),
        email:            form.email.trim(),
        password:         form.password,
        confirm_password: form.confirm_password,
      };
      // Thêm phone chỉ khi có giá trị
      if (form.phone_number.trim())
        payload.phone_number = form.phone_number.trim().replace(/[\s-]/g, '');

      const { ok, status, data } = await registerIntern(payload);

      if (ok) {
        // 201 — đăng ký thành công
        showToast('success', 'Đăng ký thành công! Đang chuyển sang đăng nhập…');
        setTimeout(() => navigate('/login'), 2000);

      } else if (status === 409) {
        // 409 — email đã tồn tại
        const msg = data?.detail ?? 'Email này đã được đăng ký.';
        setErrors({ email: msg });
        showToast('error', msg);

      } else if (status === 422) {
        // 422 — validate fail từ FastAPI
        const detail = data?.detail;
        if (Array.isArray(detail)) {
          const beErrors = {};
          detail.forEach(({ loc, msg: beMsg }) => {
            const field = loc?.[1]; // [body, field_name]
            if (field) beErrors[field] = beMsg;
          });
          setErrors(beErrors);
          showToast('error', 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.');
        } else {
          showToast('error', detail ?? 'Dữ liệu không hợp lệ.');
        }

      } else {
        // 500 / lỗi khác
        showToast('error', data?.detail ?? 'Đã có lỗi xảy ra, vui lòng thử lại.');
      }

    } catch {
      showToast('error', 'Không thể kết nối tới máy chủ, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
      // Reset reCAPTCHA sau mỗi lần submit (dù thành công hay lỗi)
      captchaRef.current?.reset();
      setCaptchaToken(null);
    }
  }

  /* ── Render ── */
  return (
    <div className="register-page">
      <div className="register-page__glow" aria-hidden="true" />

      {/* Toast */}
      {toast && (
        <div
          id="register-toast"
          style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, minWidth: 260, maxWidth: 440, padding: '13px 20px',
            borderRadius: 12, fontSize: 14, fontWeight: 600, textAlign: 'center',
            boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
            animation: 'none',
            background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border:     toast.type === 'success' ? '1px solid #6ee7b7' : '1px solid #fca5a5',
            color:      toast.type === 'success' ? '#065f46' : '#991b1b',
          }}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

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

          <form
            id="register-form"
            className="register-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* ── Họ và tên ── */}
            <div className={`form-group${errors.full_name ? ' form-group--error' : ''}`}>
              <label htmlFor="reg-name">
                Họ và tên <span style={{ color: '#e02424' }}>*</span>
              </label>
              <input
                id="reg-name"
                name="full_name"
                type="text"
                placeholder="Nhập họ và tên"
                autoComplete="name"
                value={form.full_name}
                onChange={handleChange}
                aria-describedby={errors.full_name ? 'err-reg-name' : undefined}
              />
              {errors.full_name && (
                <span id="err-reg-name" className="form-error" role="alert">
                  {errors.full_name}
                </span>
              )}
            </div>

            {/* ── Email ── */}
            <div className={`form-group${errors.email ? ' form-group--error' : ''}`}>
              <label htmlFor="reg-email">
                Email <span style={{ color: '#e02424' }}>*</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                placeholder="Nhập địa chỉ email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                aria-describedby={errors.email ? 'err-reg-email' : undefined}
              />
              {errors.email && (
                <span id="err-reg-email" className="form-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* ── Số điện thoại ── */}
            <div className={`form-group${errors.phone_number ? ' form-group--error' : ''}`}>
              <label htmlFor="reg-phone">Số điện thoại</label>
              <input
                id="reg-phone"
                name="phone_number"
                type="tel"
                placeholder="Nhập số điện thoại"
                autoComplete="tel"
                value={form.phone_number}
                onChange={handleChange}
                aria-describedby={errors.phone_number ? 'err-reg-phone' : undefined}
              />
              {errors.phone_number && (
                <span id="err-reg-phone" className="form-error" role="alert">
                  {errors.phone_number}
                </span>
              )}
            </div>

            {/* ── Mật khẩu + Xác nhận ── */}
            <div className="form-row">
              <div className={`form-group${errors.password ? ' form-group--error' : ''}`}>
                <label htmlFor="reg-pass">
                  Mật khẩu <span style={{ color: '#e02424' }}>*</span>
                </label>
                <input
                  id="reg-pass"
                  name="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  aria-describedby={errors.password ? 'err-reg-pass' : undefined}
                />
                {errors.password && (
                  <span id="err-reg-pass" className="form-error" role="alert">
                    {errors.password}
                  </span>
                )}
              </div>

              <div className={`form-group${errors.confirm_password ? ' form-group--error' : ''}`}>
                <label htmlFor="reg-pass2">
                  Xác nhận mật khẩu <span style={{ color: '#e02424' }}>*</span>
                </label>
                <input
                  id="reg-pass2"
                  name="confirm_password"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  aria-describedby={errors.confirm_password ? 'err-reg-pass2' : undefined}
                />
                {errors.confirm_password && (
                  <span id="err-reg-pass2" className="form-error" role="alert">
                    {errors.confirm_password}
                  </span>
                )}
              </div>
            </div>

            {/* ── Điều khoản ── */}
            <label className={`terms${errors.terms ? ' terms--error' : ''}`}>
              <input
                id="reg-terms"
                type="checkbox"
                checked={termChecked}
                onChange={(e) => {
                  setTermChecked(e.target.checked);
                  if (e.target.checked && errors.terms)
                    setErrors((prev) => { const n = { ...prev }; delete n.terms; return n; });
                }}
              />
              <span>Tôi đồng ý với điều khoản sử dụng</span>
            </label>
            {errors.terms && (
              <span className="form-error" role="alert" style={{ marginTop: -8, marginBottom: 4 }}>
                {errors.terms}
              </span>
            )}

            {/* ── reCAPTCHA v2 Checkbox ──
                Site key đọc từ VITE_RECAPTCHA_SITE_KEY (xem .env.example).
                TODO: Cần cấu hình .env trước khi deploy — xem .env.example.
            ── */}
            <div id="register-recaptcha-wrap" style={{ margin: '8px 0 4px' }}>
              {RECAPTCHA_SITE_KEY ? (
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaChange}
                  onExpired={handleCaptchaExpired}
                  hl="vi"
                />
              ) : (
                /* Fallback khi chưa cấu hình site key — DEV only */
                <div
                  style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: '#fef9c3', border: '1px solid #fde68a',
                    fontSize: 13, color: '#854d0e',
                  }}
                  role="alert"
                >
                  ⚠️ <strong>DEV:</strong> VITE_RECAPTCHA_SITE_KEY chưa được cấu hình.
                  Xem <code>.env.example</code>.
                </div>
              )}
              {errors.captcha && (
                <span
                  id="err-reg-captcha"
                  className="form-error"
                  role="alert"
                  style={{ marginTop: 4 }}
                >
                  {errors.captcha}
                </span>
              )}
            </div>

            {/* ── Submit ── */}
            <button
              id="register-submit-btn"
              type="submit"
              className="register-button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      display: 'inline-block', width: 14, height: 14,
                      border: '2px solid rgba(255,255,255,0.35)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'register-spin 0.7s linear infinite',
                      marginRight: 8,
                    }}
                    aria-hidden="true"
                  />
                  Đang đăng ký…
                </>
              ) : 'Đăng ký thực tập'}
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
  );
}

export default RegisterPage;
