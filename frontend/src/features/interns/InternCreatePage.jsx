/**
 * InternCreatePage.jsx
 * Route dự kiến: /hr/interns/new
 *
 * US 1: "Là HR, tôi muốn thêm mới hồ sơ thực tập sinh để lưu trữ thông tin."
 *
 * Task 1 — Giao diện tĩnh (UI + state): done (PR trước).
 * Task 2 — Validate đầu vào + tích hợp API createIntern():
 *   - Validate client-side toàn bộ field theo rule software-specification.md §2.2 + §4.3.
 *   - Gọi createIntern() từ src/api/interns.js (không fetch trực tiếp trong component).
 *   - Dùng buildToast() có sẵn — không viết lại toast logic.
 *   - Xử lý response 201, 409, 422, 500 đúng pattern CreateAccountPage.jsx.
 *
 * TODO (chưa bàn xong với nhóm):
 *   1. HR có cần set password tạm khi thêm hồ sơ không?
 *      Nếu CÓ → bổ sung field password vào INITIAL_FORM và validateForm.
 *   2. Sau khi tạo thành công, redirect về /hr/interns hay ở lại form reset?
 *      Hiện tại: reset form, hiện toast success, ở lại trang.
 *
 * Theme: kế thừa CreateAccountPage.css (design tokens, form-group, button, toast).
 * Pattern: bám đúng CreateAccountPage.jsx — useState, handleChange, showToast.
 */

import { useState } from 'react';
import { createIntern, buildToast } from '../../api/interns';
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
   Regex helpers
───────────────────────────────────────────── */

/** Email đúng format — khớp rule spec §2.2 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Số điện thoại — "0..." hoặc "+84..." theo rule docs/api.md §2.2.
 * Chấp nhận khoảng trắng / dấu gạch giữa các nhóm số.
 */
const PHONE_REGEX = /^(0[0-9]{8,10}|\+84[0-9]{8,10})$/;

/** Ngày sinh định dạng YYYY-MM-DD (value của input[type=date]) */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/* ─────────────────────────────────────────────
   Initial form state — field spec §4.3 (Nhóm B) + email (Nhóm A)
   KHÔNG có password/confirm_password (xem TODO ở đầu file).
───────────────────────────────────────────── */
const INITIAL_FORM = {
  full_name:     '',   // users.full_name (bắt buộc)
  email:         '',   // users.email (bắt buộc)
  phone_number:  '',   // intern_profiles.phone_number (tuỳ chọn)
  dob:           '',   // intern_profiles.dob YYYY-MM-DD (tuỳ chọn)
  gender:        '',   // intern_profiles.gender (tuỳ chọn)
  university:    '',   // intern_profiles.university (bắt buộc — spec §4.3)
  major:         '',   // intern_profiles.major (bắt buộc — spec §4.3)
  academic_year: '',   // intern_profiles.academic_year (tuỳ chọn)
  gpa:           '',   // intern_profiles.gpa number 0–4 (tuỳ chọn)
  address:       '',   // intern_profiles.address (tuỳ chọn)
};

/* ─────────────────────────────────────────────
   Validate helper
   Trả về object { fieldName: 'message lỗi tiếng Việt' }.
   Trả về {} nếu tất cả hợp lệ.

   Rule theo software-specification.md §2.2 + §4.3 + yêu cầu task:
     full_name    : bắt buộc, 1–100 ký tự
     email        : bắt buộc, đúng format email
     phone_number : tuỳ chọn — nếu có: "0..." hoặc "+84..."
     dob          : tuỳ chọn — nếu có: YYYY-MM-DD
     gender       : tuỳ chọn — nếu có: male/female/other
     university   : bắt buộc (spec §4.3), max 150 ký tự
     major        : bắt buộc (spec §4.3), max 150 ký tự
     academic_year: tuỳ chọn — nếu có: max 50 ký tự
     gpa          : tuỳ chọn — nếu có: số trong khoảng 0–4
     address      : tuỳ chọn — nếu có: max 255 ký tự
───────────────────────────────────────────── */
function validateForm(form) {
  const errors = {};

  /* full_name — bắt buộc, 1–100 ký tự */
  const fullName = form.full_name.trim();
  if (!fullName) {
    errors.full_name = 'Vui lòng nhập họ và tên.';
  } else if (fullName.length > 100) {
    errors.full_name = 'Họ và tên không được vượt quá 100 ký tự.';
  }

  /* email — bắt buộc, đúng format */
  const email = form.email.trim();
  if (!email) {
    errors.email = 'Vui lòng nhập email.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Email không đúng định dạng.';
  }

  /* phone_number — tuỳ chọn, nếu có phải đúng format */
  const phone = form.phone_number.trim();
  if (phone) {
    // Bỏ khoảng trắng/dấu gạch trước khi test
    const phoneSanitised = phone.replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(phoneSanitised)) {
      errors.phone_number = 'Số điện thoại phải bắt đầu bằng "0" (10–11 số) hoặc "+84" (10–11 số).';
    }
  }

  /* dob — tuỳ chọn, nếu có phải YYYY-MM-DD */
  if (form.dob && !DATE_REGEX.test(form.dob)) {
    errors.dob = 'Ngày sinh không đúng định dạng.';
  }

  /* gender — tuỳ chọn, nếu có phải là 1 trong 3 giá trị hợp lệ */
  const validGenders = ['male', 'female', 'other'];
  if (form.gender && !validGenders.includes(form.gender)) {
    errors.gender = 'Giới tính không hợp lệ.';
  }

  /* university — bắt buộc (spec §4.3), max 150 ký tự */
  const university = form.university.trim();
  if (!university) {
    errors.university = 'Vui lòng nhập tên trường.';
  } else if (university.length > 150) {
    errors.university = 'Tên trường không được vượt quá 150 ký tự.';
  }

  /* major — bắt buộc (spec §4.3), max 150 ký tự */
  const major = form.major.trim();
  if (!major) {
    errors.major = 'Vui lòng nhập ngành học.';
  } else if (major.length > 150) {
    errors.major = 'Ngành học không được vượt quá 150 ký tự.';
  }

  /* academic_year — tuỳ chọn, nếu có: max 50 ký tự */
  if (form.academic_year && form.academic_year.length > 50) {
    errors.academic_year = 'Năm học không được vượt quá 50 ký tự.';
  }

  /* gpa — tuỳ chọn, nếu có: số, 0 ≤ gpa ≤ 4 */
  if (form.gpa !== '') {
    const gpaNum = Number(form.gpa);
    if (Number.isNaN(gpaNum)) {
      errors.gpa = 'GPA phải là số.';
    } else if (gpaNum < 0 || gpaNum > 4) {
      errors.gpa = 'GPA phải trong khoảng 0 – 4.';
    }
  }

  /* address — tuỳ chọn, nếu có: max 255 ký tự */
  if (form.address.trim().length > 255) {
    errors.address = 'Địa chỉ không được vượt quá 255 ký tự.';
  }

  return errors;
}

/* ─────────────────────────────────────────────
   Chuẩn hoá dữ liệu trước khi gửi API
   - email: lowercase + trim
   - Loại bỏ field rỗng (không gửi null lên BE)
   - gpa: chuyển thành number nếu có
───────────────────────────────────────────── */
function buildPayload(form) {
  const payload = {
    full_name: form.full_name.trim(),
    email:     form.email.trim().toLowerCase(),
  };

  if (form.phone_number.trim()) {
    payload.phone_number = form.phone_number.trim().replace(/[\s-]/g, '');
  }
  if (form.dob)           payload.dob           = form.dob;
  if (form.gender)        payload.gender         = form.gender;
  if (form.university.trim()) payload.university = form.university.trim();
  if (form.major.trim())  payload.major          = form.major.trim();
  if (form.academic_year) payload.academic_year  = form.academic_year;
  if (form.gpa !== '')    payload.gpa            = Number(form.gpa);
  if (form.address.trim()) payload.address       = form.address.trim();

  return payload;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * InternCreatePage
 *
 * Form HR nhập hồ sơ thực tập sinh mới — đã có validate + gọi API (task 2).
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

  async function handleSubmit(e) {
    e.preventDefault();

    // 1. Validate client-side
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 2. Gọi API — createIntern từ src/api/interns.js
    setLoading(true);
    setErrors({});
    try {
      const payload = buildPayload(form);
      const { ok, status, data } = await createIntern(payload);

      if (ok) {
        // 201 — thành công (tái sử dụng buildToast — pattern chuẩn project)
        const t = buildToast(ok, status, data, 'Thêm hồ sơ thực tập sinh thành công!');
        showToast(t.type, t.message);
        setForm(INITIAL_FORM); // Reset form (xem TODO: có thể thay bằng redirect)
      } else if (status === 409) {
        // Email trùng
        const msg = data?.detail ?? 'Email đã được sử dụng trong hệ thống.';
        setErrors({ email: msg });
        showToast('error', msg);
      } else if (status === 422) {
        // Validate fail từ BE (format FastAPI: { detail: [...] } hoặc { detail: "..." })
        const detail = data?.detail;
        if (Array.isArray(detail)) {
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
        // 500 hoặc lỗi khác — tái sử dụng buildToast
        const t = buildToast(ok, status, data);
        showToast(t.type, t.message);
      }
    } catch {
      showToast('error', 'Không thể kết nối tới máy chủ, vui lòng thử lại.');
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
