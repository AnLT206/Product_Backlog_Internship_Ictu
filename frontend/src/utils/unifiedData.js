/**
 * unifiedData.js
 *
 * Nguồn dữ liệu đồng nhất toàn hệ thống (Single Source of Truth - SSOT)
 * Đồng bộ danh sách Thực tập sinh (TTS), Chuyên cần, Phụ cấp, Mentor và Báo cáo
 * giữa tất cả các phân hệ: HR Portal, Mentor Hub, và Intern Portal.
 */

export const UNIFIED_INTERNS = [
  {
    id: 1,
    intern_id: 5,
    code: 'TTS0001',
    full_name: 'Nguyễn Văn An',
    email: 'intern@ictu.edu.vn',
    phone: '0981234567',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    university_code: 'ICTU',
    major: 'Công nghệ thông tin',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 3,
    mentor_name: 'Trần Hoàng Quân',
    project: 'Core API Microservice & Web Portal',
    applied_date: '28/09/2026',

    // Chuyên cần tháng 10/2026 (Tính đến 12/10 có 8 ngày làm việc)
    standard_work_days: 22,
    actual_work_days: 8,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0,
    attendance_status: 'Bình thường',
    attendance_rate: 98.5,

    // Phụ cấp & Chi trả (Kỳ 10/2026 chưa kết thúc -> Chờ chi trả)
    base_allowance: 2500000,
    bonus_penalty: 300000,
    total_net: 2800000,
    allowance_status: 'pending',
    allowance_status_label: 'Chờ chi trả',

    // Kết quả học tập & Báo cáo
    gpa: 8.8,
    grade: 'Xuất sắc',
  },
  {
    id: 2,
    intern_id: 6,
    code: 'TTS0002',
    full_name: 'Lê Hoàng Nam',
    email: 'tts02@student.ictu.edu.vn',
    phone: '0982345678',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    university_code: 'ICTU',
    major: 'Kỹ thuật phần mềm',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 4,
    mentor_name: 'Phạm Quốc Hướng',
    project: 'Frontend Web & Mobile App',
    applied_date: '27/09/2026',

    // Chuyên cần
    standard_work_days: 22,
    actual_work_days: 8,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0,
    attendance_status: 'Bình thường',
    attendance_rate: 95.8,

    // Phụ cấp & Chi trả (Kỳ 10/2026 chưa kết thúc -> Chờ chi trả)
    base_allowance: 2500000,
    bonus_penalty: -100000,
    total_net: 2400000,
    allowance_status: 'pending',
    allowance_status_label: 'Chờ chi trả',

    // Kết quả học tập
    gpa: 8.2,
    grade: 'Giỏi',
  },
  {
    id: 3,
    intern_id: 8,
    code: 'TTS0003',
    full_name: 'Trần Thị Mai Phương',
    email: 'tts03@student.ictu.edu.vn',
    phone: '0983456789',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    university_code: 'ICTU',
    major: 'Hệ thống thông tin',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 3,
    mentor_name: 'Trần Hoàng Quân',
    project: 'Enterprise Data Dashboard & BI',
    applied_date: '26/09/2026',

    // Chuyên cần
    standard_work_days: 22,
    actual_work_days: 8,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0,
    attendance_status: 'Bình thường',
    attendance_rate: 100.0,

    // Phụ cấp & Chi trả (Kỳ 10/2026 chưa kết thúc -> Chờ chi trả)
    base_allowance: 2000000,
    bonus_penalty: 0,
    total_net: 2000000,
    allowance_status: 'pending',
    allowance_status_label: 'Chờ chi trả',

    // Kết quả học tập
    gpa: 8.4,
    grade: 'Giỏi',
  },
  {
    id: 4,
    intern_id: 9,
    code: 'TTS0004',
    full_name: 'Hoàng Minh Đức',
    email: 'tts04@student.ictu.edu.vn',
    phone: '0984567890',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    university_code: 'ICTU',
    major: 'An toàn thông tin',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 4,
    mentor_name: 'Phạm Quốc Hướng',
    project: 'Security Infrastructure, SSO & Pentest Web API',
    applied_date: '25/09/2026',

    // Chuyên cần
    standard_work_days: 22,
    actual_work_days: 8,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0,
    attendance_status: 'Bình thường',
    attendance_rate: 91.6,

    // Phụ cấp & Chi trả (Kỳ 10/2026 chưa kết thúc -> Chờ chi trả)
    base_allowance: 2200000,
    bonus_penalty: 200000,
    total_net: 2400000,
    allowance_status: 'pending',
    allowance_status_label: 'Chờ chi trả',

    // Kết quả học tập
    gpa: 7.6,
    grade: 'Khá',
  },
]

export const UNIFIED_MENTORS = [
  {
    id: 3,
    full_name: 'Trần Hoàng Quân',
    email: 'mentor@ictu.edu.vn',
    department: 'Kỹ thuật phần mềm (Software Engineering)',
    position: 'Senior Fullstack Tech Lead',
    current_interns: 2, // 2/5 = 40% (Xanh)
    max_interns: 5,
  },
  {
    id: 4,
    full_name: 'Phạm Quốc Hướng',
    email: 'mentor2@ictu.edu.vn',
    department: 'Kiểm thử chất lượng (QA/QC)',
    position: 'QA Lead & Automation Specialist',
    current_interns: 2, // 2/5 = 40% (Xanh)
    max_interns: 5,
  },
]

/**
 * Lấy danh sách chuyên cần theo chuẩn bảng AttendanceReport
 */
export function getUnifiedAttendanceList() {
  return UNIFIED_INTERNS.map((i) => ({
    id: i.id,
    intern_id: i.intern_id,
    code: i.code,
    full_name: i.full_name,
    email: i.email,
    university: i.university,
    major: i.major,
    total_work_days: i.actual_work_days,
    late_count: i.late_count,
    approved_leave_days: i.approved_leave_days,
    unapproved_leave_days: i.unapproved_leave_days,
    status: i.attendance_status,
    batch: i.batch,
    month: '10',
    year: 2026,
  }))
}

/**
 * Lấy danh sách phụ cấp theo chuẩn bảng AllowanceManagement
 */
export function getUnifiedAllowanceList() {
  return UNIFIED_INTERNS.map((i) => ({
    id: i.id,
    intern_id: i.intern_id,
    code: i.code,
    full_name: i.full_name,
    email: i.email,
    actual_days: i.actual_work_days,
    base_allowance: i.base_allowance,
    bonus_penalty: i.bonus_penalty,
    total_net: i.total_net,
    status: i.allowance_status,
    status_label: i.allowance_status_label,
  }))
}

/**
 * Lấy danh sách báo cáo theo chuẩn bảng HRAnalyticsDashboard
 */
export function getUnifiedReportList() {
  return UNIFIED_INTERNS.map((i) => ({
    id: i.code,
    name: i.full_name,
    school: i.university,
    schoolCode: i.university_code,
    major: i.major,
    batch: i.batch,
    gpa: i.gpa,
    grade: i.grade,
    attendanceRate: i.attendance_rate,
    attendanceSessions: `${i.actual_work_days}/${i.standard_work_days}`,
    mentor: i.mentor_name,
  }))
}

