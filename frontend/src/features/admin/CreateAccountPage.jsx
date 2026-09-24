/**
 * CreateAccountPage.jsx
 * Route dự kiến: /admin/users/new
 *
 * US: "Là admin, tôi muốn tạo tài khoản cho HR, mentor và thực tập sinh."
 * Task: Giao diện tĩnh (UI-only). Chưa validate logic / gọi API.
 *
 * Fields: Họ tên | Email | Dropdown Role | Password tạm | Nút "Tạo tài khoản"
 * Theme  : kế thừa RegisterPage.css (màu, font, input, button)
 */

import './CreateAccountPage.css';

/**
 * Danh sách role hiển thị trong dropdown.
 * Giá trị (value) khớp với roles.name trong DB (software-specification.md §1.2).
 */
const ROLE_OPTIONS = [
  { value: 'intern',  label: 'Thực tập sinh' },
  { value: 'mentor',  label: 'Mentor'         },
  { value: 'hr',      label: 'HR'             },
];

/**
 * CreateAccountPage
 * Giao diện form tạo tài khoản cho admin.
 * Chưa xử lý submit / validate — sẽ hoàn thiện ở task tiếp theo.
 */
function CreateAccountPage() {
  return (
    <div className="create-account-page">
      {/* Glow nền (giống RegisterPage) */}
      <div className="create-account-page__glow" aria-hidden="true" />

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
            /* onSubmit sẽ thêm ở task 2 */
          >

            {/* Họ tên */}
            <div className="form-group">
              <label htmlFor="admin-ca-fullname">Họ tên</label>
              <input
                id="admin-ca-fullname"
                name="full_name"
                type="text"
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="admin-ca-email">Email</label>
              <input
                id="admin-ca-email"
                name="email"
                type="email"
                placeholder="example@ictu.edu.vn"
                autoComplete="email"
              />
            </div>

            {/* Dropdown Role */}
            <div className="form-group">
              <label htmlFor="admin-ca-role">Vai trò</label>
              <select
                id="admin-ca-role"
                name="role"
                defaultValue=""
              >
                <option value="" disabled>-- Chọn vai trò --</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Password tạm */}
            <div className="form-group">
              <label htmlFor="admin-ca-password">Mật khẩu tạm</label>
              <input
                id="admin-ca-password"
                name="password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
              />
            </div>

            {/* Submit */}
            <button
              id="admin-ca-submit"
              type="submit"
              className="create-account-button"
            >
              Tạo tài khoản
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
