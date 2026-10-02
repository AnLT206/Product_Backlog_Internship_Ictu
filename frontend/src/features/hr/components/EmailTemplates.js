/**
 * EmailTemplates.js
 * 
 * Bộ mã HTML Email Template thông báo kết quả xét duyệt hồ sơ thực tập sinh (Đậu / Rớt)
 * Đảm bảo 100% chuẩn Responsive (hỗ trợ hiển thị tối ưu trên cả Mobile & Desktop client).
 * Sử dụng inline CSS + media queries chuẩn email HTML.
 */

export function getAdmissionApprovedEmailHtml(applicant = {}) {
  const name = applicant.full_name || 'Nguyễn Văn An';
  const code = applicant.student_code || 'TTS0003';
  const major = applicant.major || 'Công nghệ thông tin';
  const faculty = applicant.faculty || 'Khoa Công nghệ Thông tin';
  const company = applicant.company || 'ICTU Software Engineering Lab';
  const project = applicant.project || 'Dự án Core API Microservice & Quản lý TTS';

  return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Thông báo tiếp nhận Thực tập Doanh nghiệp ICTU</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    /* Responsive Media Queries */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .header-title { font-size: 20px !important; line-height: 26px !important; }
      .info-cell-label { width: 35% !important; font-size: 13px !important; }
      .info-cell-value { font-size: 13px !important; }
      .btn-cta { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; color: #1e293b;">
  <center style="width: 100%; background-color: #f1f5f9;">
    <!-- Main Email Container (Max 600px) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      
      <!-- Top Brand Header -->
      <tr>
        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;" class="fluid-padding">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                  ĐẠI HỌC THÁI NGUYÊN • TRƯỜNG ĐH CNTT &amp; TRUYỀN THÔNG (ICTU)
                </div>
                <h1 class="header-title" style="margin: 0; font-size: 24px; font-weight: 800; line-height: 32px; letter-spacing: -0.5px;">
                  THƯ CHÚC MỪNG TRÚNG TUYỂN
                </h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.92; font-weight: 500;">
                  Chương trình Thực tập Doanh nghiệp Kỳ Mùa Thu 2026
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Status Banner -->
      <tr>
        <td style="padding: 16px 24px; background-color: #ecfdf5; border-bottom: 1px solid #a7f3d0; text-align: center;" class="fluid-padding">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="text-align: center; color: #065f46; font-size: 14px; font-weight: 700;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; margin-right: 6px;"></span>
                KẾT QUẢ XÉT DUYỆT: HỒ SƠ ĐÃ ĐƯỢC PHÊ DUYỆT TIẾP NHẬN
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Greeting & Introduction -->
      <tr>
        <td style="padding: 28px 32px 16px 32px;" class="fluid-padding">
          <p style="font-size: 15px; line-height: 24px; color: #0f172a; margin: 0 0 14px 0;">
            Kính gửi sinh viên: <strong style="color: #2563eb; font-size: 16px;">${name}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 22px; color: #334155; margin: 0 0 16px 0; text-align: justify;">
            Ban Hợp tác Doanh nghiệp ICTU phối hợp cùng Doanh nghiệp tiếp nhận trân trọng thông báo: Sau quá trình thẩm định hồ sơ, điểm GPA học vụ và phỏng vấn chuyên môn, bạn đã <strong>đạt chuẩn tiếp nhận chính thức</strong> tham gia kỳ thực tập doanh nghiệp Đợt Mùa Thu 2026.
          </p>
        </td>
      </tr>

      <!-- Candidate & Internship Info Table -->
      <tr>
        <td style="padding: 0 32px 20px 32px;" class="fluid-padding">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 13px;">
            <tr>
              <td colspan="2" style="background-color: #e2e8f0; padding: 10px 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px;">
                📋 Thông tin chi tiết phân công tiếp nhận
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td class="info-cell-label" style="padding: 10px 14px; color: #64748b; font-weight: 600; width: 40%; border-bottom: 1px solid #e2e8f0;">Họ và tên / Mã SV:</td>
              <td class="info-cell-value" style="padding: 10px 14px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${name} (${code})</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td class="info-cell-label" style="padding: 10px 14px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Khoa / Chuyên ngành:</td>
              <td class="info-cell-value" style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${faculty} - ${major}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td class="info-cell-label" style="padding: 10px 14px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Đơn vị tiếp nhận:</td>
              <td class="info-cell-value" style="padding: 10px 14px; color: #2563eb; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${company}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td class="info-cell-label" style="padding: 10px 14px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Dự án thực tập:</td>
              <td class="info-cell-value" style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${project}</td>
            </tr>
            <tr>
              <td class="info-cell-label" style="padding: 10px 14px; color: #64748b; font-weight: 600;">Thời gian thực tập:</td>
              <td class="info-cell-value" style="padding: 10px 14px; color: #059669; font-weight: 700;">01/08/2026 - 30/11/2026 (16 tuần)</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Next Steps Checklist -->
      <tr>
        <td style="padding: 0 32px 24px 32px;" class="fluid-padding">
          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px;">
            <strong style="color: #1e40af; font-size: 13px; display: block; margin-bottom: 6px;">
              ⚡ Các bước tiếp theo để hoàn tất thủ tục nhập học phần:
            </strong>
            <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 20px;">
              <li>Truy cập vào Cổng thông tin Thực tập <strong>ICTU Intern Hub</strong>.</li>
              <li>Xem lại nội dung <strong>Hợp đồng thực tập 3 bên</strong> và tích chọn cam kết.</li>
              <li>Bấm nút <strong>Xác nhận hợp đồng</strong> trực tuyến trong vòng 03 ngày làm việc.</li>
            </ol>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td style="padding: 0 32px 32px 32px; text-align: center;" class="fluid-padding">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="border-radius: 8px; background: #2563eb; text-align: center;">
                <a href="https://internship.ictu.edu.vn/intern/dashboard" target="_blank" class="btn-cta" style="background: #2563eb; border: 1px solid #2563eb; font-family: inherit; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; letter-spacing: 0.2px;">
                  Xác nhận &amp; Xem Thỏa thuận Thực tập &rarr;
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">
            Hạn chót hoàn tất ký thỏa thuận: <strong>23:59 ngày 05/08/2026</strong>
          </p>
        </td>
      </tr>

      <!-- Footer & Support Info -->
      <tr>
        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; color: #64748b; font-size: 12px; line-height: 18px;" class="fluid-padding">
          <p style="margin: 0 0 6px 0; font-weight: 700; color: #334155;">
            BAN HỢP TÁC DOANH NGHIỆP &amp; PHÒNG QUẢN LÝ ĐÀO TẠO ICTU
          </p>
          <p style="margin: 0 0 6px 0;">
            Địa chỉ: Đường Z115, Xã Quyết Thắng, TP. Thái Nguyên, Tỉnh Thái Nguyên
          </p>
          <p style="margin: 0 0 10px 0;">
            Hotline hỗ trợ TTS: <strong>0208.3846.254</strong> · Email: <a href="mailto:htdn@ictu.edu.vn" style="color: #2563eb; text-decoration: none;">htdn@ictu.edu.vn</a>
          </p>
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
            Email này được gửi tự động từ Hệ sinh thái Quản lý &amp; Đào tạo Thực tập Doanh nghiệp ICTU.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

export function getAdmissionRejectedEmailHtml(applicant = {}, reason = '') {
  const name = applicant.full_name || 'Nguyễn Văn An';
  const code = applicant.student_code || 'TTS0003';
  const rejectReason = reason || 'Hồ sơ chưa đáp ứng yêu cầu số tín chỉ tích lũy tối thiểu hoặc chứng chỉ kỹ năng chuyên môn đầu vào theo khung yêu cầu của kỳ này.';

  return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Thông báo kết quả xét duyệt Thực tập Doanh nghiệp ICTU</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .header-title { font-size: 20px !important; line-height: 26px !important; }
      .btn-cta { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; color: #1e293b;">
  <center style="width: 100%; background-color: #f1f5f9;">
    <!-- Main Email Container (Max 600px) -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      
      <!-- Top Brand Header (Gray / Slate Tone) -->
      <tr>
        <td style="background: linear-gradient(135deg, #334155 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff;" class="fluid-padding">
          <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            ĐẠI HỌC THÁI NGUYÊN • TRƯỜNG ĐH CNTT &amp; TRUYỀN THÔNG (ICTU)
          </div>
          <h1 class="header-title" style="margin: 0; font-size: 23px; font-weight: 800; line-height: 30px; letter-spacing: -0.5px;">
            THÔNG BÁO KẾT QUẢ XÉT DUYỆT HỒ SƠ
          </h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500;">
            Chương trình Thực tập Doanh nghiệp Kỳ Mùa Thu 2026
          </p>
        </td>
      </tr>

      <!-- Notice Banner -->
      <tr>
        <td style="padding: 16px 24px; background-color: #fef2f2; border-bottom: 1px solid #fecaca; text-align: center;" class="fluid-padding">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="text-align: center; color: #991b1b; font-size: 14px; font-weight: 700;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #ef4444; border-radius: 50%; margin-right: 6px;"></span>
                KẾT QUẢ: HỒ SƠ CHƯA ĐỦ ĐIỀU KIỆN TIẾP NHẬN ĐỢT NÀY
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Letter Body -->
      <tr>
        <td style="padding: 28px 32px 16px 32px;" class="fluid-padding">
          <p style="font-size: 15px; line-height: 24px; color: #0f172a; margin: 0 0 14px 0;">
            Kính gửi bạn: <strong style="color: #0f172a; font-size: 16px;">${name}</strong> (Mã SV: ${code}),
          </p>
          <p style="font-size: 14px; line-height: 22px; color: #334155; margin: 0 0 16px 0; text-align: justify;">
            Hội đồng Tuyển dụng Doanh nghiệp và Ban Hợp tác Doanh nghiệp ICTU xin chân thành cảm ơn sự quan tâm và nỗ lực của bạn khi nộp hồ sơ đăng ký tham gia chương trình thực tập đợt Mùa Thu 2026.
          </p>
          <p style="font-size: 14px; line-height: 22px; color: #334155; margin: 0 0 16px 0; text-align: justify;">
            Sau khi rà soát kỹ lưỡng các tiêu chí học vụ, điều kiện tín chỉ tích lũy và đối chiếu cùng chỉ tiêu tiếp nhận của các đối tác doanh nghiệp, Ban Quản lý rất tiếc phải thông báo hiện tại hồ sơ của bạn <strong>chưa phù hợp để tiếp nhận trong đợt này</strong>.
          </p>
        </td>
      </tr>

      <!-- Reason Box -->
      <tr>
        <td style="padding: 0 32px 24px 32px;" class="fluid-padding">
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px;">
            <strong style="color: #9f1239; font-size: 13px; display: block; margin-bottom: 6px;">
              📌 Lý do cụ thể từ Hội đồng Thẩm định:
            </strong>
            <p style="margin: 0; font-size: 13px; color: #881337; line-height: 20px;">
              "${rejectReason}"
            </p>
          </div>
        </td>
      </tr>

      <!-- Guidance & Future batches -->
      <tr>
        <td style="padding: 0 32px 28px 32px;" class="fluid-padding">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <strong style="color: #1e293b; font-size: 13px; display: block; margin-bottom: 6px;">
              💡 Hướng dẫn &amp; Cơ hội tiếp theo:
            </strong>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 20px;">
              <li>Bạn có thể hoàn thiện bổ sung học phần tích lũy và đăng ký lại vào <strong>Đợt Thực tập Mùa Xuân Q1/2027</strong>.</li>
              <li>Tham gia các khóa Workshop đào tạo kỹ năng CV &amp; Phỏng vấn do Trường ICTU tổ chức định kỳ.</li>
              <li>Nếu có thắc mắc hoặc cần phúc tra lại điểm hồ sơ học vụ, vui lòng liên hệ phòng HTDN trước ngày 05/10/2026.</li>
            </ul>
          </div>
        </td>
      </tr>

      <!-- Footer & Support Info -->
      <tr>
        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; color: #64748b; font-size: 12px; line-height: 18px;" class="fluid-padding">
          <p style="margin: 0 0 6px 0; font-weight: 700; color: #334155;">
            BAN HỢP TÁC DOANH NGHIỆP &amp; PHÒNG QUẢN LÝ ĐÀO TẠO ICTU
          </p>
          <p style="margin: 0 0 6px 0;">
            Địa chỉ: Đường Z115, Xã Quyết Thắng, TP. Thái Nguyên, Tỉnh Thái Nguyên
          </p>
          <p style="margin: 0 0 10px 0;">
            Hotline hỗ trợ: <strong>0208.3846.254</strong> · Email: <a href="mailto:htdn@ictu.edu.vn" style="color: #2563eb; text-decoration: none;">htdn@ictu.edu.vn</a>
          </p>
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
            Email này được gửi tự động từ Hệ sinh thái Quản lý &amp; Đào tạo Thực tập Doanh nghiệp ICTU.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}
