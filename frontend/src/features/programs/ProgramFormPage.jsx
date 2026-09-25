/**
 * ProgramFormPage.jsx
 * Route dự kiến: /hr/programs/new
 *
 * US: "Là HR, tôi muốn tạo chương trình thực tập theo phòng ban."
 * Task 3: Giao diện tĩnh.
 * Task 4: Validate (bắt buộc + start ≤ end) + mock API POST /api/hr/programs.
 *
 * Fields: Tên* | Phòng ban* | Mô tả (optional) | Ngày bắt đầu* | Ngày kết thúc* | Lưu
 * Theme : kế thừa RegisterPage.css (màu, font, input, button)
 */

import { useState } from 'react';
import './ProgramFormPage.css';

/* ─────────────────────────────────────────────
   API helper
   TODO: Thay endpoint khi BE hoàn thành POST /api/hr/programs
   TODO: const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
         (bỏ comment dòng trên khi chuyển sang fetch thật)
───────────────────────────────────────────── */

/**
 * Gọi API tạo chương trình thực tập.
 *
 * TODO: Endpoint POST /api/hr/programs chưa tồn tại ở backend (chờ API thật).
 *       Hiện tại hàm này giả lập (mock) để FE có thể test độc lập.
 *       Khi BE sẵn sàng: xóa khối mock, bỏ comment phần fetch thật bên dưới.
 *
 * @param {{ name: string, department: string, description: string,
 *            start_date: string, end_date: string }} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
async function apiCreateProgram(body) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 600));

  // Mô phỏng 409 nếu tên chứa "duplicate" (để test)
  if (body.name.toLowerCase().includes('duplicate')) {
    return {
      ok: false,
      status: 409,
      data: { detail: 'Tên chương trình đã tồn tại.' },
    };
  }

  return {
    ok: true,
    status: 201,
    data: {
      id: Math.floor(Math.random() * 1000),
      name: body.name,
      department: body.department,
      description: body.description,
      start_date: body.start_date,
      end_date: body.end_date,
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có POST /api/hr/programs (role: hr only)
  const token = localStorage.getItem('access_token') ?? '';
  const res = await fetch(`${BASE_URL}/api/hr/programs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  return { ok: res.ok, status: res.status, data };
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   Validate helper
───────────────────────────────────────────── */

/**
 * Validate toàn bộ form, trả về object errors.
 * Trả về {} nếu hợp lệ.
 *
 * Rules:
 *   - name, department, start_date, end_date: bắt buộc
 *   - start_date ≤ end_date (software-specification.md §7.4)
 */
function validateForm({ name, department, start_date, end_date }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = 'Vui lòng nhập tên chương trình.';
  }

  if (!department.trim()) {
    errors.department = 'Vui lòng nhập tên phòng ban.';
  }

  if (!start_date) {
    errors.start_date = 'Vui lòng chọn ngày bắt đầu.';
  }

  if (!end_date) {
    errors.end_date = 'Vui lòng chọn ngày kết thúc.';
  } else if (start_date && end_date < start_date) {
    // Ngày kết thúc phải ≥ ngày bắt đầu (so sánh chuỗi YYYY-MM-DD là đúng thứ tự)
    errors.end_date = 'Ngày kết thúc phải sau ngày bắt đầu.';
  }

  return errors;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * ProgramFormPage
 * Form tạo chương trình thực tập mới cho HR — có validate + mock API call.
 */
function ProgramFormPage() {
  /* ── State ── */
  const [form, setForm] = useState({
    name: '',
    department: '',
    description: '',
    start_date: '',
    end_date: '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null); // { type: 'success'|'error', message: string }

  /* ── Handlers ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Xóa lỗi của field vừa sửa
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    // Khi sửa start_date, kiểm tra lại end_date nếu đang có lỗi ngày
    if (name === 'start_date' && errors.end_date) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.end_date;
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
      const { ok, status, data } = await apiCreateProgram({
        name:        form.name.trim(),
        department:  form.department.trim(),
        description: form.description.trim(),
        start_date:  form.start_date,
        end_date:    form.end_date,
      });

      if (ok) {
        // 201 — thành công
        showToast('success', 'Tạo chương trình thực tập thành công!');
        setForm({ name: '', department: '', description: '', start_date: '', end_date: '' });
      } else if (status === 409) {
        const msg = data?.detail ?? 'Chương trình đã tồn tại.';
        setErrors({ name: msg });
        showToast('error', msg);
      } else if (status === 422) {
        // FastAPI validation errors — format { detail: [...] } hoặc { detail: "..." }
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

  /* ── Render ── */
  return (
    <div className="program-form-page">
      {/* Glow nền */}
      <div className="program-form-page__glow" aria-hidden="true" />

      {/* ── Toast thông báo ── */}
      {toast && (
        <div
          id="prog-form-toast"
          className={`program-form-toast program-form-toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}
          {toast.message}
        </div>
      )}

      <div className="program-form-shell">

        {/* Back link → danh sách */}
        <a href="/hr/programs" className="program-form-back">
          ← Quay lại danh sách chương trình
        </a>

        {/* ── Card ── */}
        <div className="program-form-card">

          {/* Header */}
          <div className="program-form-header">
            <span className="program-form-badge">HR</span>
            <h1>Tạo <span>chương trình</span> thực tập</h1>
            <p className="program-form-lead">
              Điền thông tin bên dưới để khởi tạo chương trình thực tập mới.
            </p>
          </div>

          {/* Form */}
          <form
            className="program-form-body"
            id="hr-program-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* Tên chương trình * */}
            <div className={`form-group${errors.name ? ' form-group--error' : ''}`}>
              <label htmlFor="prog-name">
                Tên chương trình <span className="required">*</span>
              </label>
              <input
                id="prog-name"
                name="name"
                type="text"
                placeholder="VD: Chương trình thực tập Hè 2026"
                autoComplete="off"
                value={form.name}
                onChange={handleChange}
                aria-describedby={errors.name ? 'err-prog-name' : undefined}
              />
              {errors.name && (
                <span id="err-prog-name" className="form-error" role="alert">
                  {errors.name}
                </span>
              )}
            </div>

            {/* Phòng ban * */}
            <div className={`form-group${errors.department ? ' form-group--error' : ''}`}>
              <label htmlFor="prog-department">
                Phòng ban <span className="required">*</span>
              </label>
              <input
                id="prog-department"
                name="department"
                type="text"
                placeholder="VD: Công nghệ thông tin"
                autoComplete="off"
                value={form.department}
                onChange={handleChange}
                aria-describedby={errors.department ? 'err-prog-dept' : undefined}
              />
              {errors.department && (
                <span id="err-prog-dept" className="form-error" role="alert">
                  {errors.department}
                </span>
              )}
            </div>

            {/* Mô tả (optional) */}
            <div className="form-group">
              <label htmlFor="prog-description">Mô tả</label>
              <textarea
                id="prog-description"
                name="description"
                placeholder="Mô tả ngắn về nội dung và mục tiêu của chương trình (không bắt buộc)"
                value={form.description}
                onChange={handleChange}
              />
            </div>

            {/* Ngày bắt đầu* + Ngày kết thúc* — cạnh nhau */}
            <div className="program-date-row">
              <div className={`form-group${errors.start_date ? ' form-group--error' : ''}`}>
                <label htmlFor="prog-start-date">
                  Ngày bắt đầu <span className="required">*</span>
                </label>
                <input
                  id="prog-start-date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  aria-describedby={errors.start_date ? 'err-prog-start' : undefined}
                />
                {errors.start_date && (
                  <span id="err-prog-start" className="form-error" role="alert">
                    {errors.start_date}
                  </span>
                )}
              </div>

              <div className={`form-group${errors.end_date ? ' form-group--error' : ''}`}>
                <label htmlFor="prog-end-date">
                  Ngày kết thúc <span className="required">*</span>
                </label>
                <input
                  id="prog-end-date"
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange}
                  aria-describedby={errors.end_date ? 'err-prog-end' : undefined}
                />
                {errors.end_date && (
                  <span id="err-prog-end" className="form-error" role="alert">
                    {errors.end_date}
                  </span>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              id="hr-program-submit"
              type="submit"
              className="program-form-submit"
              disabled={loading}
            >
              {loading ? 'Đang lưu…' : 'Lưu chương trình'}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}

export default ProgramFormPage;
