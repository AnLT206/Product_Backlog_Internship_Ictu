/**
 * realtimeSync.js
 * Hệ thống Đồng bộ Dữ liệu Thời gian thực (Real-time Cross-Portal Syncer)
 * Kết nối dữ liệu đa chiều giữa:
 *   - Phân hệ Nhân sự (HR Portal)
 *   - Phân hệ Người hướng dẫn (Mentor Portal)
 *   - Phân hệ Thực tập sinh (Intern Portal)
 *   - Phân hệ Ứng viên (Applicant Portal)
 *
 * Cơ chế hoạt động:
 * 1. BroadcastChannel: Truyền thông điệp tức thời không độ trễ giữa các tab trình duyệt.
 * 2. Storage Event: Tương thích đồng bộ giữa các cửa sổ trình duyệt khác nhau.
 * 3. CustomEvent: Đồng bộ tức thì trong cùng một trang / tab.
 * 4. LocalStorage State Cache: Lưu trữ trạng thái bền vững, tự động tính toán số liệu tổng cho HR.
 */

import { getSavedAvatar, saveSharedAvatar } from './avatarHelper';

const CHANNEL_NAME = 'ictu_internship_realtime_sync_channel';
const STORAGE_SYNC_KEY = 'ictu_realtime_sync_store';
const STORAGE_EVENT_KEY = 'ictu_realtime_last_sync_event';

export const SYNC_EVENTS = {
  APPLICANT_SUBMITTED: 'SYNC_APPLICANT_SUBMITTED',   // Ứng viên nộp CV / hồ sơ mới
  APPLICANT_UPDATED:   'SYNC_APPLICANT_UPDATED',     // Ứng viên sửa SĐT, địa chỉ, học vụ
  APPLICANT_DECISION:  'SYNC_APPLICANT_DECISION',    // HR duyệt hoặc từ chối hồ sơ
  CONTRACT_SENT:       'SYNC_CONTRACT_SENT',         // HR gửi hợp đồng tiếp nhận cho ứng viên
  CONTRACT_SIGNED:     'SYNC_CONTRACT_SIGNED',       // TTS ký hợp đồng điện tử
  CONTRACT_UPLOADED:   'SYNC_CONTRACT_UPLOADED',     // HR tải lên hợp đồng mới
  CONTRACT_UPDATED:    'SYNC_CONTRACT_UPDATED',      // HR chỉnh sửa thông tin hợp đồng
  CONTRACT_DELETED:    'SYNC_CONTRACT_DELETED',      // HR hủy / xóa hợp đồng
  CONTRACT_TEMPLATE_CREATED: 'SYNC_CONTRACT_TEMPLATE_CREATED', // HR tạo mẫu hợp đồng mới
  CONTRACT_TEMPLATE_UPDATED: 'SYNC_CONTRACT_TEMPLATE_UPDATED', // HR sửa mẫu hợp đồng
  CONTRACT_TEMPLATE_DELETED: 'SYNC_CONTRACT_TEMPLATE_DELETED', // HR xóa mẫu hợp đồng
  MENTOR_ASSIGNED:     'SYNC_MENTOR_ASSIGNED',       // HR gán TTS cho Mentor
  DOCUMENT_REVIEWED:   'SYNC_DOCUMENT_REVIEWED',     // HR duyệt / từ chối tài liệu
  MENTOR_EVALUATED:    'SYNC_MENTOR_EVALUATED',      // Mentor chấm điểm / đánh giá TTS
  SUPPORT_TICKET_CREATED:  'SYNC_SUPPORT_TICKET_CREATED',  // TTS nộp ticket yêu cầu hỗ trợ mới
  SUPPORT_TICKET_RESPONDED: 'SYNC_SUPPORT_TICKET_RESPONDED', // HR/Mentor duyệt / từ chối ticket
  ATTENDANCE_CHECKED_IN:   'SYNC_ATTENDANCE_CHECKED_IN',   // TTS điểm danh / check-in hôm nay
  LEAVE_REQUEST_SUBMITTED: 'SYNC_LEAVE_REQUEST_SUBMITTED', // TTS gửi đơn xin nghỉ phép
  ATTENDANCE_APPROVED:     'SYNC_ATTENDANCE_APPROVED',     // HR duyệt công / phụ cấp
  ALLOWANCE_UPDATED:       'SYNC_ALLOWANCE_UPDATED',       // HR cập nhật lương / phụ cấp / thưởng phạt
};

// ── Kho Văn bản / Biểu mẫu Hợp đồng có sẵn trong hệ thống ──
export const DEFAULT_CONTRACT_TEMPLATES = [
  {
    id: 'TPL-01',
    code: 'HĐ-TIEP-NHAN-01',
    title: 'Hợp đồng Tiếp nhận Thực tập & Cam kết Bảo mật (NDA)',
    category: 'Thực tập Doanh nghiệp',
    duration: '03 tháng (Từ 01/10/2026 đến 31/12/2026)',
    defaultAllowance: '3.000.000 đ/tháng',
    department: 'Trung tâm Phát triển Phần mềm ICTU',
    description: 'Biểu mẫu tiêu chuẩn tiếp nhận sinh viên thực tập chuyên ngành CNTT, KTPM; ràng buộc cam kết bảo mật mã nguồn doanh nghiệp.',
    terms: [
      'Sinh viên tuân thủ tối thiểu 20 giờ làm việc/tuần theo phân công của Mentor.',
      'Bảo mật tuyệt đối thông tin, cơ sở dữ liệu và mã nguồn sản phẩm của dự án.',
      'Hưởng mức hỗ trợ phụ cấp học tập 3.000.000 đ/tháng cùng chế độ khen thưởng chuyên cần.',
      'Được cấp chứng nhận hoàn thành kỳ thực tập và xem xét tuyển dụng nhân viên chính thức.',
    ],
  },
  {
    id: 'TPL-02',
    code: 'HĐ-THOA-THUAN-02',
    title: 'Thỏa thuận Đào tạo & Thực tập 3 bên (Trường - Doanh nghiệp - Sinh viên)',
    category: 'Đào tạo Chuyển tiếp Tín chỉ',
    duration: '03 tháng (Theo kế hoạch học phần ICTU)',
    defaultAllowance: '3.000.000 đ/tháng',
    department: 'Trung tâm Phát triển Phần mềm ICTU',
    description: 'Thỏa thuận phối hợp 3 bên công nhận điểm học phần thực tập tốt nghiệp, đồng bộ kết quả về Cổng Đào tạo ICTU.',
    terms: [
      'Doanh nghiệp phân công Mentor kèm cặp 1-1 và đánh giá năng lực theo phiếu điểm chuẩn của Trường.',
      'Nhà trường công nhận khối lượng kiến thức và chuyển đổi tín chỉ học phần tốt nghiệp.',
      'Sinh viên chấp hành nội quy doanh nghiệp và báo cáo tiến độ tuần theo quy định.',
    ],
  },
  {
    id: 'TPL-03',
    code: 'HĐ-DU-AN-RD-03',
    title: 'Hợp đồng Thực tập Dự án Nghiên cứu & Phát triển Công nghệ (R&D AI & Cloud)',
    category: 'Dự án Nghiên cứu Chuyên sâu',
    duration: '04 tháng (Kỳ chuyên đề nghiên cứu)',
    defaultAllowance: '3.500.000 đ/tháng',
    department: 'Phòng Nghiên cứu Công nghệ Số & AI',
    description: 'Dành cho sinh viên tham gia các đề tài trọng điểm về Trí tuệ nhân tạo, IoT và Điện toán đám mây tại Lab R&D.',
    terms: [
      'Tham gia nghiên cứu và ứng dụng mô hình Deep Learning/LLM vào các bài toán thực tiễn.',
      'Hưởng phụ cấp R&D 3.500.000 đ/tháng và tài trợ thiết bị nghiên cứu GPU chuyên dụng.',
      'Sở hữu quyền tác giả bài báo khoa học phối hợp cùng giảng viên hướng dẫn và Mentor.',
    ],
  },
  {
    id: 'TPL-04',
    code: 'HĐ-THU-VIEC-04',
    title: 'Hợp đồng Thử việc & Tiếp nhận chuyển tiếp Nhân viên chính thức (Junior)',
    category: 'Tuyển dụng & Chuyển tiếp',
    duration: '02 tháng thử việc',
    defaultAllowance: '5.000.000 đ/tháng',
    department: 'Bộ phận Kỹ thuật Phần mềm Doanh nghiệp',
    description: 'Hợp đồng đãi ngộ cao dành cho sinh viên xuất sắc sau kỳ thực tập chuyển thẳng lên nhân viên chính thức.',
    terms: [
      'Làm việc toàn thời gian (Full-time) hoặc bán thời gian linh hoạt theo lịch học.',
      'Mức lương thử việc 5.000.000 đ/tháng và ký hợp đồng lao động chính thức ngay sau khi tốt nghiệp.',
    ],
  },
  {
    id: 'TPL-05',
    code: 'HĐ-TTS-PARTTIME-05',
    title: 'Hợp đồng Thực tập Bán thời gian & Phát triển Phần mềm (Part-time Software Dev)',
    category: 'Thực tập Bán thời gian',
    duration: '03 tháng (Linh hoạt 20 giờ/tuần)',
    defaultAllowance: '2.500.000 đ/tháng',
    department: 'Trung tâm Phát triển Phần mềm ICTU',
    description: 'Biểu mẫu linh hoạt dành cho sinh viên vừa học vừa làm, tham gia lập trình và kiểm thử các tính năng hệ thống phần mềm doanh nghiệp.',
    terms: [
      'Thời lượng thực tập tối thiểu 20 giờ/tuần, lịch làm việc linh hoạt theo đăng ký của sinh viên.',
      'Bảo mật tuyệt đối thông tin, mã nguồn và tài sản kỹ thuật số của trung tâm phát triển phần mềm.',
      'Hưởng mức phụ cấp 2.500.000 đ/tháng và được Mentor trực tiếp hướng dẫn code review hàng tuần.',
      'Kết thúc kỳ thực tập được cấp chứng nhận và hỗ trợ hoàn thiện báo cáo tốt nghiệp.',
    ],
  },
  {
    id: 'TPL-06',
    code: 'HĐ-AN-TOAN-TT-06',
    title: 'Hợp đồng Thực tập Vận hành Hạ tầng & An toàn Thông tin (DevSecOps & SysAdmin)',
    category: 'Hạ tầng số & An toàn mạng',
    duration: '03 tháng (Từ 01/10/2026 đến 31/12/2026)',
    defaultAllowance: '3.200.000 đ/tháng',
    department: 'Phòng Đảm bảo Chất lượng & QA/QC',
    description: 'Dành cho sinh viên thực tập quản trị hệ thống máy chủ, giám sát an ninh mạng và triển khai đường ống CI/CD tự động.',
    terms: [
      'Tham gia quản trị cụm máy chủ Cloud, thiết lập giám sát hệ thống và phân tích sự cố an toàn thông tin.',
      'Tuân thủ tuyệt đối quy trình an toàn bảo mật và chính sách quản lý quyền truy cập dữ liệu máy chủ.',
      'Hưởng mức phụ cấp 3.200.000 đ/tháng cùng quyền truy cập hạ tầng Lab thực hành chuyên dụng.',
      'Được đánh giá năng lực đạt chuẩn kỹ sư thực tập DevOps/SecOps của doanh nghiệp.',
    ],
  },
];

// Khởi tạo BroadcastChannel an toàn
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (err) {
    console.warn('BroadcastChannel không khả dụng, sử dụng fallback:', err);
  }
}

// ── Dữ liệu khởi tạo chuẩn ban đầu (Bao gồm 2 TTS chính thức và 1 Ứng viên) ──
const DEFAULT_INITIAL_DATA = {
  templates: DEFAULT_CONTRACT_TEMPLATES,
  applicants: [
    {
      id: 24,
      full_name: 'Đỗ Hoàng Anh',
      student_code: 'DTC26001',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'hoanganh@student.ictu.edu.vn',
      phone: '0981.234.001',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Kỹ thuật phần mềm',
      gpa: '3.68',
      cv_file: 'CV_DoHoangAnh_SoftwareEng.pdf',
      app_file: null,
      contract_file: null,
      applied_at: '20/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'HA',
    },
    {
      id: 25,
      full_name: 'Vũ Thùy Linh',
      student_code: 'DTC26002',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'thuylinh@student.ictu.edu.vn',
      phone: '0981.234.002',
      faculty: 'Khoa Trí tuệ nhân tạo & Khoa học dữ liệu',
      major: 'Trí tuệ nhân tạo & Khoa học dữ liệu',
      gpa: '3.82',
      cv_file: 'CV_VuThuyLinh_AI_Data.pdf',
      app_file: null,
      contract_file: null,
      applied_at: '20/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'TL',
    },
    {
      id: 26,
      full_name: 'Phạm Tuấn Kiệt',
      student_code: 'DTC26003',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'tuankiet@student.ictu.edu.vn',
      phone: '0981.234.003',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'An toàn thông tin',
      gpa: '3.55',
      cv_file: 'CV_PhamTuanKiet_Security.pdf',
      app_file: null,
      contract_file: null,
      applied_at: '20/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'TK',
    },
    {
      id: 7,
      full_name: 'Nguyễn Thu Hà',
      student_code: 'TTS9999',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      email: 'ungvien@ictu.edu.vn',
      phone: '0987.654.321',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Công nghệ thông tin',
      gpa: '3.55',
      cv_file: 'Quy chế tổ chức thi Olympic AI ICTU 2026 version 3.docx',
      app_file: null,
      contract_file: null,
      applied_at: '19/10/2026',
      status: 'pending',
      program_name: null,
      avatar: 'TH',
    },
    {
      id: 5,
      full_name: 'Nguyễn Văn An',
      student_code: 'TTS0001',
      email: 'intern@ictu.edu.vn',
      phone: '0912.345.678',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Công nghệ thông tin',
      gpa: '3.65',
      cv_file: 'CV_TTS.pdf',
      app_file: 'Đơn_xin_thực_tập.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0001.pdf',
      applied_at: '28/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'TTS',
    },
    {
      id: 6,
      full_name: 'Lê Hoàng Nam',
      student_code: 'TTS0002',
      email: 'tts02@student.ictu.edu.vn',
      phone: '0912.345.002',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'Kỹ thuật phần mềm',
      gpa: '3.50',
      cv_file: 'CV_LeHoangNam.pdf',
      app_file: 'Đơn_xin_thực_tập_LeHoangNam.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0002.pdf',
      applied_at: '27/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'LN',
    },
    {
      id: 8,
      full_name: 'Trần Thị Mai Phương',
      student_code: 'TTS0003',
      email: 'tts03@student.ictu.edu.vn',
      phone: '0912.345.003',
      faculty: 'Khoa Hệ thống Thông tin Kinh tế',
      major: 'Hệ thống thông tin',
      gpa: '3.72',
      cv_file: 'CV_TranThiMaiPhuong.pdf',
      app_file: 'Đơn_xin_thực_tập_MaiPhuong.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0003.pdf',
      applied_at: '26/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'TP',
    },
    {
      id: 9,
      full_name: 'Hoàng Minh Đức',
      student_code: 'TTS0004',
      email: 'tts04@student.ictu.edu.vn',
      phone: '0912.345.004',
      faculty: 'Khoa Công nghệ Thông tin',
      major: 'An toàn thông tin',
      gpa: '3.60',
      cv_file: 'CV_HoangMinhDuc.pdf',
      app_file: 'Đơn_xin_thực_tập_MinhDuc.pdf',
      contract_file: 'HopDong_ThoaThuan_TTS0004.pdf',
      applied_at: '25/09/2026',
      status: 'approved',
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      avatar: 'MD',
    },
  ],
  contracts: [
    {
      id: 1,
      intern_id: 5,
      contract_code: 'HĐTT-2026-001',
      student_name: 'Nguyễn Văn An',
      student_code: 'TTS0001',
      faculty: 'Khoa Công nghệ Thông tin',
      doc_type: 'Thỏa thuận thực tập 3 bên & NDA',
      created_at: '28/09/2026',
      signed_intern: true,
      signed_company: true,
      signed_ictu: true,
      status: 'completed',
      status_label: 'Đã hoàn tất ký số 3 bên',
      cert: 'ICTU-CA Verified (28/09)',
    },
    {
      id: 2,
      intern_id: 6,
      contract_code: 'HĐTT-2026-002',
      student_name: 'Lê Hoàng Nam',
      student_code: 'TTS0002',
      faculty: 'Khoa Công nghệ Thông tin',
      doc_type: 'Thỏa thuận thực tập 3 bên & NDA',
      created_at: '27/09/2026',
      signed_intern: true,
      signed_company: true,
      signed_ictu: true,
      status: 'completed',
      status_label: 'Đã hoàn tất ký số 3 bên',
      cert: 'ICTU-CA Verified (27/09)',
    },
    {
      id: 3,
      intern_id: 8,
      contract_code: 'HĐTT-2026-003',
      student_name: 'Trần Thị Mai Phương',
      student_code: 'TTS0003',
      faculty: 'Khoa Hệ thống Thông tin Kinh tế',
      doc_type: 'Thỏa thuận thực tập 3 bên & NDA',
      created_at: '26/09/2026',
      signed_intern: true,
      signed_company: true,
      signed_ictu: true,
      status: 'completed',
      status_label: 'Đã hoàn tất ký số 3 bên',
      cert: 'ICTU-CA Verified (26/09)',
    },
    {
      id: 4,
      intern_id: 9,
      contract_code: 'HĐTT-2026-004',
      student_name: 'Hoàng Minh Đức',
      student_code: 'TTS0004',
      faculty: 'Khoa Công nghệ Thông tin',
      doc_type: 'Thỏa thuận thực tập 3 bên & NDA',
      created_at: '25/09/2026',
      signed_intern: true,
      signed_company: true,
      signed_ictu: true,
      status: 'completed',
      status_label: 'Đã hoàn tất ký số 3 bên',
      cert: 'ICTU-CA Verified (25/09)',
    },
  ],
  mentorAssignments: [
    {
      id: 1,
      intern_id: 5,
      student: 'Nguyễn Văn An',
      student_code: 'TTS0001 • K20-CNTT',
      company: 'ICTU Software Engineering Lab',
      project: 'Dự án Core API Microservice & Quản lý TTS',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Trần Hoàng Quân',
      mentor_role: 'Senior Tech Lead',
      mentor_id: 3,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 2,
      intern_id: 6,
      student: 'Lê Hoàng Nam',
      student_code: 'TTS0002 • K20-KTPM',
      company: 'Phòng Đảm bảo Chất lượng Phần mềm (QA Lab)',
      project: 'HR Portal Web App & Tuyển dụng sinh viên',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Phạm Quốc Hướng',
      mentor_role: 'QA Lead Engineer',
      mentor_id: 4,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 3,
      intern_id: 8,
      student: 'Trần Thị Mai Phương',
      student_code: 'TTS0003 • K21-HTTT',
      company: 'Trung tâm Dữ liệu & Hệ thống Thông tin',
      project: 'Enterprise Data Dashboard & BI',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Trần Hoàng Quân',
      mentor_role: 'Senior Tech Lead',
      mentor_id: 3,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
    {
      id: 4,
      intern_id: 9,
      student: 'Hoàng Minh Đức',
      student_code: 'TTS0004 • K20-ATTT',
      company: 'Trung tâm An toàn Thông tin & Tác chiến mạng',
      project: 'Security Infrastructure, SSO & Pentest Web API',
      program_id: 1,
      program_name: 'Khóa K20 - Kỳ Thu 2026',
      mentor: 'Phạm Quốc Hướng',
      mentor_role: 'QA Lead Engineer',
      mentor_id: 4,
      status: 'assigned',
      status_label: 'Đã phân công',
    },
  ],
};

/**
 * Lấy toàn bộ trạng thái đồng bộ hiện tại từ LocalStorage
 * Tự động chuẩn hóa đúng 4 TTS và 1 Ứng viên
 */
export function getRealtimeSyncState() {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (!Array.isArray(parsed.applicants)) {
          parsed.applicants = [...DEFAULT_INITIAL_DATA.applicants];
        }
        // Lọc bỏ triệt để mọi tài khoản HR, Admin, Mentor bị lẫn vào danh sách applicants
        const NON_INTERN_EMAILS = new Set([
          'hr@ictu.edu.vn', 'hr2@ictu.edu.vn',
          'admin@ictu.edu.vn',
          'mentor@ictu.edu.vn', 'mentor2@ictu.edu.vn',
        ]);
        const ALLOWED_IDS = new Set([5, 6, 7, 8, 9]);
        const VALID_INTERN_IDS = new Set([5, 6, 8, 9]);

        // 1. Chuẩn hóa danh sách applicants: Chỉ giữ đúng 4 TTS, 1 Ứng viên và hồ sơ mới do HR tạo
        parsed.applicants = parsed.applicants.filter((a) => {
          const email = (a.email || '').toLowerCase().trim();
          const role = (a.role || '').toLowerCase().trim();
          if (role && role !== 'intern' && role !== 'applicant') return false;
          if (NON_INTERN_EMAILS.has(email)) return false;
          if (email.startsWith('hr') && email.endsWith('@ictu.edu.vn') && !email.includes('student')) return false;
          if (email.startsWith('admin') && email.endsWith('@ictu.edu.vn')) return false;
          if (email.startsWith('mentor') && email.endsWith('@ictu.edu.vn')) return false;
          return ALLOWED_IDS.has(Number(a.id)) || Number(a.id) > 9 || typeof a.id === 'string';
        });

        // Đảm bảo đầy đủ 4 TTS chính thức có mặt
        for (const defApp of DEFAULT_INITIAL_DATA.applicants) {
          if (!parsed.applicants.some((a) => a.id === defApp.id)) {
            parsed.applicants.push(defApp);
          }
        }

        // 2. Chuẩn hóa danh sách hợp đồng: Chỉ giữ hợp đồng của 4 TTS chính thức và hồ sơ mới
        parsed.contracts = (parsed.contracts || []).filter((c) => VALID_INTERN_IDS.has(Number(c.intern_id)) || Number(c.intern_id) > 9);
        for (const defCon of DEFAULT_INITIAL_DATA.contracts) {
          if (!parsed.contracts.some((c) => c.intern_id === defCon.intern_id)) {
            parsed.contracts.push(defCon);
          }
        }

        // 3. Chuẩn hóa danh sách phân công Mentor: Tôn trọng unassigned_intern_ids và hỗ trợ mọi Mentor
        const unassignedSet = new Set((parsed.unassigned_intern_ids || []).map(Number));

        parsed.mentorAssignments = (parsed.mentorAssignments || []).filter(
          (m) => !unassignedSet.has(Number(m.intern_id))
        );
        const seenAssigned = new Set();
        parsed.mentorAssignments = parsed.mentorAssignments.filter((m) => {
          const numId = Number(m.intern_id);
          if (seenAssigned.has(numId)) return false;
          seenAssigned.add(numId);
          return true;
        });

        for (const defAssign of DEFAULT_INITIAL_DATA.mentorAssignments) {
          const defInternId = Number(defAssign.intern_id);
          if (!unassignedSet.has(defInternId) && !parsed.mentorAssignments.some((m) => Number(m.intern_id) === defInternId)) {
            parsed.mentorAssignments.push(defAssign);
          }
        }

        // Luôn đồng bộ lưu lại state sạch vào LocalStorage
        try {
          localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(parsed));
        } catch {}

        if (!parsed.templates || !Array.isArray(parsed.templates) || parsed.templates.length === 0) {
          parsed.templates = [...DEFAULT_CONTRACT_TEMPLATES];
        } else {
          for (const defTpl of DEFAULT_CONTRACT_TEMPLATES) {
            if (!parsed.templates.some((t) => t.id === defTpl.id || t.code === defTpl.code)) {
              parsed.templates.push(defTpl);
            }
          }
        }

        // 2. Kiểm tra xem ứng viên thực sự đã nộp CV chưa
        const cvSubRaw = localStorage.getItem('applicant_cv_submission');
        let hasActualCv = false;
        let actualCvName = null;
        let actualCvDate = null;
        if (cvSubRaw) {
          try {
            const parsedCv = JSON.parse(cvSubRaw);
            if (parsedCv?.file_name && parsedCv.file_name !== 'CV_UngVien.pdf') {
              hasActualCv = true;
              actualCvName = parsedCv.file_name;
              actualCvDate = parsedCv.submitted_at
                ? new Date(parsedCv.submitted_at).toLocaleDateString('vi-VN')
                : null;
            } else if (parsedCv?.file_name === 'CV_UngVien.pdf') {
              localStorage.removeItem('applicant_cv_submission');
            }
          } catch {}
        }

        // Cập nhật trạng thái ứng viên theo dữ liệu thực
        parsed.applicants = parsed.applicants.map((a) => {
          const savedAvt = getSavedAvatar(a.email, a.id);
          const currentAvt = savedAvt || a.avatar;
          if (a.email === 'ungvien@ictu.edu.vn' || a.id === 7) {
            let hasActiveRejection = false;
            let rejectReason = '';
            try {
              const decRaw = localStorage.getItem('applicant_decision_status');
              if (decRaw) {
                const dec = JSON.parse(decRaw);
                if (dec?.status === 'rejected' && (!dec.applicantId || dec.applicantId === a.id || a.email === 'ungvien@ictu.edu.vn')) {
                  hasActiveRejection = true;
                  rejectReason = dec.reason || '';
                }
              }
            } catch {}

            if (hasActiveRejection || a.status === 'rejected') {
              return {
                ...a,
                status: 'rejected',
                reject_reason: rejectReason || a.reject_reason || 'Hồ sơ chưa đáp ứng đủ yêu cầu tiếp nhận thực tập đợt này.',
                contract_sent: false,
                contract_file: null,
                contract_info: null,
                avatar: currentAvt,
              };
            }

            if (!hasActualCv) {
              return {
                ...a,
                cv_file: null,
                app_file: null,
                contract_file: null,
                applied_at: null,
                status: 'unsubmitted',
                avatar: currentAvt,
              };
            } else {
              let resolvedStatus = a.status === 'approved' ? 'approved' : 'pending';
              return {
                ...a,
                cv_file: actualCvName || a.cv_file,
                applied_at: actualCvDate || a.applied_at,
                status: resolvedStatus,
                avatar: currentAvt,
              };
            }
          }
          return {
            ...a,
            avatar: currentAvt,
          };
        });

        // Đảm bảo lưu lại store đã làm sạch
        try {
          localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(parsed));
        } catch {}

        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc store đồng bộ:', err);
  }
  // Khởi tạo mặc định nếu chưa có
  try {
    localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(DEFAULT_INITIAL_DATA));
  } catch {
    /* ignore */
  }
  return DEFAULT_INITIAL_DATA;
}

/**
 * Lưu trạng thái đồng bộ mới và thông báo cho toàn hệ thống
 */
export function saveRealtimeSyncState(newState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(newState));
  } catch (err) {
    console.error('Lỗi ghi store đồng bộ:', err);
  }
}

/**
 * Phát sự kiện thời gian thực (Real-time Broadcast) tới tất cả các tab và component
 */
export function emitRealtimeEvent(type, payload = {}) {
  const eventData = {
    type,
    payload,
    timestamp: Date.now(),
  };

  // 1. Gửi qua BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(eventData);
    } catch (err) {
      console.warn('Lỗi postMessage BroadcastChannel:', err);
    }
  }

  // 2. Ghi vào localStorage kích hoạt sự kiện storage liên tab
  try {
    localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(eventData));
  } catch {
    /* ignore */
  }

  // 3. Dispatch CustomEvent nội bộ trang hiện tại
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ictu_realtime_sync_event', { detail: eventData }));
  }
}

/**
 * Lắng nghe tất cả các sự kiện thay đổi thời gian thực
 */
export function subscribeRealtimeEvents(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcast = (event) => {
    if (event?.data) callback(event.data);
  };

  const handleStorage = (event) => {
    if (event.key === STORAGE_EVENT_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        callback(parsed);
      } catch {
        /* ignore */
      }
    }
  };

  const handleCustom = (event) => {
    if (event?.detail) callback(event.detail);
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('storage', handleStorage);
  window.addEventListener('ictu_realtime_sync_event', handleCustom);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('ictu_realtime_sync_event', handleCustom);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁC THAO TÁC NGHIỆP VỤ ĐỒNG BỘ THỜI GIAN THỰC (ACTION DISPATCHERS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Ứng viên nộp CV / hồ sơ mới hoặc nộp lại (từ trang Ứng viên / Intern Upload)
 */
export function syncApplicantSubmission({ applicantId, fullName, email, phone, cvFileName, major, gpa, university, academicYear, address, gender }) {
  const state = getRealtimeSyncState();
  const existingIdx = state.applicants.findIndex(
    (a) => a.id === applicantId || (email && a.email?.toLowerCase() === email.toLowerCase())
  );

  const nowStr = new Date().toLocaleDateString('vi-VN');
  let updatedApplicant;

  // Xóa quyết định từ chối cũ trong localStorage nếu có khi ứng viên nộp lại CV
  try {
    localStorage.removeItem('applicant_decision_status');
  } catch {}

  if (existingIdx >= 0) {
    state.applicants[existingIdx] = {
      ...state.applicants[existingIdx],
      cv_file: cvFileName !== undefined ? cvFileName : state.applicants[existingIdx].cv_file,
      phone: phone || state.applicants[existingIdx].phone,
      major: major || state.applicants[existingIdx].major,
      gpa: gpa || state.applicants[existingIdx].gpa,
      university: university || state.applicants[existingIdx].university,
      academic_year: academicYear || state.applicants[existingIdx].academic_year,
      address: address || state.applicants[existingIdx].address,
      gender: gender || state.applicants[existingIdx].gender,
      applied_at: nowStr,
      status: 'pending', // Reset về pending để HR thẩm định
      reject_reason: undefined,
    };
    updatedApplicant = state.applicants[existingIdx];
  } else {
    updatedApplicant = {
      id: applicantId || Date.now(),
      full_name: fullName || 'Ứng viên mới',
      student_code: `TTS00${state.applicants.length + 1}`,
      email: email || 'ungvien.moi@ictu.edu.vn',
      phone: phone || '0987.654.321',
      faculty: major || 'Khoa Công nghệ Thông tin',
      university: university || 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
      major: major || 'Công nghệ thông tin',
      academic_year: academicYear || 'Năm 4',
      address: address || '',
      gender: gender || 'male',
      gpa: gpa || '3.50',
      cv_file: cvFileName || null,
      app_file: 'Đơn_xin_thực_tập.pdf',
      contract_file: null,
      applied_at: nowStr,
      status: 'pending',
      avatar: (fullName || 'UV').substring(0, 2).toUpperCase(),
    };
    state.applicants.unshift(updatedApplicant);
  }

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.APPLICANT_SUBMITTED, { applicant: updatedApplicant });
  return updatedApplicant;
}

/**
 * Ứng viên xóa CV / hủy nộp hồ sơ (Reset về trạng thái ban đầu chưa nộp)
 */
export function syncApplicantResetSubmission(applicantId, email) {
  const state = getRealtimeSyncState();
  state.applicants = state.applicants.map((a) => {
    if (a.id === applicantId || (email && a.email?.toLowerCase() === email.toLowerCase())) {
      return {
        ...a,
        cv_file: null,
        app_file: null,
        contract_file: null,
        applied_at: null,
        status: 'unsubmitted',
      };
    }
    return a;
  });
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.APPLICANT_SUBMITTED, { applicant: null, applicantId });
}

/**
 * 2. Ứng viên / TTS cập nhật thông tin cá nhân (SĐT, Địa chỉ...) trên trang cá nhân
 */
export function syncApplicantProfileUpdate(updateData) {
  const state = getRealtimeSyncState();
  let changed = false;

  if (updateData.avatar) {
    saveSharedAvatar(updateData.avatar, updateData.email, updateData.id);
  }

  state.applicants = state.applicants.map((a) => {
    if (
      (updateData.id && a.id === updateData.id) ||
      (updateData.email && a.email?.toLowerCase() === updateData.email.toLowerCase())
    ) {
      changed = true;
      return {
        ...a,
        avatar: updateData.avatar !== undefined ? updateData.avatar : (a.avatar || getSavedAvatar(a.email, a.id)),
        phone: updateData.phone || updateData.phone_number || a.phone,
        student_code: updateData.student_code !== undefined ? updateData.student_code : a.student_code,
        university: updateData.university !== undefined ? updateData.university : a.university,
        full_name: updateData.full_name || a.full_name,
        address: updateData.address || a.address,
      };
    }
    return a;
  });

  if (changed) {
    saveRealtimeSyncState(state);
    emitRealtimeEvent(SYNC_EVENTS.APPLICANT_UPDATED, { updateData });
  }
}

/**
 * 2.1 Admin thay đổi trạng thái tài khoản (đóng băng, mở khóa, duyệt, từ chối, xóa, tạo mới)
 * Đồng bộ ngay lập tức tới HR Portal, Mentor Portal và Intern Portal.
 */
export function syncAdminUserChange({ action, user }) {
  if (!user) return;
  const state = getRealtimeSyncState();
  let changed = false;

  const targetId = user.id;
  const targetEmail = (user.email || '').toLowerCase();
  const userRole = (user.role || '').toLowerCase();

  // Nếu user không phải role intern/applicant (vd: HR, Mentor, Admin), tuyệt đối không cho nằm trong danh sách applicants
  if (userRole && userRole !== 'intern' && userRole !== 'applicant') {
    const prevCount = (state.applicants || []).length;
    state.applicants = (state.applicants || []).filter(
      (a) => a.id !== targetId && (targetEmail ? a.email?.toLowerCase() !== targetEmail : true)
    );
    if (state.applicants.length !== prevCount) {
      changed = true;
    }
  }

  const isNonInternEmail =
    targetEmail.startsWith('hr') ||
    targetEmail.startsWith('admin') ||
    targetEmail.startsWith('mentor') ||
    targetEmail === 'hr@ictu.edu.vn' ||
    targetEmail === 'admin@ictu.edu.vn';

  if (action === 'delete') {
    state.applicants = (state.applicants || []).filter(
      (a) => a.id !== targetId && (targetEmail ? a.email?.toLowerCase() !== targetEmail : true)
    );
    state.contracts = (state.contracts || []).filter(
      (c) => c.intern_id !== targetId
    );
    state.mentorAssignments = (state.mentorAssignments || []).filter(
      (m) => m.intern_id !== targetId && m.mentor_id !== targetId
    );
    changed = true;
  } else if (action === 'freeze') {
    if (!isNonInternEmail && (!userRole || userRole === 'intern')) {
      state.applicants = (state.applicants || []).map((a) => {
        if (a.id === targetId || (targetEmail && a.email?.toLowerCase() === targetEmail)) {
          changed = true;
          return { ...a, account_status: 'inactive', is_frozen: true };
        }
        return a;
      });
    }
  } else if (action === 'unfreeze') {
    if (!isNonInternEmail && (!userRole || userRole === 'intern')) {
      state.applicants = (state.applicants || []).map((a) => {
        if (a.id === targetId || (targetEmail && a.email?.toLowerCase() === targetEmail)) {
          changed = true;
          return { ...a, account_status: 'active', is_frozen: false };
        }
        return a;
      });
    }
  } else if (action === 'create' && userRole === 'intern' && !isNonInternEmail) {
    const exists = (state.applicants || []).some(
      (a) => a.id === targetId || (targetEmail && a.email?.toLowerCase() === targetEmail)
    );
    if (!exists) {
      state.applicants.unshift({
        id: targetId || Date.now(),
        full_name: user.full_name || 'Thực tập sinh',
        student_code: user.code || `TTS00${(state.applicants || []).length + 1}`,
        email: user.email,
        phone: user.phone_number || '0987.654.321',
        faculty: 'Khoa Công nghệ Thông tin',
        major: 'Công nghệ thông tin',
        gpa: '3.50',
        cv_file: null,
        app_file: null,
        contract_file: null,
        applied_at: new Date().toLocaleDateString('vi-VN'),
        status: user.status === 'active' ? 'approved' : 'pending',
        avatar: (user.full_name || 'TTS').substring(0, 2).toUpperCase(),
      });
      changed = true;
    }
  }

  if (changed) {
    saveRealtimeSyncState(state);
  }

  emitRealtimeEvent(SYNC_EVENTS.APPLICANT_UPDATED, { action, user });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin_users_updated', { detail: { action, user } }));
  }
}

/**
 * 3. HR duyệt hoặc từ chối hồ sơ ứng viên (trên trang HR)
 */
export function syncApplicantDecision(applicantId, decisionStatus, reason = '') {
  const state = getRealtimeSyncState();
  let targetApplicant = null;

  state.applicants = state.applicants.map((a) => {
    const isTarget =
      a.id === applicantId ||
      String(a.id) === String(applicantId) ||
      (applicantId === 7 && a.email?.toLowerCase() === 'ungvien@ictu.edu.vn') ||
      (a.email && a.email.toLowerCase() === 'ungvien@ictu.edu.vn' && (applicantId === 7 || applicantId === '7'));

    if (isTarget) {
      targetApplicant = {
        ...a,
        status: decisionStatus,
        reject_reason: decisionStatus === 'rejected' ? (reason || 'Hồ sơ chưa đáp ứng đủ yêu cầu tiếp nhận thực tập đợt này.') : undefined,
      };
      if (decisionStatus === 'rejected') {
        targetApplicant.contract_sent = false;
        targetApplicant.contract_code = undefined;
        targetApplicant.contract_file = null;
        targetApplicant.contract_info = null;
      }
      return targetApplicant;
    }
    return a;
  });

  if (decisionStatus === 'rejected') {
    // 1. Dọn sạch hợp đồng của ứng viên bị từ chối
    if (state.contracts) {
      state.contracts = state.contracts.filter(
        (c) =>
          c.intern_id !== applicantId &&
          String(c.intern_id) !== String(applicantId) &&
          c.student_name !== targetApplicant?.full_name &&
          c.email !== targetApplicant?.email
      );
    }
    // 2. Xóa sạch cache hợp đồng chờ ký trên máy ứng viên
    try {
      localStorage.removeItem('applicant_pending_contract');
    } catch {}
  }

  saveRealtimeSyncState(state);

  // Lưu trạng thái decision vào localStorage để trang applicant cập nhật kết quả duyệt
  try {
    localStorage.setItem(
      'applicant_decision_status',
      JSON.stringify({
        status: decisionStatus,
        applicantId,
        targetEmail: targetApplicant?.email,
        reason: decisionStatus === 'rejected' ? (reason || 'Hồ sơ chưa đáp ứng đủ yêu cầu tiếp nhận thực tập đợt này.') : '',
        timestamp: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }

  emitRealtimeEvent(SYNC_EVENTS.APPLICANT_DECISION, {
    applicantId,
    targetEmail: targetApplicant?.email,
    status: decisionStatus,
    reason,
    applicant: targetApplicant,
  });

  return targetApplicant;
}

/**
 * 4.1 HR chọn mẫu văn bản và gửi hợp đồng tiếp nhận cho ứng viên đã duyệt
 */
export function syncSendContractToApplicant(applicantId, contractInfo = {}) {
  const state = getRealtimeSyncState();
  const applicant = state.applicants.find((a) => Number(a.id) === Number(applicantId)) || contractInfo;
  const fullName = applicant?.full_name || contractInfo.student_name || 'Ứng viên';
  const studentCode = contractInfo.student_code !== undefined ? contractInfo.student_code : (applicant?.student_code || `DTC${applicantId}`);
  const university = contractInfo.university !== undefined ? contractInfo.university : (applicant?.university || 'Đại học CNTT & TT Thái Nguyên (ICTU)');
  const phone = contractInfo.phone || applicant?.phone || '';
  const email = contractInfo.email || applicant?.email || '';
  const faculty = contractInfo.faculty || applicant?.faculty || applicant?.major || 'Khoa Công nghệ Thông tin';

  const newContract = {
    id: contractInfo.id || Date.now() + Number(applicantId || 1),
    intern_id: Number(applicantId) || applicantId,
    contract_code: contractInfo.contract_code || `HĐTT-2026-${String(applicantId).padStart(3, '0')}`,
    student_name: fullName,
    student_code: studentCode,
    university: university,
    phone: phone,
    email: email,
    faculty: faculty,
    doc_type: contractInfo.doc_type || 'Hợp đồng Tiếp nhận Thực tập Doanh nghiệp & Cam kết Bảo mật (NDA)',
    duration: contractInfo.duration || '03 tháng (Từ 01/10/2026 đến 31/12/2026)',
    created_at: new Date().toLocaleDateString('vi-VN'),
    start_date: contractInfo.start_date || '01/10/2026',
    end_date: contractInfo.end_date || '31/12/2026',
    allowance: contractInfo.allowance || '3.000.000 đ/tháng',
    department: contractInfo.department || 'Trung tâm Phát triển Phần mềm ICTU',
    notes: contractInfo.notes || 'Thực tập sinh chính thức đợt tiếp nhận 2026',
    signed_intern: false,
    signed_company: true,
    signed_ictu: true,
    status: 'pending_intern',
    status_label: 'Chờ sinh viên ký số',
    cert: 'ICTU & Doanh nghiệp đã ký duyệt',
  };

  // Cập nhật hoặc thêm vào danh sách hợp đồng
  state.contracts = (state.contracts || []).filter((c) => Number(c.intern_id) !== Number(applicantId));
  state.contracts.unshift(newContract);

  // Cập nhật trạng thái applicant là đã được gửi hợp đồng
  state.applicants = state.applicants.map((a) =>
    Number(a.id) === Number(applicantId)
      ? {
          ...a,
          contract_sent: true,
          contract_code: newContract.contract_code,
          contract_file: `HopDong_TiepNhan_${studentCode}.pdf`,
          contract_info: newContract,
        }
      : a
  );

  saveRealtimeSyncState(state);

  // Lưu thông tin hợp đồng đang chờ ký vào localStorage để cổng Ứng viên hiển thị alert ngay lập tức
  try {
    localStorage.setItem(
      'applicant_pending_contract',
      JSON.stringify({
        applicantId,
        targetEmail: email,
        contract: newContract,
        timestamp: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }

  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_SENT, {
    applicantId,
    targetEmail: email,
    contract: newContract,
    studentName: fullName,
  });

  return newContract;
}

/**
 * 4.2 Thao tác CRUD Kho Mẫu Biểu Hợp Đồng (Templates)
 */
export function syncContractTemplateCreated(template) {
  const state = getRealtimeSyncState();
  if (!state.templates) state.templates = [...DEFAULT_CONTRACT_TEMPLATES];
  const exists = state.templates.some((t) => t.id === template.id || t.code === template.code);
  if (!exists) {
    state.templates.unshift(template);
  }
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_TEMPLATE_CREATED, { template });
  return state.templates;
}

export function syncContractTemplateUpdated(templateId, updatedData) {
  const state = getRealtimeSyncState();
  if (!state.templates) state.templates = [...DEFAULT_CONTRACT_TEMPLATES];
  state.templates = state.templates.map((t) =>
    t.id === templateId || t.code === templateId ? { ...t, ...updatedData } : t
  );
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_TEMPLATE_UPDATED, { templateId, updatedData });
  return state.templates;
}

export function syncContractTemplateDeleted(templateId) {
  const state = getRealtimeSyncState();
  if (!state.templates) state.templates = [...DEFAULT_CONTRACT_TEMPLATES];
  state.templates = state.templates.filter((t) => t.id !== templateId && t.code !== templateId);
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_TEMPLATE_DELETED, { templateId });
  return state.templates;
}

export function getContractTemplates() {
  const state = getRealtimeSyncState();
  return state.templates && state.templates.length > 0 ? state.templates : DEFAULT_CONTRACT_TEMPLATES;
}

/**
 * 4.3 Thao tác CRUD Hợp Đồng Đã Phát Hành (Contracts)
 */
export function syncContractCreated(contractData) {
  const state = getRealtimeSyncState();
  if (!state.contracts) state.contracts = [];
  const newContract = {
    id: contractData.id || Date.now(),
    intern_id: contractData.intern_id || null,
    contract_code: contractData.contract_code || `HĐTT-2026-00${state.contracts.length + 1}`,
    student_name: contractData.student_name || 'Sinh viên',
    student_code: contractData.student_code || '',
    university: contractData.university || '',
    phone: contractData.phone || '',
    email: contractData.email || '',
    faculty: contractData.faculty || 'Khoa Công nghệ Thông tin',
    doc_type: contractData.doc_type || 'Hợp đồng Tiếp nhận Thực tập',
    created_at: new Date().toLocaleDateString('vi-VN'),
    start_date: contractData.start_date || '01/10/2026',
    end_date: contractData.end_date || '31/12/2026',
    allowance: contractData.allowance || '3.000.000 đ/tháng',
    department: contractData.department || 'Trung tâm Phát triển Phần mềm ICTU',
    notes: contractData.notes || '',
    signed_intern: false,
    signed_company: true,
    signed_ictu: true,
    status: contractData.status || 'pending_intern',
    status_label: contractData.status === 'active' ? 'Đang hiệu lực' : 'Chờ sinh viên ký nhận',
    cert: 'ICTU-Verified',
  };
  state.contracts.unshift(newContract);
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_SENT, { contract: newContract });
  return newContract;
}

export function syncContractUpdated(contractId, updatedData) {
  const state = getRealtimeSyncState();
  if (!state.contracts) state.contracts = [];
  state.contracts = state.contracts.map((c) =>
    c.id === contractId || c.contract_code === contractId ? { ...c, ...updatedData } : c
  );
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_UPDATED, { contractId, updatedData });
  return state.contracts;
}

export function syncContractDeleted(contractId) {
  const state = getRealtimeSyncState();
  if (!state.contracts) state.contracts = [];
  const target = state.contracts.find((c) => c.id === contractId || c.contract_code === contractId);
  state.contracts = state.contracts.filter((c) => c.id !== contractId && c.contract_code !== contractId);
  if (target && target.intern_id) {
    state.applicants = state.applicants.map((a) =>
      a.id === target.intern_id ? { ...a, contract_sent: false, contract_code: null, contract_file: null } : a
    );
  }
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_DELETED, { contractId, target });
  return state.contracts;
}

/**
 * 4. TTS ký hợp đồng điện tử (từ trang TTS / ContractSigningPage)
 */
/**
 * 4.1 Kiểm tra xem một thực tập sinh đã ký hợp đồng tiếp nhận thực tập hay chưa.
 * Đảm bảo chỉ những TTS ĐÃ KÝ HỢP ĐỒNG mới được phép phân công Mentor / Nhóm.
 */
export function checkInternContractSigned(intern, syncContracts = []) {
  if (!intern) return false;
  const code = (intern.code || intern.student_code || '').toUpperCase().trim();
  const email = (intern.email || '').toLowerCase().trim();
  const name = (intern.full_name || '').trim();
  const id = Number(intern.id);

  // 1. Các tài khoản TTS chính thức có sẵn (TTS0001 - TTS0004) luôn coi là đã ký HĐ
  if (code.startsWith('TTS') && code !== 'TTS9999') return true;
  if (id === 5 || id === 6 || id === 8 || id === 9) return true;
  if (email === 'intern@ictu.edu.vn' || email.startsWith('tts') || email.includes('an.nv') || email.includes('nam.lh')) {
    return true;
  }

  // 2. Tra cứu trong danh sách contracts
  const contractList = syncContracts && syncContracts.length > 0 ? syncContracts : (getRealtimeSyncState().contracts || []);
  const match = contractList.find((c) => {
    const cId = Number(c.intern_id);
    const cEmail = (c.email || '').toLowerCase().trim();
    const cName = (c.student_name || '').trim();
    return (
      (cId && cId === id) ||
      (cEmail && email && cEmail === email) ||
      (cName && name && cName === name)
    );
  });

  if (match) {
    return Boolean(
      match.signed_intern === true ||
      match.status === 'completed' ||
      match.status === 'active' ||
      (match.status_label && match.status_label.includes('Hoàn tất'))
    );
  }

  // 3. Nếu là ứng viên mới (pending hoặc mã DTC) và chưa có hợp đồng đã ký -> false
  if (intern.status === 'pending' || intern.status === 'unsubmitted' || code.startsWith('DTC') || code.startsWith('UV')) {
    return false;
  }

  return true;
}



export function syncContractSigning(internId, studentName = '') {
  const state = getRealtimeSyncState();
  let signedContract = null;

  state.contracts = state.contracts.map((c) => {
    if (c.intern_id === internId || (studentName && c.student_name === studentName)) {
      signedContract = {
        ...c,
        signed_intern: true,
        status: c.signed_company && c.signed_ictu ? 'completed' : 'pending_ictu',
        status_label: c.signed_company && c.signed_ictu ? 'Đã hoàn tất ký số 3 bên' : 'Chờ Nhà trường xác thực',
        cert: 'Sinh viên đã ký số thành công',
      };
      return signedContract;
    }
    return c;
  });

  // Nếu chưa có hợp đồng của intern này trong store, tạo mới
  if (!signedContract) {
    signedContract = {
      id: Date.now(),
      intern_id: internId || 1,
      contract_code: `HĐTT-2026-00${state.contracts.length + 1}`,
      student_name: studentName || 'TTS',
      student_code: 'TTS0001',
      faculty: 'Khoa Công nghệ Thông tin',
      doc_type: 'Thỏa thuận thực tập 3 bên & NDA',
      created_at: new Date().toLocaleDateString('vi-VN'),
      signed_intern: true,
      signed_company: true,
      signed_ictu: true,
      status: 'completed',
      status_label: 'Đã hoàn tất ký số 3 bên',
      cert: 'Sinh viên đã ký xác nhận',
    };
    state.contracts.push(signedContract);
  }

  try {
    localStorage.removeItem('applicant_pending_contract');
  } catch {
    /* ignore */
  }

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_SIGNED, { contract: signedContract, internId });
  return signedContract;
}

/**
 * 5. HR tải lên hợp đồng mới cho sinh viên (từ trang HR)
 */
export function syncContractUploaded(internId, fileName) {
  const state = getRealtimeSyncState();
  state.applicants = state.applicants.map((a) =>
    a.id === internId ? { ...a, contract_file: fileName } : a
  );

  const existingContract = state.contracts.find((c) => c.intern_id === internId);
  if (existingContract) {
    existingContract.doc_type = fileName;
  } else {
    state.contracts.push({
      id: Date.now(),
      intern_id: internId,
      contract_code: `HĐTT-2026-00${state.contracts.length + 1}`,
      student_name: state.applicants.find((a) => a.id === internId)?.full_name || 'Thực tập sinh',
      student_code: state.applicants.find((a) => a.id === internId)?.student_code || 'TTS0001',
      faculty: 'Khoa Công nghệ Thông tin',
      doc_type: fileName,
      created_at: new Date().toLocaleDateString('vi-VN'),
      signed_intern: false,
      signed_company: true,
      signed_ictu: false,
      status: 'pending_intern',
      status_label: 'Chờ sinh viên ký số',
      cert: 'Doanh nghiệp đã tải lên',
    });
  }

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_UPLOADED, { internId, fileName });
}

/**
 * 5.1 HR tạo hợp đồng mới hoàn chỉnh (từ modal Tạo hợp đồng mới)
 */
export function syncContractRecordCreated(contract) {
  const state = getRealtimeSyncState();
  const exists = state.contracts.some((c) => c.id === contract.id || c.contract_code === contract.contract_code);
  if (!exists) {
    state.contracts.unshift(contract);
  }
  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.CONTRACT_UPLOADED, { contract, internId: contract.intern_id });
}

/**
 * 6. HR phân công TTS cho Mentor (từ trang HR Mentors hoặc Matching Modal)
 */
export function syncMentorAssignment(mentorId, mentorName, internIds, projectName = 'Dự án Phát triển Hệ thống', options = {}) {
  const state = getRealtimeSyncState();

  if (state.unassigned_intern_ids) {
    state.unassigned_intern_ids = state.unassigned_intern_ids.filter((id) => !internIds.includes(id));
  }

  // Loại bỏ bản ghi phân công trước đó của chính những internId này (để tránh trùng lặp khi re-assign),
  // tuyệt đối KHÔNG xoá các TTS khác của cùng Mentor thuộc nhóm khác (1 Mentor có thể phụ trách nhiều nhóm).
  const internIdSet = new Set(internIds.map(Number));
  state.mentorAssignments = (state.mentorAssignments || []).filter(
    (m) => !internIdSet.has(Number(m.intern_id))
  );

  const resolvedProgName =
    options.programName ||
    (projectName && projectName.includes('Kỳ') ? projectName : 'Khóa K20 - Kỳ Thu 2026');
  const resolvedProgId = options.programId || 1;
  const resolvedDeptName = options.departmentName || 'Trung tâm Phát triển Phần mềm ICTU';
  const resolvedGroupName = options.groupName || projectName;

  internIds.forEach((internId) => {
    const internObj = state.applicants.find((a) => a.id === internId);
    const studentName = internObj?.full_name || `TTS #${internId}`;
    const studentCode = internObj?.student_code || `TTS000${internId}`;

    const existingIdx = state.mentorAssignments.findIndex((m) => m.intern_id === internId);
    const assignRecord = {
      id: Date.now() + internId,
      intern_id: internId,
      student: studentName,
      student_code: `${studentCode} • CNTT`,
      company: resolvedDeptName,
      project: projectName,
      program_id: resolvedProgId,
      program_name: resolvedProgName,
      department_id: options.departmentId || null,
      department_name: resolvedDeptName,
      group_id: options.groupId || null,
      group_name: resolvedGroupName,
      mentor: mentorName,
      mentor_role: 'Mentor Hướng dẫn',
      mentor_id: mentorId,
      status: 'assigned',
      status_label: 'Đã phân công',
      assigned_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      state.mentorAssignments[existingIdx] = assignRecord;
    } else {
      state.mentorAssignments.push(assignRecord);
    }

    // Cập nhật đa phân hệ vào danh sách applicants
    const appIdx = state.applicants.findIndex((a) => a.id === internId);
    if (appIdx >= 0) {
      state.applicants[appIdx] = {
        ...state.applicants[appIdx],
        program_id: resolvedProgId,
        program_name: resolvedProgName,
        mentor_id: mentorId,
        mentor_name: mentorName,
        department_name: resolvedDeptName,
        group_id: options.groupId ? String(options.groupId) : null,
        group_name: resolvedGroupName,
      };
    }
  });

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.MENTOR_ASSIGNED, {
    mentorId,
    mentorName,
    internIds,
    count: internIds.length,
    programName: resolvedProgName,
  });
}

/**
 * 6.0 HR tạo nhóm thực tập mới (đồng bộ realtime giữa HR, Mentor và Intern)
 */
export function syncCreateInternshipGroup(groupData) {
  if (!groupData || !groupData.name) return;
  const state = getRealtimeSyncState();
  if (!state.groups) {
    state.groups = [];
  }
  const newGroup = {
    id: groupData.id || Date.now(),
    name: groupData.name,
    code: groupData.code || `GRP-${Date.now().toString().slice(-4)}`,
    department_id: groupData.department_id ? Number(groupData.department_id) : undefined,
    department_name: groupData.department_name || '',
    program_id: groupData.program_id ? Number(groupData.program_id) : 1,
    program_name: groupData.program_name || 'Khóa K20 - Kỳ Thu 2026',
    leader_user_id: groupData.leader_user_id || groupData.mentor_id ? Number(groupData.leader_user_id || groupData.mentor_id) : undefined,
    mentor_id: groupData.mentor_id || groupData.leader_user_id ? Number(groupData.mentor_id || groupData.leader_user_id) : undefined,
    lead_name: groupData.lead_name || groupData.leader_name || 'Mentor',
    leader_name: groupData.leader_name || groupData.lead_name || 'Mentor',
    max_members: Number(groupData.max_members) || 5,
    max_slots: Number(groupData.max_members) || 5,
    current_slots: 0,
    current_members_count: 0,
    description: groupData.description || '',
    members: [],
    created_at: new Date().toISOString(),
    ...groupData,
  };
  const existingIdx = state.groups.findIndex((g) => String(g.id) === String(newGroup.id));
  if (existingIdx >= 0) {
    state.groups[existingIdx] = { ...state.groups[existingIdx], ...newGroup };
  } else {
    state.groups.unshift(newGroup);
  }
  saveRealtimeSyncState(state);
  emitRealtimeEvent('SYNC_GROUPS_UPDATED', {
    groupId: newGroup.id,
    name: newGroup.name,
    mentorId: newGroup.leader_user_id || newGroup.mentor_id,
    group: newGroup,
  });
  return newGroup;
}

/**
 * 6.1 HR hủy phân công của một TTS (chuyển về trạng thái chờ phân công)
 */
export function syncUnassignMentor(internId) {
  const state = getRealtimeSyncState();
  const numId = Number(internId);

  // 1. Gỡ khỏi danh sách mentorAssignments
  state.mentorAssignments = (state.mentorAssignments || []).filter((m) => Number(m.intern_id) !== numId);

  // 2. Đưa vào danh sách unassigned_intern_ids
  if (!state.unassigned_intern_ids) {
    state.unassigned_intern_ids = [];
  }
  const currentUnassignedNums = state.unassigned_intern_ids.map(Number);
  if (!currentUnassignedNums.includes(numId)) {
    state.unassigned_intern_ids.push(numId);
  }

  // 3. Cập nhật applicants: Xóa sạch thông tin mentor và nhóm
  if (Array.isArray(state.applicants)) {
    state.applicants = state.applicants.map((a) => {
      if (Number(a.id) === numId) {
        return {
          ...a,
          mentor_id: null,
          mentor_name: null,
          mentor: null,
          group_id: null,
          group_name: null,
          lab: null,
          project: null,
          status_label: 'Chờ phân công',
        };
      }
      return a;
    });
  }

  // 4. Cập nhật groups (nếu có cấu trúc nhóm trong realtime state)
  if (Array.isArray(state.groups)) {
    state.groups = state.groups.map((g) => ({
      ...g,
      members: (g.members || []).filter((m) => Number(m.id || m.intern_id) !== numId),
      intern_ids: (g.intern_ids || []).filter((id) => Number(id) !== numId),
      member_ids: (g.member_ids || []).filter((id) => Number(id) !== numId),
      current_slots: Math.max(0, (g.current_slots || 0) - 1),
    }));
  }

  saveRealtimeSyncState(state);

  // 5. Phát tán đa sự kiện realtime để tất cả các bên cập nhật ngay lập tức
  emitRealtimeEvent(SYNC_EVENTS.MENTOR_ASSIGNED, {
    internId: numId,
    unassigned: true,
  });
  emitRealtimeEvent('SYNC_GROUPS_UPDATED', {
    internId: numId,
    unassigned: true,
  });
  emitRealtimeEvent('SYNC_MENTOR_UNASSIGNED', {
    internId: numId,
  });

  try {
    window.dispatchEvent(new CustomEvent('intern_data_sync_event', { detail: { internId: numId, unassigned: true } }));
    window.dispatchEvent(new CustomEvent('intern_data_changed'));
  } catch {}
}

/**
 * 6.2 HR điều chuyển một TTS sang Mentor khác
 */
export function syncReassignMentor(internId, newMentorId, newMentorName, projectName = 'Dự án Phát triển Hệ thống') {
  const state = getRealtimeSyncState();
  if (state.unassigned_intern_ids) {
    state.unassigned_intern_ids = state.unassigned_intern_ids.filter((id) => id !== internId);
  }
  const internObj = (state.applicants || []).find((a) => a.id === internId);
  const studentName = internObj?.full_name || `TTS #${internId}`;
  const studentCode = internObj?.student_code || `TTS000${internId}`;

  // Gỡ phân công cũ
  state.mentorAssignments = (state.mentorAssignments || []).filter((m) => m.intern_id !== internId);

  // Thêm phân công mới
  state.mentorAssignments.push({
    id: Date.now() + internId,
    intern_id: internId,
    student: studentName,
    student_code: studentCode,
    company: 'ICTU Software Engineering Lab',
    project: projectName,
    mentor: newMentorName,
    mentor_role: 'Mentor Hướng dẫn',
    mentor_id: newMentorId,
    status: 'assigned',
    status_label: 'Đã phân công',
  });

  saveRealtimeSyncState(state);
  emitRealtimeEvent(SYNC_EVENTS.MENTOR_ASSIGNED, {
    internId,
    mentorId: newMentorId,
    mentorName: newMentorName,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TÍNH TOÁN CÁC CHỈ SỐ TỔNG HỢP CHO TRANG HR THỜI GIAN THỰC (REAL-TIME METRICS)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateHrDashboardMetrics() {
  const state = getRealtimeSyncState();

  // 1. Phễu ứng viên & Hồ sơ
  const totalApplicants = state.applicants.length;
  const pendingCount = state.applicants.filter((a) => a.cv_file && a.status === 'pending').length;
  const unsubmittedCount = state.applicants.filter((a) => !a.cv_file || a.status === 'unsubmitted').length;
  const approvedCount = state.applicants.filter((a) => a.status === 'approved').length;
  const rejectedCount = state.applicants.filter((a) => a.status === 'rejected').length;

  // 2. Phân công Mentor (Thẻ KPI 3)
  const totalInterns = Math.max(approvedCount, 1);
  const assignedMentorCount = state.mentorAssignments.filter((m) => m.status === 'assigned').length;
  const mentorAssignPct = totalInterns > 0 ? Math.min(100, Math.round((assignedMentorCount / totalInterns) * 100)) : 0;

  // 3. Hợp đồng thực tập (Thẻ KPI 4 & E-Contract Progress)
  const totalContracts = Math.max(state.contracts.length, 1);
  const internSignedCount = state.contracts.filter((c) => c.signed_intern).length;
  const companySignedCount = state.contracts.filter((c) => c.signed_company).length;
  const ictuSignedCount = state.contracts.filter((c) => c.signed_ictu).length;

  const internSignedPct = Math.min(100, Math.round((internSignedCount / totalContracts) * 100));
  const companySignedPct = Math.min(100, Math.round((companySignedCount / totalContracts) * 100));
  const ictuSignedPct = Math.min(100, Math.round((ictuSignedCount / totalContracts) * 100));

  return {
    applicants: state.applicants,
    totalApplicants,
    pendingCount,
    unsubmittedCount,
    approvedCount,
    rejectedCount,

    // KPI 3
    totalInterns,
    assignedMentorCount,
    mentorAssignPct,
    matchingMatrix: state.mentorAssignments,

    // KPI 4 & E-Contract stack
    totalContracts,
    internSignedCount,
    companySignedCount,
    ictuSignedCount,
    internSignedPct,
    companySignedPct,
    ictuSignedPct,
    contracts: state.contracts,
  };
}

/**
 * Trích xuất thông tin BÊN B cho Hợp đồng (theo đúng logic người dùng yêu cầu):
 * - Nếu TTS là SV đi thực tập (có nhập Mã SV hoặc Tên trường):
 *   Hệ thống trích xuất và hiển thị: Mã SV, Cơ sở đào tạo.
 * - Nếu không có thông tin gì được nhập (TTS tự do / bỏ trống):
 *   Hệ thống ẩn Mã SV & Cơ sở đào tạo đi, thay bằng Số điện thoại (SĐT) & Email của TTS.
 */
export function extractPartyBContractInfo(info) {
  const studentCode = (info?.student_code || info?.studentCode || info?.code || '').trim();
  const university = (info?.university || info?.school_name || info?.school || '').trim();
  const hasStudentInfo = Boolean(studentCode || university);

  return {
    isStudent: hasStudentInfo,
    studentCode: studentCode || '',
    university: university || 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)',
    phone: info?.phone || info?.phone_number || '',
    email: info?.email || '',
    fullName: info?.full_name || info?.student_name || info?.name || 'Thực tập sinh',
  };
}

