import React, { useState } from 'react';
import './ContractSigningPage.css';

/**
 * ContractSigningPage — Giao diện trang Ký kết hợp đồng thực tập.
 *
 * Gồm 2 phần chính:
 * 1. Khung hiển thị nội dung hợp đồng (chiều cao cố định 500px, cuộn dọc overflow-y: auto)
 * 2. Phía dưới cùng là Checkbox đồng ý điều khoản kèm state isChecked
 */
export default function ContractSigningPage({ internName = 'Nguyễn Văn Bình', onConfirmSign }) {
  // Khởi tạo state isChecked để bắt sự kiện thay đổi của checkbox
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý gửi xác nhận ký kết
  const handleSignContract = async () => {
    if (!isChecked || isSubmitting) return;

    try {
      setIsSubmitting(true);
      // Gọi callback hoặc API lưu trạng thái ký kết
      if (onConfirmSign) {
        await onConfirmSign();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
        alert('Bạn đã ký kết hợp đồng thực tập thành công!');
      }
    } catch (error) {
      console.error('Lỗi khi ký hợp đồng:', error);
      alert('Có lỗi xảy ra khi ký kết. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contract-signing-page">
      <div className="contract-signing-card">
        {/* Tiêu đề trang */}
        <header className="contract-signing-header">
          <span className="contract-signing-badge">Thỏa thuận pháp lý</span>
          <h2>Ký kết hợp đồng thực tập</h2>
          <p>
            Vui lòng đọc kỹ toàn bộ các điều khoản và quyền lợi dưới đây trước khi thực hiện ký kết hợp đồng điện tử.
          </p>
        </header>

        {/* ── 1. PHẦN TRÊN: Div cố định 500px, overflow-y: auto chứa text hợp đồng ── */}
        <div className="contract-content-box">
          <div className="contract-body">
            <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p className="contract-subtitle">Độc lập - Tự do - Hạnh phúc</p>

            <h3 style={{ margin: '20px 0 6px' }}>HỢP ĐỒNG THỎA THUẬN THỰC TẬP TỐT NGHIỆP</h3>
            <p className="contract-subtitle">Số: 2026/HĐTT-ICTU</p>

            <div className="contract-section">
              <h4>BÊN A: ĐƠN VỊ TIẾP NHẬN THỰC TẬP (DOANH NGHIỆP)</h4>
              <p>Đại diện: Trung tâm Đào tạo & Chuyển giao Công nghệ</p>
              <p>Địa chỉ: Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)</p>
            </div>

            <div className="contract-section">
              <h4>BÊN B: THỰC TẬP SINH (ỨNG VIÊN)</h4>
              <p>Họ và tên: <strong>{internName}</strong></p>
              <p>Chương trình: Đào tạo thực tập doanh nghiệp đợt 1 - 2026</p>
            </div>

            <div className="contract-section">
              <h4>ĐIỀU 1: MỤC TIÊU VÀ THỜI GIAN THỰC TẬP</h4>
              <p>
                1.1. Bên A tiếp nhận Bên B tham gia chương trình thực tập nhằm nâng cao kỹ năng thực chiến, tiếp cận quy trình phát triển phần mềm chuẩn doanh nghiệp.
              </p>
              <p>
                1.2. Thời gian thực tập dự kiến kéo dài 03 tháng kể từ ngày ký kết thỏa thuận này. Lịch làm việc tuân thủ theo sự phân công của Mentor hướng dẫn.
              </p>
            </div>

            <div className="contract-section">
              <h4>ĐIỀU 2: QUYỀN LỢI VÀ NGHĨA VỤ CỦA THỰC TẬP SINH</h4>
              <p><strong>2.1. Quyền lợi:</strong></p>
              <ul>
                <li>Được Mentor trực tiếp hướng dẫn, giải đáp chuyên môn và định hướng dự án.</li>
                <li>Được sử dụng hạ tầng, môi trường lab và tài liệu nội bộ phục vụ cho công việc.</li>
                <li>Được cấp Chứng nhận hoàn thành kỳ thực tập và đánh giá điểm thực tập sau khi kết thúc chương trình.</li>
              </ul>
              <p><strong>2.2. Nghĩa vụ:</strong></p>
              <ul>
                <li>Tuân thủ thời gian làm việc, chấm công đầy đủ trên hệ thống quản lý thực tập.</li>
                <li>Hoàn thành đúng tiến độ các nhiệm vụ (Task/Ticket) được Mentor và Quản trị viên phân công.</li>
                <li>Báo cáo tiến độ công việc hàng tuần theo quy định của bộ phận Nhân sự (HR).</li>
              </ul>
            </div>

            <div className="contract-section">
              <h4>ĐIỀU 3: THỎA THUẬN BẢO MẬT THÔNG TIN (NDA)</h4>
              <p>
                3.1. Bên B cam kết không sao chép, cung cấp hoặc làm rò rỉ mã nguồn (Source Code), tài liệu kiến trúc kỹ thuật hoặc cơ sở dữ liệu của dự án ra bên ngoài khi chưa được sự đồng ý bằng văn bản của Bên A.
              </p>
              <p>
                3.2. Mọi sản phẩm, mã nguồn và tài liệu phát sinh trong quá trình thực tập đều thuộc quyền sở hữu trí tuệ của Đơn vị tiếp nhận thực tập.
              </p>
            </div>

            <div className="contract-section">
              <h4>ĐIỀU 4: HIỆU LỰC CỦA THỎA THUẬN</h4>
              <p>
                Hợp đồng này có hiệu lực kể từ thời điểm Bên B bấm xác nhận đồng ý ký kết điện tử trên hệ thống và được lưu trữ trên cơ sở dữ liệu của Nhà trường/Doanh nghiệp.
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. PHẦN DƯỚI CÙNG: Checkbox xác nhận điều khoản & Nút ký kết ── */}
        <footer className="contract-footer">
          <label className="contract-agreement-row" htmlFor="contract-agreement-checkbox">
            <input
              type="checkbox"
              id="contract-agreement-checkbox"
              className="contract-checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
            />
            <span className={`contract-agreement-label ${isChecked ? 'is-checked' : ''}`}>
              Tôi đã đọc, hiểu và đồng ý với các điều khoản của hợp đồng
            </span>
          </label>

          <div className="contract-actions-row">
            <span className={`contract-status-hint ${isChecked ? 'has-agreed' : ''}`}>
              {isChecked
                ? 'Đã xác nhận đồng ý điều khoản'
                : 'Vui lòng tích vào ô xác nhận để mở nút ký hợp đồng'}
            </span>

            <button
              type="button"
              className="contract-sign-btn"
              disabled={!isChecked || isSubmitting}
              onClick={handleSignContract}
            >
              {isSubmitting ? 'Đang xử lý…' : 'Xác nhận ký kết'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
