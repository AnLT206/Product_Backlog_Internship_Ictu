/**
 * InternEditPage.jsx
 * Route: /hr/interns/:id/edit
 *
 * US 2: "Là HR, tôi muốn chỉnh sửa hồ sơ thực tập sinh để cập nhật thông tin thay đổi."
 *
 * QUYẾT ĐỊNH THIẾT KẾ (ghi vào PR):
 *   - TẠO FILE RIÊNG, không tái cấu trúc InternCreatePage.jsx (607 dòng,
 *     nguy cơ cao). Có thể refactor gộp sau khi ổn định.
 *
 * DÙNG LẠI (không viết lại):
 *   - updateIntern(internId, payload) — từ src/api/interns.js
 *   - buildToast(ok, status, data, msg)  — từ src/api/interns.js
 *   - getInternById(internId)            — từ src/api/interns.js (thêm task này)
 *   - InternCreatePage.css              — kế thừa 100% (form-group, button, toast…)
 *
 * ESLint (set-state-in-effect):
 *   loadInternData() khai báo TRƯỚC useEffect + mọi setState SAU await.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInternById, updateIntern, uploadInternCv, buildToast } from '../../api/interns';
import './InternCreatePage.css'; // Kế thừa toàn bộ theme/CSS

/* ─────────────────────────────────────────────
   Hằng số options (copy từ InternCreatePage — không import để tránh sửa file cũ)
───────────────────────────────────────────── */
const GENDER_OPTIONS = [
  { value: 'male',   label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other',  label: 'Khác' },
];

const ACADEMIC_YEAR_OPTIONS = [
  { value: '1', label: 'Năm 1' },
  { value: '2', label: 'Năm 2' },
  { value: '3', label: 'Năm 3' },
  { value: '4', label: 'Năm 4' },
  { value: '5', label: 'Năm 5+' },
];

/* ─────────────────────────────────────────────
   Regex helpers (copy từ InternCreatePage)
───────────────────────────────────────────── */
const PHONE_REGEX = /^(0[0-9]{8,10}|\+84[0-9]{8,10})$/;
const DATE_REGEX  = /^\d{4}-\d{2}-\d{2}$/;

/* ─────────────────────────────────────────────
   validateForm — rule y hệt InternCreatePage
   (bỏ email vì HR không đổi email qua PUT)
───────────────────────────────────────────── */
function validateForm(form) {
  const errors = {};

  const fullName = form.full_name.trim();
  if (!fullName)                  errors.full_name = 'Vui lòng nhập họ và tên.';
  else if (fullName.length > 100) errors.full_name = 'Họ và tên không được vượt quá 100 ký tự.';

  const phone = form.phone_number.trim();
  if (phone) {
    const phoneSanitised = phone.replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(phoneSanitised))
      errors.phone_number = 'Số điện thoại phải bắt đầu bằng "0" (10–11 số) hoặc "+84" (10–11 số).';
  }

  if (form.dob && !DATE_REGEX.test(form.dob))
    errors.dob = 'Ngày sinh không đúng định dạng.';

  const validGenders = ['male', 'female', 'other'];
  if (form.gender && !validGenders.includes(form.gender))
    errors.gender = 'Giới tính không hợp lệ.';

  const university = form.university.trim();
  if (!university)                  errors.university = 'Vui lòng nhập tên trường.';
  else if (university.length > 150) errors.university = 'Tên trường không được vượt quá 150 ký tự.';

  const major = form.major.trim();
  if (!major)                  errors.major = 'Vui lòng nhập ngành học.';
  else if (major.length > 150) errors.major = 'Ngành học không được vượt quá 150 ký tự.';

  if (form.academic_year && form.academic_year.length > 50)
    errors.academic_year = 'Năm học không được vượt quá 50 ký tự.';

  if (form.gpa !== '') {
    const gpaNum = Number(form.gpa);
    if (Number.isNaN(gpaNum))          errors.gpa = 'GPA phải là số.';
    else if (gpaNum < 0 || gpaNum > 4) errors.gpa = 'GPA phải trong khoảng 0 – 4.';
  }

  if (form.address.trim().length > 255)
    errors.address = 'Địa chỉ không được vượt quá 255 ký tự.';

  return errors;
}

/* ─────────────────────────────────────────────
   buildPayload — chuẩn hoá trước khi gửi API
───────────────────────────────────────────── */
function buildPayload(form) {
  const payload = { full_name: form.full_name.trim() };
  if (form.phone_number.trim())
    payload.phone_number  = form.phone_number.trim().replace(/[\s-]/g, '');
  if (form.dob)            payload.dob           = form.dob;
  if (form.gender)         payload.gender        = form.gender;
  if (form.university.trim()) payload.university = form.university.trim();
  if (form.major.trim())   payload.major         = form.major.trim();
  if (form.academic_year)  payload.academic_year = form.academic_year;
  if (form.gpa !== '')     payload.gpa           = Number(form.gpa);
  if (form.address.trim()) payload.address       = form.address.trim();
  return payload;
}

/* ─────────────────────────────────────────────
   Helper: API response → form state
───────────────────────────────────────────── */
function mapApiToForm(data) {
  return {
    full_name:     data.full_name     ?? '',
    phone_number:  data.phone_number  ?? '',
    dob:           data.dob           ?? '',
    gender:        data.gender        ?? '',
    university:    data.university    ?? '',
    major:         data.major         ?? '',
    academic_year: data.academic_year != null ? String(data.academic_year) : '',
    gpa:           data.gpa           != null ? String(data.gpa)           : '',
    address:       data.address       ?? '',
  };
}

const EMPTY_FORM = {
  full_name: '', phone_number: '', dob: '', gender: '',
  university: '', major: '', academic_year: '', gpa: '', address: '',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
function InternEditPage() {
  const { id: internId } = useParams();
  const navigate = useNavigate();

  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [internEmail, setInternEmail] = useState('');

  // State upload CV ứng viên
  const [cvFile, setCvFile]       = useState(null);
  const [cvError, setCvError]     = useState('');
  const [isDragging, setIsDragging] = useState(false);

  /* ── loadInternData khai báo TRƯỚC useEffect — tránh ESLint lỗi ── */
  async function loadInternData() {
    const { ok, status, data } = await getInternById(internId);
    if (ok) {
      setForm(mapApiToForm(data));
      setInternEmail(data.email ?? '');
    } else {
      setLoadError(
        status === 404
          ? 'Không tìm thấy hồ sơ thực tập sinh này.'
          : (data?.detail ?? 'Không thể tải hồ sơ, vui lòng thử lại.')
      );
    }
    setPageLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInternData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internId]);

  /* ── Handlers ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  }

  function validateAndSetCv(file) {
    if (!file) return;
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setCvError('Chỉ chấp nhận file định dạng PDF, DOC hoặc DOCX.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvError('Dung lượng file không được vượt quá 5MB.');
      return;
    }
    setCvError('');
    setCvFile(file);
  }

  function handleCvChange(e) {
    const file = e.target.files?.[0];
    if (file) validateAndSetCv(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetCv(file);
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

    setSubmitting(true);
    setErrors({});
    try {
      const payload = buildPayload(form);
      const { ok, status, data } = await updateIntern(internId, payload);

      if (ok) {
        let cvOk = true;
        if (cvFile) {
          try {
            const cvRes = await uploadInternCv(internId, cvFile);
            if (!cvRes.ok) cvOk = false;
          } catch {
            cvOk = false;
          }
        }

        if (cvFile && !cvOk) {
          showToast('error', 'Đã cập nhật hồ sơ nhưng tải lên CV thất bại. Vui lòng thử lại.');
        } else {
          showToast('success', cvFile ? 'Cập nhật hồ sơ và tải lên CV mới thành công!' : 'Cập nhật hồ sơ thành công!');
          setCvFile(null);
        }
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
        const t = buildToast(ok, status, data);
        showToast(t.type, t.message);
      }
    } catch {
      showToast('error', 'Không thể kết nối tới máy chủ, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render: đang tải ── */
  if (pageLoading) {
    return (
      <div className="intern-create-page">
        <div className="intern-create-page__glow" aria-hidden="true" />
        <div className="intern-create-shell">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '60px 0', color: '#65676b' }} role="status">
            <span className="intern-create-spinner" aria-hidden="true" />
            Đang tải hồ sơ…
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: lỗi tải ── */
  if (loadError) {
    return (
      <div className="intern-create-page">
        <div className="intern-create-page__glow" aria-hidden="true" />
        <div className="intern-create-shell">
          <div className="intern-create-toast intern-create-toast--error" role="alert" style={{ position: 'static' }}>
            ✕ {loadError}
          </div>
          <div className="intern-create-actions" style={{ justifyContent: 'flex-start', paddingTop: 16 }}>
            <button type="button" className="intern-create-cancel" onClick={() => navigate('/hr/interns')}>
              ← Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: form ── */
  return (
    <div className="intern-create-page">
      <div className="intern-create-page__glow" aria-hidden="true" />

      {/* Toast */}
      {toast && (
        <div
          id="hr-ie-toast"
          className={`intern-create-toast intern-create-toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      <div className="intern-create-shell">

        {/* Back link */}
        <a href="/hr/interns" className="intern-create-brand">
          ← Quay lại danh sách hồ sơ
        </a>

        {/* Card */}
        <div className="intern-create-card">

          {/* Header */}
          <div className="intern-create-header">
            <span className="intern-create-badge">HR</span>
            <h1>Chỉnh sửa <span>hồ sơ</span> thực tập sinh</h1>
            <p className="intern-create-lead">
              Cập nhật thông tin hồ sơ TTS.{' '}
              Trường có dấu <abbr title="bắt buộc" style={{ color: '#e02424', textDecoration: 'none' }}>*</abbr> là bắt buộc.
            </p>
          </div>

          {/* Email readonly */}
          {internEmail && (
            <div style={{ padding: '0 32px 4px' }}>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#65676b', marginBottom: 6 }}>
                  Email (không thể thay đổi)
                </label>
                <input
                  type="email"
                  value={internEmail}
                  readOnly
                  tabIndex={-1}
                  aria-label="Email không thể thay đổi"
                  style={{
                    width: '100%', height: 46, padding: '0 14px',
                    border: '1.5px solid #e4e6eb', borderRadius: 12,
                    fontSize: 15, fontFamily: 'inherit', color: '#65676b',
                    background: '#f8fafc', cursor: 'not-allowed', outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Form */}
          <form
            id="hr-intern-edit-form"
            className="intern-create-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* ── Layout 2 cột song song: Thông tin cơ bản & Thông tin học vấn ── */}
            <div className="intern-create-grid-2">

              {/* ── Cột 1: Thông tin cơ bản ── */}
              <fieldset className="intern-create-col">
                <legend className="intern-create-section__title">
                  Thông tin cơ bản
                </legend>

                {/* Họ và tên */}
                <div className={`form-group${errors.full_name ? ' form-group--error' : ''}`}>
                  <label htmlFor="ie-full-name">
                    Họ và tên <span className="intern-create-required">*</span>
                  </label>
                  <input
                    id="ie-full-name"
                    name="full_name"
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    autoComplete="off"
                    value={form.full_name}
                    onChange={handleChange}
                    aria-describedby={errors.full_name ? 'err-ie-name' : undefined}
                  />
                  {errors.full_name && (
                    <span id="err-ie-name" className="form-error" role="alert">{errors.full_name}</span>
                  )}
                </div>

                {/* Số điện thoại */}
                <div className={`form-group${errors.phone_number ? ' form-group--error' : ''}`}>
                  <label htmlFor="ie-phone">Số điện thoại</label>
                  <input
                    id="ie-phone"
                    name="phone_number"
                    type="tel"
                    placeholder="VD: 0912345678"
                    autoComplete="off"
                    value={form.phone_number}
                    onChange={handleChange}
                    aria-describedby={errors.phone_number ? 'err-ie-phone' : undefined}
                  />
                  {errors.phone_number && (
                    <span id="err-ie-phone" className="form-error" role="alert">{errors.phone_number}</span>
                  )}
                </div>

                {/* Ngày sinh + Giới tính */}
                <div className="intern-create-row">
                  <div className={`form-group${errors.dob ? ' form-group--error' : ''}`}>
                    <label htmlFor="ie-dob">Ngày sinh</label>
                    <input
                      id="ie-dob"
                      name="dob"
                      type="date"
                      value={form.dob}
                      onChange={handleChange}
                      aria-describedby={errors.dob ? 'err-ie-dob' : undefined}
                    />
                    {errors.dob && (
                      <span id="err-ie-dob" className="form-error" role="alert">{errors.dob}</span>
                    )}
                  </div>

                  <div className={`form-group${errors.gender ? ' form-group--error' : ''}`}>
                    <label htmlFor="ie-gender">Giới tính</label>
                    <select
                      id="ie-gender"
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      aria-describedby={errors.gender ? 'err-ie-gender' : undefined}
                    >
                      <option value="">— Chọn giới tính —</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {errors.gender && (
                      <span id="err-ie-gender" className="form-error" role="alert">{errors.gender}</span>
                    )}
                  </div>
                </div>

                {/* Địa chỉ */}
                <div className={`form-group${errors.address ? ' form-group--error' : ''}`}>
                  <label htmlFor="ie-address">Địa chỉ liên hệ</label>
                  <input
                    id="ie-address"
                    name="address"
                    type="text"
                    placeholder="VD: 123 Đường ABC, Thái Nguyên"
                    autoComplete="off"
                    value={form.address}
                    onChange={handleChange}
                    aria-describedby={errors.address ? 'err-ie-address' : undefined}
                  />
                  {errors.address && (
                    <span id="err-ie-address" className="form-error" role="alert">{errors.address}</span>
                  )}
                </div>
              </fieldset>

              {/* ── Cột 2: Thông tin học vấn ── */}
              <fieldset className="intern-create-col">
                <legend className="intern-create-section__title">
                  Thông tin học vấn
                </legend>

                {/* Trường đại học */}
                <div className={`form-group${errors.university ? ' form-group--error' : ''}`}>
                  <label htmlFor="ie-university">
                    Trường đại học <span className="intern-create-required">*</span>
                  </label>
                  <input
                    id="ie-university"
                    name="university"
                    type="text"
                    placeholder="VD: Đại học Công nghệ thông tin và Truyền thông"
                    autoComplete="off"
                    value={form.university}
                    onChange={handleChange}
                    aria-describedby={errors.university ? 'err-ie-university' : undefined}
                  />
                  {errors.university && (
                    <span id="err-ie-university" className="form-error" role="alert">{errors.university}</span>
                  )}
                </div>

                {/* Ngành học */}
                <div className={`form-group${errors.major ? ' form-group--error' : ''}`}>
                  <label htmlFor="ie-major">
                    Ngành học <span className="intern-create-required">*</span>
                  </label>
                  <input
                    id="ie-major"
                    name="major"
                    type="text"
                    placeholder="VD: Công nghệ thông tin"
                    autoComplete="off"
                    value={form.major}
                    onChange={handleChange}
                    aria-describedby={errors.major ? 'err-ie-major' : undefined}
                  />
                  {errors.major && (
                    <span id="err-ie-major" className="form-error" role="alert">{errors.major}</span>
                  )}
                </div>

                {/* Năm học + GPA */}
                <div className="intern-create-row">
                  <div className={`form-group${errors.academic_year ? ' form-group--error' : ''}`}>
                    <label htmlFor="ie-academic-year">Năm học</label>
                    <select
                      id="ie-academic-year"
                      name="academic_year"
                      value={form.academic_year}
                      onChange={handleChange}
                      aria-describedby={errors.academic_year ? 'err-ie-ay' : undefined}
                    >
                      <option value="">— Chọn năm —</option>
                      {ACADEMIC_YEAR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {errors.academic_year && (
                      <span id="err-ie-ay" className="form-error" role="alert">{errors.academic_year}</span>
                    )}
                  </div>

                  <div className={`form-group${errors.gpa ? ' form-group--error' : ''}`}>
                    <label htmlFor="ie-gpa">GPA (0 – 4)</label>
                    <input
                      id="ie-gpa"
                      name="gpa"
                      type="number"
                      min="0"
                      max="4"
                      step="0.01"
                      placeholder="VD: 3.50"
                      value={form.gpa}
                      onChange={handleChange}
                      aria-describedby={errors.gpa ? 'err-ie-gpa' : undefined}
                    />
                    {errors.gpa && (
                      <span id="err-ie-gpa" className="form-error" role="alert">{errors.gpa}</span>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 'auto' }}>
                  <label htmlFor="ie-note">Mã hồ sơ hệ thống</label>
                  <input
                    id="ie-note"
                    type="text"
                    readOnly
                    value={`ID: ${internId} · Trạng thái hoạt động bình thường`}
                    style={{ background: '#f8fafc', color: '#65676b' }}
                  />
                </div>
              </fieldset>

            </div>

            {/* ── Khu vực Upload CV của ứng viên (ở phía dưới 2 cột) ── */}
            <div className="intern-create-cv-section">
              <div className="intern-create-section__title">
                Hồ sơ & CV của ứng viên
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#65676b' }}>
                Cập nhật bản CV hoặc tài liệu đính kèm của ứng viên (PDF, DOC, DOCX - tối đa 5MB).
              </p>

              {!cvFile ? (
                <div
                  className={`intern-cv-dropzone${isDragging ? ' intern-cv-dropzone--dragover' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCvChange}
                    aria-label="Tải lên file CV mới"
                  />
                  <div className="intern-cv-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 14.5v3.5a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-3.5" />
                      <polyline points="6.5 9 12 3.5 17.5 9" />
                      <line x1="12" y1="3.5" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="intern-cv-prompt">
                    <strong>Nhấn để tải lên CV mới</strong> hoặc kéo thả file vào đây
                  </div>
                  <div className="intern-cv-hint">
                    Hỗ trợ định dạng PDF, DOC, DOCX (Dung lượng tối đa 5 MB)
                  </div>
                </div>
              ) : (
                <div className="intern-cv-card">
                  <div className="intern-cv-card-left">
                    <div className="intern-cv-card-badge">
                      {cvFile.name.split('.').pop().toUpperCase()}
                    </div>
                    <div className="intern-cv-card-meta">
                      <div className="intern-cv-card-name">{cvFile.name}</div>
                      <div className="intern-cv-card-size">
                        {(cvFile.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng cập nhật
                      </div>
                    </div>
                  </div>
                  <div className="intern-cv-card-actions">
                    <button
                      type="button"
                      className="intern-cv-remove-btn"
                      onClick={() => { setCvFile(null); setCvError(''); }}
                    >
                      Hủy file mới
                    </button>
                  </div>
                </div>
              )}

              {cvError && (
                <span className="form-error" role="alert" style={{ marginTop: 8 }}>
                  {cvError}
                </span>
              )}
            </div>


            {/* ── Actions ── */}
            <div className="intern-create-actions">
              <a href="/hr/interns" className="intern-create-cancel" id="hr-ie-cancel-btn">
                Hủy
              </a>
              <button
                id="hr-ie-submit-btn"
                type="submit"
                className="intern-create-button"
                disabled={submitting}
              >
                {submitting && <span className="intern-create-spinner" aria-hidden="true" />}
                {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default InternEditPage;
