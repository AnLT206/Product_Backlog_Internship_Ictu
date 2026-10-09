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
   Đọc từ env. Nếu chưa cấu hình, fallback sang Google test key (6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI)
   để tiện phát triển và test trên localhost mà không hiện cảnh báo lỗi.
───────────────────────────────────────────── */
const GOOGLE_TEST_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || GOOGLE_TEST_KEY;

/* ─────────────────────────────────────────────
   Regex helpers & Date formatters
───────────────────────────────────────────── */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0[0-9]{8,10}|\+84[0-9]{8,10})$/;


function parseDobToDate(dobStr) {
  if (!dobStr) return null;
  const trimmed = dobStr.trim();

  let day, month, year;

  // 1. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or single digits D/M/YYYY
  const matchDmy = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (matchDmy) {
    day = parseInt(matchDmy[1], 10);
    month = parseInt(matchDmy[2], 10);
    year = parseInt(matchDmy[3], 10);
  } else {
    // 2. YYYY-MM-DD or YYYY/MM/DD
    const matchYmd = trimmed.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
    if (matchYmd) {
      year = parseInt(matchYmd[1], 10);
      month = parseInt(matchYmd[2], 10);
      day = parseInt(matchYmd[3], 10);
    } else {
      // 3. 8 continuous digits: DDMMYYYY (e.g. 15052003)
      const match8Digits = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
      if (match8Digits) {
        day = parseInt(match8Digits[1], 10);
        month = parseInt(match8Digits[2], 10);
        year = parseInt(match8Digits[3], 10);
      } else {
        return null;
      }
    }
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return null;
  }

  return {
    dateObj,
    isoString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
  };
}

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

  // dob — ngày sinh (bắt buộc)
  if (!form.dob || !form.dob.trim()) {
    errors.dob = 'Vui lòng nhập ngày sinh (dd/mm/yyyy).';
  } else {
    const parsed = parseDobToDate(form.dob);
    if (!parsed) {
      errors.dob = 'Ngày sinh không hợp lệ (định dạng dd/mm/yyyy, VD: 15/05/2003).';
    } else {
      const now = new Date();
      if (parsed.dateObj > now) {
        errors.dob = 'Ngày sinh không thể ở tương lai.';
      } else if (parsed.dateObj.getFullYear() < 1960) {
        errors.dob = 'Năm sinh không hợp lệ.';
      }
    }
  }

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

  // reCAPTCHA — chỉ bắt buộc khi có site key
  if (RECAPTCHA_SITE_KEY && !captchaDone) {
    errors.captcha = 'Vui lòng xác nhận bạn không phải robot.';
  }

  return errors;
}

/* ─────────────────────────────────────────────
   State mặc định của form
───────────────────────────────────────────── */
const EMPTY_FORM = {
  full_name:        '',
  dob:              '',
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
  const datePickerRef = useRef(null);

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

  /* ── Controlled DOB input change: allow natural typing without IME/Unikey conflict ── */
  function handleDobChange(e) {
    let val = e.target.value;
    // Allow digits, slashes, dashes, dots, up to 10 chars
    val = val.replace(/[^\d/\-.]/g, '');
    if (val.length > 10) val = val.slice(0, 10);

    setForm((prev) => ({ ...prev, dob: val }));
    if (errors.dob) {
      setErrors((prev) => { const n = { ...prev }; delete n.dob; return n; });
    }
  }

  /* ── Normalize DOB format on blur (e.g. 14022006 -> 14/02/2006, 5/5/2003 -> 05/05/2003) ── */
  function handleDobBlur() {
    if (!form.dob || !form.dob.trim()) return;
    const parsed = parseDobToDate(form.dob);
    if (parsed) {
      setForm((prev) => ({ ...prev, dob: parsed.formatted }));
      if (errors.dob) {
        setErrors((prev) => { const n = { ...prev }; delete n.dob; return n; });
      }
    }
  }

  /* ── Handle DOB paste (e.g. YYYY-MM-DD or 8 digits) ── */
  function handleDobPaste(e) {
    const text = e.clipboardData?.getData('text') || '';
    const parsed = parseDobToDate(text);
    if (parsed) {
      e.preventDefault();
      setForm((prev) => ({ ...prev, dob: parsed.formatted }));
      if (errors.dob) {
        setErrors((prev) => { const n = { ...prev }; delete n.dob; return n; });
      }
    }
  }

  /* ── Open native date picker on calendar button click ── */
  function openDatePicker() {
    if (datePickerRef.current) {
      if (typeof datePickerRef.current.showPicker === 'function') {
        try {
          datePickerRef.current.showPicker();
        } catch {
          datePickerRef.current.focus();
        }
      } else {
        datePickerRef.current.focus();
      }
    }
  }

  function handleDatePickerChange(e) {
    const val = e.target.value; // YYYY-MM-DD
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      setForm((prev) => ({ ...prev, dob: `${d}/${m}/${y}` }));
      if (errors.dob) {
        setErrors((prev) => { const n = { ...prev }; delete n.dob; return n; });
      }
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
      const parsedDob = parseDobToDate(form.dob);
      if (parsedDob) {
        payload.dob = parsedDob.isoString;
      }
      // Thêm phone chỉ khi có giá trị
      if (form.phone_number.trim())
        payload.phone_number = form.phone_number.trim().replace(/[\s-]/g, '');

      const { ok, status, data } = await registerIntern(payload);

      if (ok) {
        if (parsedDob) {
          try {
            const profile = JSON.parse(localStorage.getItem('ictu_user_profile') || '{}');
            profile.dob = parsedDob.formatted;
            if (form.phone_number) profile.phone = form.phone_number;
            localStorage.setItem('ictu_user_profile', JSON.stringify(profile));
          } catch {
            // ignore
          }
        }
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
            {/* ── Họ và tên + Ngày sinh ── */}
            <div className="form-row">
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

              <div className={`form-group${errors.dob ? ' form-group--error' : ''}`}>
                <label htmlFor="reg-dob">
                  Ngày sinh <span style={{ color: '#e02424' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="reg-dob"
                    name="dob"
                    type="text"
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    autoComplete="bday"
                    value={form.dob}
                    onChange={handleDobChange}
                    onBlur={handleDobBlur}
                    onPaste={handleDobPaste}
                    style={{ paddingRight: '40px' }}
                    aria-describedby={errors.dob ? 'err-reg-dob' : undefined}
                  />
                  <input
                    type="date"
                    ref={datePickerRef}
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      right: 12,
                      width: 1,
                      height: 1,
                      opacity: 0,
                      pointerEvents: 'none',
                    }}
                    onChange={handleDatePickerChange}
                  />
                  <button
                    type="button"
                    title="Chọn ngày sinh từ lịch"
                    onClick={openDatePicker}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#65676b',
                      borderRadius: 4,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </button>
                </div>
                {errors.dob && (
                  <span id="err-reg-dob" className="form-error" role="alert">
                    {errors.dob}
                  </span>
                )}
              </div>
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
              {RECAPTCHA_SITE_KEY && (
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaChange}
                  onExpired={handleCaptchaExpired}
                  hl="vi"
                />
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
