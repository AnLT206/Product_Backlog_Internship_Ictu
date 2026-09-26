/**
 * MentorFormModal.jsx
 * Popup form thêm mới Mentor — dạng modal overlay (không chuyển trang).
 *
 * US 29 (spec §7.3): "Là HR, tôi muốn thêm mới mentor để phân công cho TTS."
 *
 * TASK 1 (đã xong): Giao diện tĩnh, validate client, dropdown placeholder.
 *
 * TASK 2 (task này):
 *   - Khi mở popup: gọi getDepartments() → đổ vào dropdown (thay placeholder tĩnh).
 *   - Khi submit: gọi createMentor() → xử lý 201/409/422.
 *   - Tái sử dụng buildToast() từ src/api/interns.js (quy ước project).
 *
 * API đã dùng (đã có thật ở backend):
 *   GET  /api/departments  → [{ id, name }]
 *   POST /api/hr/mentors   → { id, email, full_name, ... }
 *
 * Props:
 *   onClose  {() => void}            — đóng modal (bấm Hủy hoặc backdrop)
 *   onSaved  {(mentor) => void}      — callback khi tạo thành công (truyền MentorResponse)
 *   onToast  {(toast) => void}       — callback hiển thị toast ở MentorListPage
 */

import { useState, useEffect } from 'react';
import { getDepartments, createMentor } from '../../api/mentors';
import { buildToast } from '../../api/interns';
import './MentorFormModal.css';

/* ─────────────────────────────────────────────────────────────────────────────
   Validate helper
   Fields bắt buộc theo MentorCreateRequest (backend/app/schemas/mentor.py):
     full_name  — min 1 ký tự
     email      — định dạng email hợp lệ
     password   — min 6 ký tự
     department_id — optional, nhưng form yêu cầu chọn (UX)
   ───────────────────────────────────────────────────────────────────────── */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm({ full_name, email, password, department_id }) {
  const errors = {};
  if (!full_name.trim())
    errors.full_name = 'Vui lòng nhập họ tên.';
  if (!email.trim())
    errors.email = 'Vui lòng nhập email.';
  else if (!EMAIL_REGEX.test(email.trim()))
    errors.email = 'Email không đúng định dạng.';
  if (!password)
    errors.password = 'Vui lòng nhập mật khẩu tạm.';
  else if (password.length < 6)
    errors.password = 'Mật khẩu tối thiểu 6 ký tự.';
  if (!department_id)
    errors.department_id = 'Vui lòng chọn phòng ban.';
  return errors;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
function MentorFormModal({ onClose, onSaved, onToast }) {
  const [form, setForm] = useState({
    full_name:     '',
    email:         '',
    password:      '',
    department_id: '',
  });
  const [errors,       setErrors]       = useState({});
  const [submitting,   setSubmitting]   = useState(false);

  /* ── Departments state ── */
  const [departments,  setDepartments]  = useState([]);
  const [deptLoading,  setDeptLoading]  = useState(true);
  const [deptError,    setDeptError]    = useState(null);

  /* ── Load danh sách phòng ban khi mở modal ──
     Mọi setState đặt SAU await → tránh react-hooks/set-state-in-effect  */
  async function loadDepartments() {
    const { ok, data } = await getDepartments();
    if (ok) {
      setDepartments(data ?? []);
    } else {
      setDeptError('Không tải được danh sách phòng ban.');
    }
    setDeptLoading(false);
  }

  /* void trước lời gọi hàm — eslint-disable vì mọi setState đều SAU await */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDepartments();
  }, []);

  /* ── Handlers ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    const body = {
      full_name:     form.full_name.trim(),
      email:         form.email.trim().toLowerCase(),
      password:      form.password,
      department_id: form.department_id ? Number(form.department_id) : null,
    };

    const { ok, status, data } = await createMentor(body);

    setSubmitting(false);

    if (ok) {
      // Gọi callback thành công — trả về MentorResponse từ API
      onSaved(data);
      // Toast thành công — tái sử dụng buildToast (quy ước project)
      onToast(buildToast(ok, status, data, `Đã thêm mentor "${data.full_name}" thành công!`));
    } else if (status === 409) {
      // Email trùng
      setErrors({ email: data?.detail ?? 'Email này đã được sử dụng.' });
    } else {
      // 422 validate backend hoặc lỗi khác
      const t = buildToast(ok, status, data);
      onToast(t);
    }
  }

  /* ── Đóng khi click backdrop ── */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && !submitting) onClose();
  }

  /* ── Render ── */
  return (
    <div
      className="mentor-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mentor-modal-title"
    >
      <div className="mentor-modal-dialog">

        {/* Header */}
        <div className="mentor-modal-header">
          <div className="mentor-modal-title-wrap">
            <div className="mentor-modal-badge">HR</div>
            <h2 id="mentor-modal-title">
              Thêm <span>Mentor</span> mới
            </h2>
          </div>
          <button
            id="mentor-modal-close-btn"
            type="button"
            className="mentor-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng popup"
          >
            ×
          </button>
        </div>

        <hr className="mentor-modal-divider" />

        {/* Form */}
        <form
          id="mentor-add-form"
          className="mentor-modal-body"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Họ tên * */}
          <div className={`mentor-form-group${errors.full_name ? ' mentor-form-group--error' : ''}`}>
            <label htmlFor="mentor-full-name">
              Họ tên <span className="required">*</span>
            </label>
            <input
              id="mentor-full-name"
              name="full_name"
              type="text"
              placeholder="VD: Nguyễn Văn A"
              autoComplete="off"
              value={form.full_name}
              onChange={handleChange}
              aria-describedby={errors.full_name ? 'err-mentor-name' : undefined}
            />
            {errors.full_name && (
              <span id="err-mentor-name" className="mentor-form-error" role="alert">
                {errors.full_name}
              </span>
            )}
          </div>

          {/* Email * */}
          <div className={`mentor-form-group${errors.email ? ' mentor-form-group--error' : ''}`}>
            <label htmlFor="mentor-email">
              Email <span className="required">*</span>
            </label>
            <input
              id="mentor-email"
              name="email"
              type="email"
              placeholder="VD: mentor@ictu.edu.vn"
              autoComplete="off"
              value={form.email}
              onChange={handleChange}
              aria-describedby={errors.email ? 'err-mentor-email' : undefined}
            />
            {errors.email && (
              <span id="err-mentor-email" className="mentor-form-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* Mật khẩu tạm * */}
          <div className={`mentor-form-group${errors.password ? ' mentor-form-group--error' : ''}`}>
            <label htmlFor="mentor-password">
              Mật khẩu tạm <span className="required">*</span>
            </label>
            <input
              id="mentor-password"
              name="password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              aria-describedby={errors.password ? 'err-mentor-password' : undefined}
            />
            {errors.password && (
              <span id="err-mentor-password" className="mentor-form-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* Phòng ban * — dữ liệu thật từ GET /api/departments */}
          <div className={`mentor-form-group${errors.department_id ? ' mentor-form-group--error' : ''}`}>
            <label htmlFor="mentor-department">
              Phòng ban <span className="required">*</span>
            </label>
            <select
              id="mentor-department"
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
              disabled={deptLoading}
              aria-describedby={errors.department_id ? 'err-mentor-dept' : undefined}
            >
              <option value="">
                {deptLoading ? 'Đang tải…' : deptError ? 'Lỗi tải phòng ban' : '— Chọn phòng ban —'}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.department_id && (
              <span id="err-mentor-dept" className="mentor-form-error" role="alert">
                {errors.department_id}
              </span>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="mentor-modal-footer">
          <button
            id="mentor-modal-cancel-btn"
            type="button"
            className="mentor-modal-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            id="mentor-modal-save-btn"
            type="submit"
            form="mentor-add-form"
            className="mentor-modal-submit"
            disabled={submitting || deptLoading}
          >
            {submitting ? 'Đang lưu…' : 'Lưu mentor'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default MentorFormModal;
