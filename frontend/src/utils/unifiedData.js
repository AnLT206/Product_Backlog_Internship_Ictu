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
    intern_id: 1,
    code: 'TTS0001',
    full_name: 'Nguyễn Văn An',
    email: 'an.nv@student.ictu.edu.vn',
    phone: '0981234567',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    university_code: 'ICTU',
    major: 'Kỹ thuật Phần mềm',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 3,
    mentor_name: 'Trần Hoàng Quân',
    project: 'Core API Microservice & Web Portal',
    applied_date: '02/10/2026',

    // Chuyên cần tháng 10/2026 (Tính đến 12/10 có 8 ngày làm việc)
    standard_work_days: 22,
    actual_work_days: 8,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0,
    attendance_status: 'Bình thường',
    attendance_rate: 100,

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
    intern_id: 2,
    code: 'TTS0002',
    full_name: 'Trần Thị Bình',
    email: 'binh.tt@student.ictu.edu.vn',
    phone: '0982345678',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    university_code: 'ICTU',
    major: 'Công nghệ Thông tin',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 4,
    mentor_name: 'Phạm Quốc Hướng',
    project: 'Frontend Web & Mobile App',
    applied_date: '02/10/2026',

    // Chuyên cần
    standard_work_days: 22,
    actual_work_days: 8,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0,
    attendance_status: 'Bình thường',
    attendance_rate: 100,

    // Phụ cấp & Chi trả (Kỳ 10/2026 chưa kết thúc -> Chờ chi trả)
    base_allowance: 2500000,
    bonus_penalty: 500000,
    total_net: 3000000,
    allowance_status: 'pending',
    allowance_status_label: 'Chờ chi trả',

    // Kết quả học tập
    gpa: 8.4,
    grade: 'Giỏi',
  },
  {
    id: 3,
    intern_id: 3,
    code: 'TTS0003',
    full_name: 'Lê Hoàng Nam',
    email: 'nam.lh@student.ictu.edu.vn',
    phone: '0983456789',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    university_code: 'ICTU',
    major: 'Hệ thống Thông tin',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 11,
    mentor_name: 'Vũ Đình Tuấn',
    project: 'DevOps & Cloud Infrastructure',
    applied_date: '03/10/2026',

    // Chuyên cần: Đi muộn 3 lần -> Bôi vàng cảnh báo
    standard_work_days: 22,
    actual_work_days: 7,
    late_count: 3,
    approved_leave_days: 1,
    unapproved_leave_days: 0,
    attendance_status: 'Cảnh báo đi muộn',
    attendance_rate: 87.5,

    // Phụ cấp & Chi trả (Kỳ 10/2026 chưa kết thúc -> Chờ chi trả)
    base_allowance: 2500000,
    bonus_penalty: -100000,
    total_net: 2400000,
    allowance_status: 'pending',
    allowance_status_label: 'Chờ chi trả',

    // Kết quả học tập
    gpa: 7.6,
    grade: 'Khá',
  },
  {
    id: 4,
    intern_id: 4,
    code: 'TTS0004',
    full_name: 'Phạm Minh Đức',
    email: 'duc.pm@student.ictu.edu.vn',
    phone: '0984567890',
    university: 'Trường Đại học Sư phạm Kỹ thuật',
    university_code: 'HCMUTE',
    major: 'Khoa học Máy tính',
    batch: '2026-FALL',
    batch_label: 'Khóa K20 - Kỳ Thu 2026',
    mentor_id: 3,
    mentor_name: 'Trần Hoàng Quân',
    project: 'Automation Testing Lab',
    applied_date: '04/10/2026',

    // Chuyên cần: Nghỉ không phép 2 ngày -> Bôi đỏ kỷ luật
    standard_work_days: 22,
    actual_work_days: 6,
    late_count: 1,
    approved_leave_days: 1,
    unapproved_leave_days: 2,
    attendance_status: 'Vi phạm kỷ luật',
    attendance_rate: 75.0,

    // Phụ cấp & Chi trả (Kỳ 10/2026 chưa kết thúc -> Chờ chi trả)
    base_allowance: 2200000,
    bonus_penalty: -200000,
    total_net: 2000000,
    allowance_status: 'pending',
    allowance_status_label: 'Chờ chi trả',

    // Kết quả học tập
    gpa: 6.5,
    grade: 'Trung bình',
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

