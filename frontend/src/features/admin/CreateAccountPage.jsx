/**
 * CreateAccountPage.jsx — US-39
 * Admin tạo tài khoản nội bộ: HR / Mentor.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createAccount } from '../../api/admin';
import './CreateAccountPage.css';

const ROLE_OPTIONS = [
  { value: 'hr', label: 'HR', desc: 'Quản lý hồ sơ & chương trình' },
  { value: 'mentor', label: 'Mentor', desc: 'Hướng dẫn & đánh giá TTS' },
];

const ALLOWED_ROLES = new Set(ROLE_OPTIONS.map((o) => o.value));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NOTES = [
  'Chỉ tạo tài khoản HR hoặc Mentor.',
  'Thực tập sinh đăng ký qua trang công khai /register.',
  'Mật khẩu tạm tối thiểu 6 ký tự.',
  'Nên dùng email domain tổ chức (@ictu.edu.vn).',
  'Yêu cầu người dùng đổi mật khẩu ở lần đăng nhập đầu.',
];

const GUIDE_STEPS = [
  'Nhập họ tên và email công việc.',
  'Chọn đúng vai trò (HR hoặc Mentor).',
  'Đặt mật khẩu tạm và gửi cho người dùng.',
  'Xác nhận tài khoản đăng nhập được.',
];

function validateForm({ full_name, email, role, password }) {
  const errors = {};
  if (!full_name.trim()) errors.full_name = 'Vui lòng nhập họ tên.';
  if (!email.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Email không đúng định dạng.';
  if (!role) errors.role = 'Vui lòng chọn vai trò.';
  else if (!ALLOWED_ROLES.has(role)) errors.role = 'Chỉ được tạo tài khoản HR hoặc Mentor.';
  if (!password) errors.password = 'Vui lòng nhập mật khẩu tạm.';
  else if (password.length < 6) errors.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
  else if (password.length > 128) errors.password = 'Mật khẩu không được vượt quá 128 ký tự.';
  return errors;
}

function CreateAccountPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const { ok, status, data } = await createAccount({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        password: form.password,
      });

      if (ok) {
        showToast('success', 'Tạo tài khoản thành công!');
        setForm({ full_name: '', email: '', role: '', password: '' });
      } else if (status === 409) {
        const msg = data?.detail ?? 'Email đã được sử dụng.';
        setErrors({ email: msg });
        showToast('error', msg);
      } else if (status === 422) {
        const detail = data?.detail;
        if (Array.isArray(detail)) {
          const beErrors = {};
          detail.forEach(({ loc, msg: beMsg }) => {
            const field = loc?.[1];
            if (field) beErrors[field] = beMsg;
          });
          setErrors(beErrors);
          showToast('error', 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.');
        } else {
          showToast('error', detail ?? 'Dữ liệu không hợp lệ.');
        }
      } else {
        showToast('error', data?.detail ?? 'Đã xảy ra lỗi, vui lòng thử lại.');
      }
    } catch {
      showToast('error', 'Không thể kết nối tới máy chủ, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-account-page">
      {toast && (
        <div
          id="admin-ca-toast"
          className={`create-account-toast create-account-toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}
          {toast.message}
        </div>
      )}

      <div className="create-account-shell">
        <header className="create-account-pagehead">
          <nav className="create-account-crumb" aria-label="Breadcrumb">
            <Link to="/admin/dashboard">Admin</Link>
            <span aria-hidden="true">/</span>
            <span>Tạo tài khoản</span>
          </nav>
          <div className="create-account-pagehead__row">
            <div>
              <h1>Tạo tài khoản nội bộ</h1>
              <p>Cấp tài khoản HR hoặc Mentor.</p>
            </div>
            <Link to="/admin/dashboard" className="create-account-back">
              ← Quay lại
            </Link>
          </div>
        </header>

        <div className="create-account-layout">
          <div className="create-account-card">
            <form
              className="create-account-form"
              id="admin-create-account-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="create-account-form__grid">
                <div className={`form-group${errors.full_name ? ' form-group--error' : ''}`}>
                  <label htmlFor="admin-ca-fullname">Họ tên</label>
                  <input
                    id="admin-ca-fullname"
                    name="full_name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    value={form.full_name}
                    onChange={handleChange}
                  />
                  {errors.full_name && (
                    <span className="form-error" role="alert">{errors.full_name}</span>
                  )}
                </div>

                <div className={`form-group${errors.email ? ' form-group--error' : ''}`}>
                  <label htmlFor="admin-ca-email">Email</label>
                  <input
                    id="admin-ca-email"
                    name="email"
                    type="email"
                    placeholder="example@ictu.edu.vn"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && (
                    <span className="form-error" role="alert">{errors.email}</span>
                  )}
                </div>
              </div>

              <div className={`form-group${errors.role ? ' form-group--error' : ''}`}>
                <span className="form-label" id="admin-ca-role-label">
                  Vai trò
                </span>
                <div className="role-cards" role="radiogroup" aria-labelledby="admin-ca-role-label">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`role-card${form.role === opt.value ? ' is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={form.role === opt.value}
                        onChange={handleChange}
                      />
                      <span className="role-card__title">{opt.label}</span>
                      <span className="role-card__desc">{opt.desc}</span>
                    </label>
                  ))}
                </div>
                {errors.role && (
                  <span className="form-error" role="alert">{errors.role}</span>
                )}
              </div>

              <div className={`form-group${errors.password ? ' form-group--error' : ''}`}>
                <label htmlFor="admin-ca-password">Mật khẩu tạm</label>
                <input
                  id="admin-ca-password"
                  name="password"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                />
                {errors.password && (
                  <span className="form-error" role="alert">{errors.password}</span>
                )}
              </div>

              <div className="create-account-form__footer">
                <button
                  id="admin-ca-submit"
                  type="submit"
                  className="create-account-button"
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý…' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>

          <aside className="create-account-aside">
            <section className="create-account-side-card">
              <h2>Lưu ý</h2>
              <ul>
                {NOTES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="create-account-side-card">
              <h2>Hướng dẫn</h2>
              <ol>
                {GUIDE_STEPS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CreateAccountPage;
