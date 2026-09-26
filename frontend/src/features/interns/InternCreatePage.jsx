/**
 * InternCreatePage.jsx
 * Route dự kiến: /hr/interns/new
 *
 * US 1: "Là HR, tôi muốn thêm mới hồ sơ thực tập sinh để lưu trữ thông tin."
 *
 * Task 1 — Giao diện tĩnh (UI + state):
 *   - Tất cả field hồ sơ cá nhân theo software-specification.md §4.3 (Nhóm B)
 *     và §5.1 (POST /api/hr/interns).
 *   - KHÔNG bao gồm password/confirm_password — đây là hồ sơ do HR nhập hộ,
 *     không phải đăng ký tài khoản tự đăng nhập. Xem TODO bên dưới nếu cần bàn lại.
 *   - Nút "Lưu hồ sơ" chưa gọi API — stub console.log để dễ tích hợp task 2.
 *
 * TODO (cần bàn với nhóm/backend trước task 2):
 *   1. HR có cần tạo luôn tài khoản đăng nhập (email + mật khẩu tạm) khi thêm hồ sơ?
 *      - Nếu CÓ → thêm section "Tài khoản" (email bắt buộc, password tạm)
 *        và gọi API POST /api/hr/interns (tạo user + profile cùng 1 request).
 *      - Nếu KHÔNG → chỉ cần field email (lưu vào intern_profiles hoặc tham chiếu users),
 *        flow tạo tài khoản tách riêng.
 *      Hiện tại: GIỮ email ở section hồ sơ (required) và bỏ password/confirm_password.
 *   2. Mapping chính xác các field với schema DB — xác nhận với BE trước khi gọi API thật.
 *
 * Theme: kế thừa CreateAccountPage.css (design tokens, form-group, button, toast).
 * Pattern: bám đúng CreateAccountPage.jsx — useState, handleChange, showToast.
 */

import { useState } from 'react';
import './InternCreatePage.css';

/* ─────────────────────────────────────────────
   Hằng số options
───────────────────────────────────────────── */

/**
 * Giới tính — khớp với gender ENUM trong intern_profiles (spec §4.3).
 */
const GENDER_OPTIONS = [
  { value: 'male',   label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other',  label: 'Khác' },
];

/**
 * Năm học — tham chiếu spec §4.3 (academic_year).
 * TODO: Xác nhận với BE xem backend lưu dạng string hay number.
 */
const ACADEMIC_YEAR_OPTIONS = [
  { value: '1', label: 'Năm 1' },
  { value: '2', label: 'Năm 2' },
  { value: '3', label: 'Năm 3' },
  { value: '4', label: 'Năm 4' },
  { value: '5', label: 'Năm 5+' },
];

/* ─────────────────────────────────────────────
   Initial form state — khớp đúng field spec §4.3 (Nhóm B) + email (Nhóm A)
   KHÔNG có password/confirm_password (xem TODO ở đầu file).
───────────────────────────────────────────── */
const INITIAL_FORM = {
  full_name:     '',   // users.full_name (bắt buộc)
  email:         '',   // users.email (bắt buộc — xem TODO tài khoản)
  phone_number:  '',   // intern_profiles.phone_number
  dob:           '',   // intern_profiles.dob (date string YYYY-MM-DD)
  gender:        '',   // intern_profiles.gender (male/female/other)
  university:    '',   // intern_profiles.university (bắt buộc — spec §4.3)
  major:         '',   // intern_profiles.major (bắt buộc — spec §4.3)
  academic_year: '',   // intern_profiles.academic_year
  gpa:           '',   // intern_profiles.gpa (number, chuỗi rỗng để hiện placeholder)
  address:       '',   // intern_profiles.address
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * InternCreatePage
 *
 * Form HR nhập hồ sơ thực tập sinh mới.
 * Task 1: giao diện tĩnh — state đã sẵn sàng, validate + API call sẽ bổ sung ở task 2.
 */
function InternCreatePage() {
  /* ── State ── */
  const [form, setForm]       = useState(INITIAL_FORM);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null); // { type: 'success'|'error', message: string }

  /* ── Handlers ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Xóa lỗi của field vừa sửa ngay lập tức (pattern chuẩn CreateAccountPage)
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

  /**
   * handleSubmit — Task 1: chỉ log dữ liệu, chưa gọi API.
   *
   * TODO (task 2):
   *   1. Thêm hàm validateForm(form) trả về { errors } — validate required fields.
   *   2. Import createIntern từ '../../api/interns' (hàm sẽ tạo ở task 2).
   *   3. Xử lý response 201, 409, 422, 500 đúng pattern CreateAccountPage.jsx.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    // TODO task 2: thay bằng validate + API call
    setLoading(true);
    try {
      // Stub — xóa khi có API thật (task 2)
      await new Promise((r) => setTimeout(r, 300));
      console.log('[InternCreatePage] Form data (stub — task 2 sẽ gọi API):', form);
      showToast('success', 'Hồ sơ đã được lưu thành công! (stub)');
    } finally {
      setLoading(false);
    }
  }

  /* ── Render ── */
  return (
    <div className="intern-create-page">
      {/* Glow nền — giống CreateAccountPage */}
      <div className="intern-create-page__glow" aria-hidden="true" />

      {/* ── Toast thông báo ── */}
      {toast && (
        <div
          id="hr-ic-toast"
          className={`intern-create-toast intern-create-toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}
          {toast.message}
        </div>
      )}

      <div className="intern-create-shell">

        {/* ── Brand / back link ── */}
        <a href="/hr/interns" className="intern-create-brand">
          ← Quay lại danh sách hồ sơ
        </a>

        {/* ── Card ── */}
        <div className="intern-create-card">

          {/* Header */}
          <div className="intern-create-header">
            <span className="intern-create-badge">HR</span>
            <h1>Thêm hồ sơ <span>thực tập sinh</span></h1>
            <p className="intern-create-lead">
              Nhập thông tin cá nhân của thực tập sinh. Các trường có dấu{' '}
              <abbr title="bắt buộc">*</abbr> là bắt buộc.
            </p>
          </div>

          {/* Form */}
          <form
            className="intern-create-form"
            id="hr-intern-create-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* ── Section: Thông tin cơ bản ── */}
            <fieldset className="intern-create-section">
              <legend className="intern-create-section__title">Thông tin cơ bản</legend>

              {/* Họ tên */}
              <div className={`form-group${errors.full_name ? ' form-group--error' : ''}`}>
                <label htmlFor="hr-ic-fullname">
                  Họ và tên <span className="intern-create-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="hr-ic-fullname"
                  name="full_name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={handleChange}
                  aria-required="true"
                  aria-describedby={errors.full_name ? 'err-ic-fullname' : undefined}
                />
                {errors.full_name && (
                  <span id="err-ic-fullname" className="form-error" role="alert">
                    {errors.full_name}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className={`form-group${errors.email ? ' form-group--error' : ''}`}>
                <label htmlFor="hr-ic-email">
                  Email <span className="intern-create-required" aria-hidden="true">*</span>
                  {/* TODO: Bàn với nhóm xem đây là email tài khoản hay chỉ email liên lạc */}
                </label>
                <input
                  id="hr-ic-email"
                  name="email"
                  type="email"
                  placeholder="example@ictu.edu.vn"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  aria-required="true"
                  aria-describedby={errors.email ? 'err-ic-email' : undefined}
                />
                {errors.email && (
                  <span id="err-ic-email" className="form-error" role="alert">
                    {errors.email}
                  </span>
                )}
              </div>

              {/* SĐT + Ngày sinh — 2 cột */}
              <div className="intern-create-row">
                <div className={`form-group${errors.phone_number ? ' form-group--error' : ''}`}>
                  <label htmlFor="hr-ic-phone">Số điện thoại</label>
                  <input
                    id="hr-ic-phone"
                    name="phone_number"
                    type="tel"
                    placeholder="0912 345 678"
                    autoComplete="tel"
                    value={form.phone_number}
                    onChange={handleChange}
                    aria-describedby={errors.phone_number ? 'err-ic-phone' : undefined}
                  />
                  {errors.phone_number && (
                    <span id="err-ic-phone" className="form-error" role="alert">
                      {errors.phone_number}
                    </span>
                  )}
                </div>

                <div className={`form-group${errors.dob ? ' form-group--error' : ''}`}>
                  <label htmlFor="hr-ic-dob">Ngày sinh</label>
                  <input
                    id="hr-ic-dob"
                    name="dob"
                    type="date"
                    value={form.dob}
                    onChange={handleChange}
                    aria-describedby={errors.dob ? 'err-ic-dob' : undefined}
                  />
                  {errors.dob && (
                    <span id="err-ic-dob" className="form-error" role="alert">
                      {errors.dob}
                    </span>
                  )}
                </div>
              </div>

              {/* Giới tính */}
              <div className={`form-group${errors.gender ? ' form-group--error' : ''}`}>
                <label htmlFor="hr-ic-gender">Giới tính</label>
                <select
                  id="hr-ic-gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  aria-describedby={errors.gender ? 'err-ic-gender' : undefined}
                >
                  <option value="">-- Chọn giới tính --</option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.gender && (
                  <span id="err-ic-gender" className="form-error" role="alert">
                    {errors.gender}
                  </span>
                )}
              </div>

              {/* Địa chỉ */}
              <div className={`form-group${errors.address ? ' form-group--error' : ''}`}>
                <label htmlFor="hr-ic-address">Địa chỉ</label>
                <input
                  id="hr-ic-address"
                  name="address"
                  type="text"
                  placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={handleChange}
                  aria-describedby={errors.address ? 'err-ic-address' : undefined}
                />
                {errors.address && (
                  <span id="err-ic-address" className="form-error" role="alert">
                    {errors.address}
                  </span>
                )}
              </div>
            </fieldset>

            {/* ── Section: Thông tin học vấn ── */}
            <fieldset className="intern-create-section">
              <legend className="intern-create-section__title">Thông tin học vấn</legend>

              {/* Trường */}
              <div className={`form-group${errors.university ? ' form-group--error' : ''}`}>
                <label htmlFor="hr-ic-university">
                  Trường đại học / cao đẳng{' '}
                  <span className="intern-create-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="hr-ic-university"
                  name="university"
                  type="text"
                  placeholder="Đại học Công nghệ thông tin và Truyền thông"
                  value={form.university}
                  onChange={handleChange}
                  aria-required="true"
                  aria-describedby={errors.university ? 'err-ic-university' : undefined}
                />
                {errors.university && (
                  <span id="err-ic-university" className="form-error" role="alert">
                    {errors.university}
                  </span>
                )}
              </div>

              {/* Ngành */}
              <div className={`form-group${errors.major ? ' form-group--error' : ''}`}>
                <label htmlFor="hr-ic-major">
                  Ngành học{' '}
                  <span className="intern-create-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="hr-ic-major"
                  name="major"
                  type="text"
                  placeholder="Công nghệ thông tin"
                  value={form.major}
                  onChange={handleChange}
                  aria-required="true"
                  aria-describedby={errors.major ? 'err-ic-major' : undefined}
                />
                {errors.major && (
                  <span id="err-ic-major" className="form-error" role="alert">
                    {errors.major}
                  </span>
                )}
              </div>

              {/* Năm học + GPA — 2 cột */}
              <div className="intern-create-row">
                <div className={`form-group${errors.academic_year ? ' form-group--error' : ''}`}>
                  <label htmlFor="hr-ic-year">Năm học</label>
                  <select
                    id="hr-ic-year"
                    name="academic_year"
                    value={form.academic_year}
                    onChange={handleChange}
                    aria-describedby={errors.academic_year ? 'err-ic-year' : undefined}
                  >
                    <option value="">-- Chọn năm --</option>
                    {ACADEMIC_YEAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.academic_year && (
                    <span id="err-ic-year" className="form-error" role="alert">
                      {errors.academic_year}
                    </span>
                  )}
                </div>

                <div className={`form-group${errors.gpa ? ' form-group--error' : ''}`}>
                  <label htmlFor="hr-ic-gpa">GPA (0 – 4)</label>
                  <input
                    id="hr-ic-gpa"
                    name="gpa"
                    type="number"
                    min="0"
                    max="4"
                    step="0.01"
                    placeholder="3.20"
                    value={form.gpa}
                    onChange={handleChange}
                    aria-describedby={errors.gpa ? 'err-ic-gpa' : undefined}
                  />
                  {errors.gpa && (
                    <span id="err-ic-gpa" className="form-error" role="alert">
                      {errors.gpa}
                    </span>
                  )}
                </div>
              </div>
            </fieldset>

            {/* ── Actions ── */}
            <div className="intern-create-actions">
              <a href="/hr/interns" className="intern-create-cancel">
                Hủy
              </a>
              <button
                id="hr-ic-submit"
                type="submit"
                className="intern-create-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="intern-create-spinner" aria-hidden="true" />
                    Đang lưu…
                  </>
                ) : (
                  '💾 Lưu hồ sơ'
                )}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default InternCreatePage;
