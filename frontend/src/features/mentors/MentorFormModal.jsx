/**
 * MentorFormModal.jsx
 * Popup form thêm mới Mentor — dạng modal overlay (không chuyển trang).
 *
 * US 29 (spec §7.3): "Là HR, tôi muốn thêm mới mentor để phân công cho TTS."
 *
 * TASK 1 (task này):
 *   - Giao diện tĩnh: form Họ tên*, Email*, Phòng ban* (dropdown placeholder).
 *   - Validate phía client: bắt buộc + format email đơn giản.
 *   - Nút Lưu / Hủy — đóng modal khi Hủy hoặc submit thành công giả.
 *   - CHƯA gọi API (task 2 sẽ nối POST /api/hr/mentors).
 *
 * Props:
 *   onClose  {() => void}       — đóng modal (bấm Hủy hoặc backdrop)
 *   onSaved  {(mentor) => void} — callback khi "lưu" (task 1: trả về mock data)
 *
 * TODO (task 2):
 *   - Import { createMentor } from '../../api/mentors' và gọi API thật.
 *   - Dropdown phòng ban: lấy từ GET /api/hr/departments (hoặc danh sách cố định).
 */

import { useState } from 'react';
import './MentorFormModal.css';

/* ─────────────────────────────────────────────────────────────────────────────
   Danh sách phòng ban tạm thời (placeholder)
   TODO (task 2): Thay bằng dữ liệu thật từ API hoặc constants/departments.js
   ───────────────────────────────────────────────────────────────────────── */
const DEPT_OPTIONS = [
  'Công nghệ thông tin',
  'Kỹ thuật phần mềm',
  'Hạ tầng & Vận hành',
  'Thiết kế & Trải nghiệm',
  'Kinh doanh & Marketing',
];

/** Regex email đơn giản — đủ cho client-side validate */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─────────────────────────────────────────────────────────────────────────────
   Validate helper
   ───────────────────────────────────────────────────────────────────────── */
function validateForm({ full_name, email, department }) {
  const errors = {};
  if (!full_name.trim())        errors.full_name   = 'Vui lòng nhập họ tên.';
  if (!email.trim())            errors.email       = 'Vui lòng nhập email.';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Email không đúng định dạng.';
  if (!department)              errors.department  = 'Vui lòng chọn phòng ban.';
  return errors;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
function MentorFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name:  '',
    email:      '',
    department: '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  /* ── Handlers ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // TODO (task 2): Thay khối mock bên dưới bằng gọi API thật:
    //   const { ok, status, data } = await createMentor({ ...form });
    setLoading(true);
    setTimeout(() => {
      // Mock: giả lập lưu thành công, trả về mentor vừa tạo
      const saved = {
        id:         Math.floor(Math.random() * 9000) + 1000,
        full_name:  form.full_name.trim(),
        email:      form.email.trim().toLowerCase(),
        department: form.department,
        intern_count: 0,
      };
      setLoading(false);
      onSaved(saved);
    }, 500);
  }

  /* ── Đóng khi click backdrop ── */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && !loading) onClose();
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
            disabled={loading}
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

          {/* Phòng ban * — dropdown placeholder, task 2 nối API */}
          <div className={`mentor-form-group${errors.department ? ' mentor-form-group--error' : ''}`}>
            <label htmlFor="mentor-department">
              Phòng ban <span className="required">*</span>
            </label>
            <select
              id="mentor-department"
              name="department"
              value={form.department}
              onChange={handleChange}
              aria-describedby={errors.department ? 'err-mentor-dept' : undefined}
            >
              {/* TODO (task 2): Thay options này bằng dữ liệu thật từ API */}
              <option value="">— Chọn phòng ban —</option>
              {DEPT_OPTIONS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {errors.department && (
              <span id="err-mentor-dept" className="mentor-form-error" role="alert">
                {errors.department}
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
            disabled={loading}
          >
            Hủy
          </button>
          <button
            id="mentor-modal-save-btn"
            type="submit"
            form="mentor-add-form"
            className="mentor-modal-submit"
            disabled={loading}
          >
            {loading ? 'Đang lưu…' : 'Lưu mentor'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default MentorFormModal;
