/**
 * CreateAccountPage.jsx
 * Route dự kiến: /admin/users/new
 *
 * US: "Là admin, tôi muốn tạo tài khoản cho HR, mentor và thực tập sinh."
 * Task 1: Giao diện tĩnh.
 * Task 2: Validate form + tích hợp API (mock — TODO: thay bằng endpoint thật).
 *
 * Fields : Họ tên | Email | Dropdown Role | Password tạm | Nút "Tạo tài khoản"
 * Theme  : kế thừa RegisterPage.css (màu, font, input, button)
 */

import { useState } from 'react';
import { createAccount } from '../../api/admin';
import './CreateAccountPage.css';

/* ─────────────────────────────────────────────
   Hằng số
───────────────────────────────────────────── */

/**
 * Danh sách role hiển thị trong dropdown.
 * Giá trị (value) khớp với roles.name trong DB (software-specification.md §1.2).
 */
const ROLE_OPTIONS = [
  { value: 'intern', label: 'Thực tập sinh' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'hr',     label: 'HR' },
];

/** Regex email chuẩn RFC 5322 (simplified — đủ cho production form) */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─────────────────────────────────────────────
   API: dùng createAccount từ src/api/admin.js
   (đã chuyển ra đúng vị trí theo folder-structure.md §3)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Validate helper
───────────────────────────────────────────── */

/**
 * Validate toàn bộ form, trả về object errors.
 * Trả về {} nếu hợp lệ.
 *
 * Rule validate:
 *   - email : đúng format
 *   - password: 6–128 ký tự
 *   - role  : bắt buộc chọn
 */
function validateForm({ full_name, email, role, password }) {
  const errors = {};

  if (!full_name.trim()) {
    errors.full_name = 'Vui lòng nhập họ tên.';
  }

  if (!email.trim()) {
    errors.email = 'Vui lòng nhập email.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Email không đúng định dạng.';
  }

  if (!role) {
    errors.role = 'Vui lòng chọn vai trò.';
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu tạm.';
  } else if (password.length < 6) {
    errors.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
  } else if (password.length > 128) {
    errors.password = 'Mật khẩu không được vượt quá 128 ký tự.';
  }

  return errors;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * CreateAccountPage
 * Form tạo tài khoản cho admin — có validate + mock API call.
 */
function CreateAccountPage() {
  /* ── State ── */
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: '',
    password: '',
  });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null); // { type: 'success'|'error', message: string }

  /* ── Handlers ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Xóa lỗi của field vừa sửa ngay lập tức
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

    // 1. Validate
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 2. Gọi API
    setLoading(true);
    setErrors({});
    try {
      const { ok, status, data } = await createAccount({
        full_name: form.full_name.trim(),
        email:     form.email.trim().toLowerCase(),
        role:      form.role,
        password:  form.password,
      });

      if (ok) {
        // 201 — thành công
        showToast('success', 'Tạo tài khoản thành công!');
        setForm({ full_name: '', email: '', role: '', password: '' });
      } else if (status === 409) {
        // Email đã tồn tại
        const msg = data?.detail ?? 'Email đã được sử dụng.';
        setErrors({ email: msg });
        showToast('error', msg);
      } else if (status === 422) {
        // Validate fail từ BE (format { detail: [...] } hoặc { detail: "..." })
        const detail = data?.detail;
        if (Array.isArray(detail)) {
          // FastAPI validation errors — map theo field
          const beErrors = {};
          detail.forEach(({ loc, msg: beMsg }) => {
            const field = loc?.[1]; // ["body", "field_name"]
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

  /* ── Render ── */
  return (
    <div className="create-account-page">
      {/* Glow nền (giống RegisterPage) */}
      <div className="create-account-page__glow" aria-hidden="true" />

      {/* ── Toast thông báo ── */}
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

        {/* ── Brand ── */}
        <a href="/admin/dashboard" className="create-account-brand">
          <span>ICTU Internship</span>
        </a>

        {/* ── Card ── */}
        <div className="create-account-card">

          {/* Header */}
          <div className="create-account-header">
            <span className="create-account-badge">Quản trị viên</span>
            <h1>Tạo <span>tài khoản</span> mới</h1>
            <p className="create-account-lead">
              Tạo tài khoản cho HR, Mentor hoặc Thực tập sinh trong hệ thống.
            </p>
          </div>

          {/* Form */}
          <form
            className="create-account-form"
            id="admin-create-account-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* Họ tên */}
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
                aria-describedby={errors.full_name ? 'err-fullname' : undefined}
              />
              {errors.full_name && (
                <span id="err-fullname" className="form-error" role="alert">
                  {errors.full_name}
                </span>
              )}
            </div>

            {/* Email */}
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
                aria-describedby={errors.email ? 'err-email' : undefined}
              />
              {errors.email && (
                <span id="err-email" className="form-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Dropdown Role */}
            <div className={`form-group${errors.role ? ' form-group--error' : ''}`}>
              <label htmlFor="admin-ca-role">Vai trò</label>
              <select
                id="admin-ca-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                aria-describedby={errors.role ? 'err-role' : undefined}
              >
                <option value="" disabled>-- Chọn vai trò --</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <span id="err-role" className="form-error" role="alert">
                  {errors.role}
                </span>
              )}
            </div>

            {/* Password tạm */}
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
                aria-describedby={errors.password ? 'err-password' : undefined}
              />
              {errors.password && (
                <span id="err-password" className="form-error" role="alert">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              id="admin-ca-submit"
              type="submit"
              className="create-account-button"
              disabled={loading}
            >
              {loading ? 'Đang xử lý…' : 'Tạo tài khoản'}
            </button>

          </form>
        </div>

        {/* Back link */}
        <a href="/admin/users" className="create-account-back">
          ← Quay lại danh sách người dùng
        </a>

      </div>
    </div>
  );
}

export default CreateAccountPage;
