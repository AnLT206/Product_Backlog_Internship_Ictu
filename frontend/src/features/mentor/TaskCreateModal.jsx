/**
 * TaskCreateModal.jsx
 * Modal form tạo nhiệm vụ mới — dành cho Mentor (US 15).
 *
 * US 15: "Là Mentor, tôi muốn giao nhiệm vụ cho thực tập sinh
 *          để họ có công việc cụ thể."
 *
 * TASK 1: Giao diện form 4 trường (Tiêu đề, Mô tả, Hạn chót, Intern phụ trách).
 * TASK 2: Submit form → POST /api/mentor/tasks → báo component cha để cập nhật
 *         danh sách ngay (không reload trang).
 *
 * Dropdown Intern CHỈ lấy từ GET /api/mentor/assigned-interns
 * (TTS đã được HR phân công cho Mentor) — không dùng /api/hr/interns.
 *
 * Props:
 *   onClose          {() => void}       — đóng modal (Hủy / nút × / click backdrop)
 *   onSuccess        {(task) => void}   — gọi khi tạo thành công, truyền TaskResponse thật từ API
 *   onSaved          {(task) => void}   — alias cũ của onSuccess (giữ tương thích)
 *   onToast          {(toast) => void}  — hiển thị toast ở trang cha
 *   initialInternId  {string|number}    — (tuỳ chọn) chọn sẵn intern trong dropdown
 */

import { useEffect, useState } from 'react';
import { getAssignedInterns } from '../../api/mentors';
import { createMentorTask } from '../../api/tasks';
import './TaskCreateModal.css';

const TITLE_MAX = 255;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */
function validateForm({ title, intern_id }) {
  const errors = {};
  const trimmed = title.trim();
  if (!trimmed) {
    errors.title = 'Vui lòng nhập tiêu đề nhiệm vụ.';
  } else if (trimmed.length > TITLE_MAX) {
    errors.title = `Tiêu đề không được vượt quá ${TITLE_MAX} ký tự.`;
  }
  if (!intern_id || Number.isNaN(Number(intern_id))) {
    errors.intern_id = 'Vui lòng chọn thực tập sinh phụ trách.';
  }
  return errors;
}

/**
 * Chuyển giá trị input datetime-local ("YYYY-MM-DDTHH:mm") sang ISO datetime
 * không kèm timezone ("YYYY-MM-DDTHH:mm:ss") — đúng format backend đang nhận.
 * KHÔNG dùng toISOString() vì sẽ đổi sang UTC và thêm "Z".
 */
function toApiDateTime(value) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00` : value;
}

/** Lấy thông báo lỗi dễ đọc từ response FastAPI (string hoặc mảng 422). */
function extractDetail(data) {
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d?.msg).filter(Boolean).join(' ');
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────────── */
function TaskCreateModal({ onClose, onSuccess, onSaved, onToast, initialInternId }) {
  const [form, setForm] = useState({
    title:       '',
    description: '',
    due_at:      '',
    intern_id:   initialInternId ? String(initialInternId) : '',
  });
  const [errors,      setErrors]      = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  /* ── Intern list state ── */
  const [interns,       setInterns]       = useState([]);
  const [internLoading, setInternLoading] = useState(true);
  const [internError,   setInternError]   = useState(null);

  /* ── Load danh sách TTS thuộc quyền Mentor khi mở modal ──
     Mọi setState đặt SAU await → tránh react-hooks/set-state-in-effect  */
  async function loadInterns() {
    const { ok, data } = await getAssignedInterns();
    if (ok) {
      setInterns(data?.items ?? []);
    } else {
      setInternError('Không tải được danh sách thực tập sinh.');
    }
    setInternLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInterns();
  }, []);

  /* ── Handlers ── */
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
    if (submitError) setSubmitError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return; // chặn submit nhiều lần liên tiếp

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // không gọi API khi form không hợp lệ
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      intern_id:   Number(form.intern_id),
      title:       form.title.trim(),
      description: form.description.trim() || null,
      due_at:      toApiDateTime(form.due_at),
      status:      'todo',
      progress:    0,
    };

    let result;
    try {
      result = await createMentorTask(payload);
    } catch {
      setSubmitting(false);
      setSubmitError('Không kết nối được máy chủ. Vui lòng thử lại.');
      return;
    }

    const { ok, status: httpStatus, data } = result;
    setSubmitting(false);

    if (ok) {
      // 201 Created — data là TaskResponse thật từ backend
      const notify = onSuccess ?? onSaved;
      if (notify) notify(data);
      if (onToast) {
        onToast({ type: 'success', message: `Đã giao nhiệm vụ "${data?.title ?? payload.title}" thành công!` });
      }
      onClose();
      return;
    }

    // Lỗi: giữ modal mở + giữ dữ liệu đã nhập, cho phép submit lại
    const detail = extractDetail(data);
    if (httpStatus === 403) {
      const msg = detail ?? 'Bạn chỉ có thể giao việc cho thực tập sinh thuộc quyền quản lý của mình.';
      setErrors({ intern_id: msg });
      setSubmitError(msg);
    } else if (httpStatus === 404) {
      const msg = detail ?? 'Không tìm thấy thực tập sinh tương ứng.';
      setErrors({ intern_id: msg });
      setSubmitError(msg);
    } else if (httpStatus === 400 || httpStatus === 422) {
      setSubmitError(detail ?? 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
    } else if (httpStatus === 401) {
      setSubmitError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    } else {
      setSubmitError(detail ?? `Lỗi máy chủ (HTTP ${httpStatus}). Vui lòng thử lại.`);
    }
  }

  /* ── Đóng khi click backdrop (không cho đóng khi đang gửi) ── */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && !submitting) onClose();
  }

  /* ── Label hiển thị cho một intern trong dropdown ── */
  function internLabel(intern) {
    const code = intern.intern_code || intern.intern_email;
    return `${intern.intern_name ?? intern.intern_email} (${code})`;
  }

  const noInterns = !internLoading && !internError && interns.length === 0;

  /* ── Render ── */
  return (
    <div
      className="tc-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tc-modal-title"
    >
      <div className="tc-modal-dialog">

        {/* Header */}
        <div className="tc-modal-header">
          <div className="tc-modal-title-wrap">
            <div className="tc-modal-badge">Mentor</div>
            <h2 id="tc-modal-title">
              Giao <span>nhiệm vụ</span> mới
            </h2>
          </div>
          <button
            id="tc-modal-close-btn"
            type="button"
            className="tc-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng popup"
          >
            ×
          </button>
        </div>

        <hr className="tc-modal-divider" />

        {/* Form */}
        <form
          id="tc-task-form"
          className="tc-modal-body"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting}
        >

          {/* Banner lỗi submit (lỗi từ API) */}
          {submitError && (
            <div id="tc-submit-error" className="tc-submit-error" role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Tiêu đề * */}
          <div className={`tc-form-group${errors.title ? ' tc-form-group--error' : ''}`}>
            <label htmlFor="tc-title">
              Tiêu đề nhiệm vụ <span className="tc-required">*</span>
            </label>
            <input
              id="tc-title"
              name="title"
              type="text"
              placeholder="VD: Nghiên cứu kiến trúc backend"
              maxLength={TITLE_MAX}
              autoComplete="off"
              value={form.title}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={errors.title ? 'err-tc-title' : undefined}
            />
            {errors.title && (
              <span id="err-tc-title" className="tc-form-error" role="alert">
                {errors.title}
              </span>
            )}
          </div>

          {/* Mô tả */}
          <div className="tc-form-group">
            <label htmlFor="tc-description">Mô tả</label>
            <textarea
              id="tc-description"
              name="description"
              placeholder="Mô tả chi tiết nhiệm vụ (tùy chọn)"
              rows={4}
              value={form.description}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* Hạn chót */}
          <div className="tc-form-group">
            <label htmlFor="tc-due-at">Hạn chót</label>
            <input
              id="tc-due-at"
              name="due_at"
              type="datetime-local"
              value={form.due_at}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* Intern phụ trách * — dữ liệu thật từ GET /api/mentor/assigned-interns */}
          <div className={`tc-form-group${errors.intern_id ? ' tc-form-group--error' : ''}`}>
            <label htmlFor="tc-intern">
              Intern phụ trách <span className="tc-required">*</span>
            </label>
            <select
              id="tc-intern"
              name="intern_id"
              value={form.intern_id}
              onChange={handleChange}
              disabled={internLoading || submitting}
              aria-describedby={errors.intern_id ? 'err-tc-intern' : undefined}
            >
              <option value="">
                {internLoading
                  ? 'Đang tải danh sách thực tập sinh…'
                  : internError
                    ? 'Lỗi tải danh sách'
                    : '-- Chọn thực tập sinh --'}
              </option>
              {interns.map((intern) => (
                <option key={intern.intern_id} value={intern.intern_id}>
                  {internLabel(intern)}
                </option>
              ))}
            </select>

            {/* Thông báo lỗi tải API Intern */}
            {internError && !internLoading && (
              <span className="tc-form-hint tc-form-hint--error" role="alert">
                ⚠ {internError}
              </span>
            )}

            {/* Thông báo khi API thành công nhưng danh sách rỗng */}
            {noInterns && (
              <span className="tc-form-hint">
                Bạn chưa được phân công quản lý thực tập sinh nào.
              </span>
            )}

            {errors.intern_id && (
              <span id="err-tc-intern" className="tc-form-error" role="alert">
                {errors.intern_id}
              </span>
            )}
          </div>

        </form>

        {/* Footer */}
        <div className="tc-modal-footer">
          <button
            id="tc-modal-cancel-btn"
            type="button"
            className="tc-modal-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            id="tc-modal-submit-btn"
            type="submit"
            form="tc-task-form"
            className="tc-modal-submit"
            disabled={submitting || internLoading || noInterns}
          >
            {submitting && <span className="tc-btn-spinner" aria-hidden="true" />}
            {submitting ? 'Đang tạo…' : 'Tạo nhiệm vụ'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default TaskCreateModal;
