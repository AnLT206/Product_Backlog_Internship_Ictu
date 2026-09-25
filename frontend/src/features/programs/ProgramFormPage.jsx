/**
 * ProgramFormPage.jsx
 * Route dự kiến: /hr/programs/new
 *
 * US: "Là HR, tôi muốn tạo chương trình thực tập theo phòng ban."
 * Task 3: Giao diện tĩnh form tạo chương trình — CHƯA validate ngày / gọi API.
 *         Validate + submit sẽ hoàn thiện ở task 4.
 *
 * Fields: Tên* | Phòng ban* | Mô tả (optional) | Ngày bắt đầu* | Ngày kết thúc* | Lưu
 * Theme : kế thừa RegisterPage.css (màu, font, input, button)
 *
 * TODO (task 4):
 *   - Validate start_date ≤ end_date (software-specification.md §7.4)
 *   - Gọi POST /api/hr/programs khi submit (software-specification.md §7.2)
 *   - Xử lý response 201 / lỗi
 */

import './ProgramFormPage.css';

/**
 * ProgramFormPage
 * Form tạo chương trình thực tập mới cho HR.
 * Giao diện tĩnh — chưa có state / submit handler (task 4).
 */
function ProgramFormPage() {
  return (
    <div className="program-form-page">
      {/* Glow nền */}
      <div className="program-form-page__glow" aria-hidden="true" />

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
            /* onSubmit sẽ thêm ở task 4 */
          >

            {/* Tên chương trình * */}
            <div className="form-group">
              <label htmlFor="prog-name">
                Tên chương trình <span className="required">*</span>
              </label>
              <input
                id="prog-name"
                name="name"
                type="text"
                placeholder="VD: Chương trình thực tập Hè 2026"
                autoComplete="off"
              />
            </div>

            {/* Phòng ban * */}
            <div className="form-group">
              <label htmlFor="prog-department">
                Phòng ban <span className="required">*</span>
              </label>
              <input
                id="prog-department"
                name="department"
                type="text"
                placeholder="VD: Công nghệ thông tin"
                autoComplete="off"
              />
            </div>

            {/* Mô tả (optional) */}
            <div className="form-group">
              <label htmlFor="prog-description">Mô tả</label>
              <textarea
                id="prog-description"
                name="description"
                placeholder="Mô tả ngắn về nội dung và mục tiêu của chương trình (không bắt buộc)"
              />
            </div>

            {/* Ngày bắt đầu* + Ngày kết thúc* — cạnh nhau */}
            <div className="program-date-row">
              <div className="form-group">
                <label htmlFor="prog-start-date">
                  Ngày bắt đầu <span className="required">*</span>
                </label>
                <input
                  id="prog-start-date"
                  name="start_date"
                  type="date"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prog-end-date">
                  Ngày kết thúc <span className="required">*</span>
                </label>
                <input
                  id="prog-end-date"
                  name="end_date"
                  type="date"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="hr-program-submit"
              type="submit"
              className="program-form-submit"
            >
              Lưu chương trình
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}

export default ProgramFormPage;
