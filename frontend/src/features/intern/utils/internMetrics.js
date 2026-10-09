import { useState, useEffect, useCallback } from 'react'

/**
 * internMetrics.js
 * Hệ thống Tính toán & Đồng bộ Dữ liệu Toàn diện cho Cổng Thực tập sinh (TTS) ICTU
 *
 * Mối quan hệ liên kết dữ liệu giữa các module:
 * 1. Chấm công (Attendance):
 *    - Số ngày công thực tế (actualWorkDays) = số ngày có check-in + ngày nghỉ phép được HR duyệt.
 *    - Đi muộn (lateDays): mỗi lần phạt 50.000 ₫ khấu trừ vào phiếu lương và ảnh hưởng xếp loại KPI.
 *    - Trợ cấp ăn trưa (lunchAllowance) = actualWorkDays * 30.000 ₫/ngày.
 * 2. Nhiệm vụ & Sprint (Tasks):
 *    - Tiến độ Sprint 1 (sprintProgress) = trung bình % hoàn thành các nhiệm vụ.
 *    - Tỷ lệ hoàn thành (doneTasks / totalTasks).
 *    - Thưởng KPI (bonusAmount):
 *      + Nếu sprintProgress >= 85% & lateDays <= 1: Thưởng 500.000 ₫ (Loại A - Xuất sắc).
 *      + Nếu sprintProgress >= 70% & lateDays <= 2: Thưởng 300.000 ₫ (Loại B - Khá/Tốt).
 *      + Nếu sprintProgress < 70%: Thưởng 0 ₫ (Loại C - Trung bình).
 * 3. Nghỉ phép (Leave Requests):
 *    - Chỉ Phòng Nhân sự (HR) có thẩm quyền phê duyệt.
 *    - Nghỉ phép được duyệt (approvedLeaveDays) được tính là ngày nghỉ hợp lệ.
 * 4. Báo cáo định kỳ (Weekly Reports):
 *    - Số lượng báo cáo đã nộp (submittedReportsCount) đóng góp 20% vào điểm đánh giá thực tập.
 * 5. Phiếu lương & Phụ cấp (Allowance & Payslip):
 *    - Lương cơ bản: 2.500.000 ₫ (với >= 20 ngày công chuẩn).
 *    - Trợ cấp ăn trưa: actualWorkDays * 30.000 ₫.
 *    - Thưởng hiệu suất: bonusAmount.
 *    - Khấu trừ vi phạm: lateDays * 50.000 ₫.
 *    - Thực lĩnh tổng cộng: (Lương CB + Ăn trưa + Thưởng KPI) - Khấu trừ.
 */

export const STANDARD_WORK_DAYS = 22
export const BASE_ALLOWANCE_FULL = 2500000
export const LUNCH_PER_DAY = 30000
export const LATE_DEDUCTION_PER_TIME = 50000
export const CURRENT_MONTH = 10
export const CURRENT_YEAR = 2026

export const INTERN_DATA_SYNC_EVENT = 'intern_data_sync_event'

// Helper định dạng tiền tệ VND
export function formatVND(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

// Bảng số tiền viết bằng chữ tiếng Việt chuẩn xác
export function readMoneyInWords(num) {
  if (!num || isNaN(num) || num <= 0) return 'Không đồng chẵn.'
  const units = ['', ' nghìn', ' triệu', ' tỷ']
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

  function readGroup(group, showZero) {
    let h = Math.floor(group / 100)
    let t = Math.floor((group % 100) / 10)
    let o = group % 10
    let str = ''

    if (h > 0 || showZero) {
      str += digits[h] + ' trăm '
    }
    if (t === 0 && o > 0 && (h > 0 || showZero)) {
      str += 'lẻ '
    } else if (t === 1) {
      str += 'mười '
    } else if (t > 1) {
      str += digits[t] + ' mươi '
    }
    if (t > 0 && o === 1 && t !== 1) {
      str += 'mốt'
    } else if (t > 0 && o === 5) {
      str += 'lăm'
    } else if (o > 0) {
      str += digits[o]
    }
    return str.trim()
  }

  let numStr = Math.round(num).toString()
  const groups = []
  while (numStr.length > 0) {
    groups.unshift(parseInt(numStr.slice(-3), 10))
    numStr = numStr.slice(0, -3)
  }

  const parts = []
  for (let i = 0; i < groups.length; i++) {
    const grp = groups[i]
    const unitIdx = groups.length - 1 - i
    if (grp > 0) {
      const showZero = i > 0
      const read = readGroup(grp, showZero)
      if (read) {
        parts.push(read + units[unitIdx])
      }
    }
  }

  const result = parts.join(' ').trim()
  if (!result) return 'Không đồng chẵn.'
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.'
}

// Danh sách nhiệm vụ chuẩn ban đầu
export const DEFAULT_TASKS = [
  {
    id: 100,
    title: 'Thiết kế giao diện',
    description: 'Thiết kế giao diện Dashboard theo chuẩn thiết kế Enterprise và tương thích người dùng.',
    due_at: '2026-09-20',
    priority: 'medium',
    status: 'done',
    progress: 100,
    tags: ['Frontend', 'UI/UX', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/core-api/pull/102',
    note: 'Đã hoàn thành thiết kế giao diện và nghiệm thu.',
    subtasks: [
      { id: 'st-01', text: 'Thiết kế bố cục layout chuẩn Enterprise', completed: true },
      { id: 'st-02', text: 'Tối ưu CSS & responsive trên các thiết bị', completed: true },
    ],
  },
  {
    id: 1,
    title: 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh',
    description: 'Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.',
    due_at: '2026-10-02',
    priority: 'high',
    status: 'doing',
    progress: 75,
    tags: ['Backend', 'FastAPI', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/core-api/pull/102',
    note: 'Đã hoàn thành controller và validate schema Pydantic, đang viết route test.',
    subtasks: [
      { id: 'st-1', text: 'Thiết kế CSDL & migration bảng intern_profiles, intern_contracts', completed: true },
      { id: 'st-2', text: 'Viết Pydantic schemas validate request & response (DTO)', completed: true },
      { id: 'st-3', text: 'Xây dựng router POST /api/hr/interns và GET /api/hr/interns', completed: true },
      { id: 'st-4', text: 'Viết PyTest coverage kiểm thử phân quyền JWT & HTTP status', completed: false },
    ],
  },
  {
    id: 2,
    title: 'Nghiên cứu tài liệu Software Specification v2.1',
    description: 'Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.',
    due_at: '2026-09-24',
    priority: 'medium',
    status: 'done',
    progress: 100,
    tags: ['Kiến trúc', 'Tài liệu', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/core-api/pull/98',
    note: 'Đã nghiệm thu xong với Mentor Bình, kiến trúc DB đã rõ ràng.',
    subtasks: [
      { id: 'st-21', text: 'Đọc tài liệu kiến trúc tổng quan hệ thống', completed: true },
      { id: 'st-22', text: 'Tạo diagram luồng xác thực RBAC', completed: true },
    ],
  },
  {
    id: 3,
    title: 'Viết tài liệu hướng dẫn sử dụng API Swagger',
    description: 'Bổ sung mô tả tóm tắt cho từng endpoint và status code 200, 201, 400, 409.',
    due_at: '2026-10-06',
    priority: 'low',
    status: 'review',
    progress: 50,
    tags: ['OpenAPI', 'Swagger', 'Sprint 1'],
    prLink: '',
    note: 'Đã hoàn thành cấu hình theme Swagger ICTU, đang chờ nghiệm thu tài liệu.',
    subtasks: [
      { id: 'st-31', text: 'Cài đặt Swagger UI theme chuẩn ICTU', completed: true },
      { id: 'st-32', text: 'Viết docstring cho từng route FastAPI', completed: false },
    ],
  },
]

// 21 ngày làm việc chuẩn của Tháng 10/2026 (trước khi tính ngày hôm nay 03/10)
export const DEFAULT_OCTOBER_RECORDS = [
  { id: 1001, date: '02/10/2026 (Thứ Sáu)', check_in: '08:18', check_out: '17:35', total_hours: '8 giờ 17 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Kiểm thử API phân quyền RBAC & PyTest' },
  { id: 1002, date: '01/10/2026 (Thứ Năm)', check_in: '08:22', check_out: '17:30', total_hours: '8 giờ 08 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp rà soát tiến độ Sprint 1 đầu tháng 10' },
  { id: 1003, date: '30/10/2026 (Thứ Sáu)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Tổng kết hoàn thành Sprint 1' },
  { id: 1004, date: '29/10/2026 (Thứ Năm)', check_in: '08:20', check_out: '17:35', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Tối ưu hiệu năng truy vấn SQLAlchemy' },
  { id: 1005, date: '28/10/2026 (Thứ Tư)', check_in: '08:16', check_out: '17:30', total_hours: '8 giờ 14 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Viết test case tích hợp cho router' },
  { id: 1006, date: '27/10/2026 (Thứ Ba)', check_in: '08:25', check_out: '17:40', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Fix lỗi CORS và Docker Nginx proxy' },
  { id: 1007, date: '26/10/2026 (Thứ Hai)', check_in: '08:14', check_out: '17:30', total_hours: '8 giờ 16 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp standup đầu tuần cùng Mentor' },
  { id: 1008, date: '23/10/2026 (Thứ Sáu)', check_in: '08:19', check_out: '17:32', total_hours: '8 giờ 13 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Review Pull Request #102' },
  { id: 1009, date: '22/10/2026 (Thứ Năm)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Refactor cấu trúc folder backend' },
  { id: 1010, date: '21/10/2026 (Thứ Tư)', check_in: '08:22', check_out: '17:35', total_hours: '8 giờ 13 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Tích hợp Alembic migration tự động' },
  { id: 1011, date: '20/10/2026 (Thứ Ba)', check_in: '08:12', check_out: '17:30', total_hours: '8 giờ 18 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Lập trình tính năng xuất báo cáo PDF' },
  { id: 1012, date: '19/10/2026 (Thứ Hai)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp Sprint Review giữa kỳ' },
  { id: 1013, date: '16/10/2026 (Thứ Sáu)', check_in: '08:20', check_out: '17:35', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Nộp báo cáo tuần 8' },
  { id: 1014, date: '15/10/2026 (Thứ Năm)', check_in: '08:18', check_out: '17:30', total_hours: '8 giờ 12 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Nghiên cứu kiến trúc Microservices' },
  { id: 1015, date: '14/10/2026 (Thứ Tư)', check_in: '08:24', check_out: '17:36', total_hours: '8 giờ 12 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Xử lý logic xác thực JWT Refresh Token' },
  { id: 1016, date: '13/10/2026 (Thứ Ba)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Viết tài liệu API Swagger ICTU' },
  { id: 1017, date: '12/10/2026 (Thứ Hai)', check_in: '08:16', check_out: '17:30', total_hours: '8 giờ 14 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp phân công công việc tuần 7' },
  { id: 1018, date: '09/10/2026 (Thứ Sáu)', check_in: '08:18', check_out: '17:32', total_hours: '8 giờ 14 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Hoàn thành Unit Test module Intern' },
  { id: 1019, date: '08/10/2026 (Thứ Năm)', check_in: '08:21', check_out: '17:35', total_hours: '8 giờ 14 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Đồng bộ Schema Pydantic v2' },
  { id: 1020, date: '07/10/2026 (Thứ Tư)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Cấu hình Docker Compose đa môi trường' },
  { id: 1021, date: '06/10/2026 (Thứ Ba)', check_in: '08:20', check_out: '17:30', total_hours: '8 giờ 10 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Tham gia seminar công nghệ FastAPI' },
]

export const DEFAULT_ATTENDANCE_HISTORY = [
  ...DEFAULT_OCTOBER_RECORDS,
  { id: 1, date: '28/09/2026 (Thứ Hai)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Làm việc tại Trung tâm AI & IoT ICTU' },
  { id: 2, date: '25/09/2026 (Thứ Sáu)', check_in: '08:22', check_out: '17:35', total_hours: '8 giờ 13 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp nghiệm thu Sprint 1 tuần 7' },
  { id: 3, date: '24/09/2026 (Thứ Năm)', check_in: '08:28', check_out: '17:30', total_hours: '8 giờ 02 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Lập trình API phân quyền RBAC' },
  { id: 4, date: '23/09/2026 (Thứ Tư)', check_in: '08:50', check_out: '17:40', total_hours: '7 giờ 50 phút', method: 'Vân tay P.302', status: 'late', status_label: 'Đi muộn (20p)', note: 'Có đơn xin phép đến muộn do thời tiết mưa lớn' },
  { id: 5, date: '22/09/2026 (Thứ Ba)', check_in: '08:10', check_out: '17:32', total_hours: '8 giờ 22 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Thiết kế database migration Alembic' },
  { id: 6, date: '21/09/2026 (Thứ Hai)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp khởi động tuần mới cùng Mentor' },
  { id: 7, date: '18/09/2026 (Thứ Sáu)', check_in: '08:18', check_out: '17:35', total_hours: '8 giờ 17 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Nộp báo cáo tuần 06 và review code' },
  { id: 8, date: '17/09/2026 (Thứ Năm)', check_in: '--:--', check_out: '--:--', total_hours: '0 giờ', method: 'Không có', status: 'absent', status_label: 'Không check-in', note: 'Vắng mặt không có dữ liệu check-in tại cổng' },
]

export const DEFAULT_LEAVE_REQUESTS = [
  {
    id: 'NP-001',
    type: 'Nghỉ thi học phần',
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    session: 'Buổi chiều (13:30 - 17:30)',
    duration: '0.5 ngày',
    reason: 'Thi kết thúc học phần Cơ sở dữ liệu nâng cao tại trường Đại học CNTT & TT (ICTU).',
    createdDate: '24/09/2026',
    status: 'approved',
    targetApprover: 'hr',
    approver: 'Hr',
    feedback: 'Đã duyệt nghỉ phép. Chúc sinh viên thi tốt.',
  },
  {
    id: 'NP-002',
    type: 'Nghỉ việc cá nhân',
    startDate: '2026-09-12',
    endDate: '2026-09-12',
    session: 'Cả ngày (08:15 - 17:30)',
    duration: '1.0 ngày',
    reason: 'Có việc gia đình đột xuất tại quê Hải Dương.',
    createdDate: '10/09/2026',
    status: 'approved',
    targetApprover: 'hr',
    approver: 'Hr',
    feedback: 'Đã duyệt đơn nghỉ phép. Sau khi trở lại trung tâm tiếp tục theo dõi tiến độ công việc.',
  },
  {
    id: 'NP-003',
    type: 'Nghỉ ốm / Khám bệnh',
    startDate: '2026-10-06',
    endDate: '2026-10-06',
    session: 'Buổi sáng (08:15 - 12:00)',
    duration: '0.5 ngày',
    reason: 'Đi khám sức khỏe định kỳ theo lịch tại Bệnh viện Đại học Y Dược.',
    createdDate: '01/10/2026',
    status: 'pending',
    targetApprover: 'hr',
    approver: 'Chờ duyệt',
    feedback: 'Đang chuyển đơn tới Phòng Nhân sự (Hr) xem xét & phê duyệt.',
  },
]

export const DEFAULT_REPORTS = [
  {
    id: 1,
    week: 'Tuần 07 (21/09 - 25/09/2026)',
    submitted_at: '28/09/2026 16:45',
    report_time: '28/09/2026 16:45',
    submittedDate: '2026-09-28',
    task_name: 'Phát triển API phân quyền RBAC & Unit Test Sprint 1',
    contentSummary: 'Đã hoàn thành thiết kế migration Alembic, xây dựng router FastAPI và viết 8 unit test đạt tỷ lệ pass 100%.',
    summary: 'Đã hoàn thành thiết kế migration Alembic, xây dựng router FastAPI và viết 8 unit test đạt tỷ lệ pass 100%.',
    fileName: 'BaoCao_Tuan07_TTS0002_DungVT.pdf',
    file_name: 'BaoCao_Tuan07_TTS0002_DungVT.pdf',
    fileSize: '2.4 MB',
    status: 'Đã duyệt',
    grade: 'A',
    score: 9.5,
    feedback: 'Báo cáo chất lượng rất tốt. Code convention rõ ràng, coverage Unit test cao. Tiếp tục phát huy trong Sprint tới.',
  },
  {
    id: 2,
    week: 'Tuần 06 (14/09 - 18/09/2026)',
    submitted_at: '20/09/2026 17:15',
    report_time: '20/09/2026 17:15',
    submittedDate: '2026-09-20',
    task_name: 'Kiểm thử API auth/register & môi trường Docker Compose',
    contentSummary: 'Nghiên cứu tài liệu kiến trúc v2.1, thiết lập môi trường Docker Compose gồm Nginx, FastAPI và MySQL 8.0.',
    summary: 'Nghiên cứu tài liệu kiến trúc v2.1, thiết lập môi trường Docker Compose gồm Nginx, FastAPI và MySQL 8.0.',
    fileName: 'BaoCao_Tuan06_TTS0002_DungVT.pdf',
    file_name: 'BaoCao_Tuan06_TTS0002_DungVT.pdf',
    fileSize: '1.8 MB',
    status: 'Đã duyệt',
    grade: 'A-',
    score: 8.8,
    feedback: 'Tiến độ đúng hạn. Cần chú ý thêm log truy vấn database để tối ưu index cho bảng users.',
  },
]

// Hàm phát tín hiệu thông báo dữ liệu thực tập sinh đã thay đổi
export function notifyInternDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INTERN_DATA_SYNC_EVENT, { detail: { timestamp: Date.now() } }))
  }
}

// Hàm lấy danh sách công việc hiện tại từ localStorage
export function getStoredTasks() {
  try {
    const raw = localStorage.getItem('intern_sprint1_tasks_v1')
    if (raw) {
      let parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasDesign = parsed.some((t) => (t.title || '').toLowerCase().includes('thiết kế giao diện'))
        if (!hasDesign) {
          parsed = [DEFAULT_TASKS[0], ...parsed]
        }
        return parsed
      }
    }
  } catch {}
  return DEFAULT_TASKS
}

// Hàm lấy lịch sử chấm công hiện tại từ localStorage
export function getStoredAttendanceHistory() {
  try {
    const raw = localStorage.getItem('intern_attendance_history_v2')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Kiểm tra xem đã có các bản ghi Tháng 10 chưa
        const hasOct = parsed.some(
          (item) => item.date && (item.date.includes('/10/2026') || item.date.includes('Hôm nay'))
        )
        if (hasOct) {
          return parsed
        }
        // Nếu chỉ có dữ liệu cũ tháng 9, tự động bổ sung danh sách tháng 10 chuẩn
        const merged = [...DEFAULT_OCTOBER_RECORDS, ...parsed]
        try {
          localStorage.setItem('intern_attendance_history_v2', JSON.stringify(merged))
        } catch {}
        return merged
      }
    }
  } catch {}
  return DEFAULT_ATTENDANCE_HISTORY
}

// Hàm lấy trạng thái chấm công hôm nay
export function getStoredTodayAttendance() {
  try {
    const raw = localStorage.getItem('intern_attendance_today_v2')
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {}
  return null
}

// Hàm lấy đơn xin nghỉ phép
export function getStoredLeaves() {
  try {
    const raw = localStorage.getItem('intern_leave_requests_v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_LEAVE_REQUESTS
}

// Hàm lấy danh sách báo cáo tuần
export function getStoredReports() {
  try {
    const raw = localStorage.getItem('intern_report_history')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_REPORTS
}

/**
 * CÔNG THỨC TRUNG TÂM: Tính toán toàn bộ chỉ số tổng hợp
 * Trả về một đối tượng liên kết chặt chẽ mọi dữ liệu trong hệ thống
 */
export function calculateInternMetrics() {
  const tasks = getStoredTasks()
  const history = getStoredAttendanceHistory()
  const todayAtt = getStoredTodayAttendance()
  const leaves = getStoredLeaves()
  const reports = getStoredReports()

  // 1. CHỈ SỐ NHIỆM VỤ & SPRINT 1
  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const tasksCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const sprintProgress = totalTasks > 0
    ? Math.round(tasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0) / totalTasks)
    : 0

  const totalSubtasks = tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0)
  const completedSubtasks = tasks.reduce(
    (sum, t) => sum + (t.subtasks?.filter((st) => st.completed).length || 0),
    0
  )
  const totalTests = Math.max(15, totalSubtasks > 0 ? totalSubtasks * 2 - 1 : 15)
  const passedTests = Math.min(totalTests, 8 + completedSubtasks)
  const testCoverage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

  const tasksWithPR = tasks.filter((t) => Boolean(t.prLink && t.prLink.trim()))
  const mergedPRs = 1 + tasksWithPR.filter((t) => t.status === 'done').length
  const prMergeRate = Math.min(100, Math.round((mergedPRs / (tasksWithPR.length + 1)) * 100))

  // 2. CHỈ SỐ CHẤM CÔNG THÁNG 10/2026
  // Lọc các bản ghi thuộc Tháng 10/2026
  const octRecords = history.filter((item) => {
    if (!item.date) return false
    return item.date.includes('/10/2026') || item.date.includes('Hôm nay')
  })

  // Kiểm tra xem hôm nay đã check-in chưa
  const isCheckedInToday = Boolean(todayAtt?.checkedIn)

  // Đếm số ngày công hợp lệ trong tháng 10
  // Số ngày on_time hoặc late
  const attendedDaysInHistory = octRecords.filter(
    (r) => r.status === 'on_time' || r.status === 'late' || (r.check_in && r.check_in !== '--:--')
  ).length

  // Nếu hôm nay đã check-in nhưng chưa có trong danh sách lịch sử tháng 10, cộng thêm 1
  const todayInHistory = octRecords.some((r) => r.date && r.date.includes('Hôm nay'))
  let actualWorkDays = attendedDaysInHistory
  if (isCheckedInToday && !todayInHistory) {
    actualWorkDays += 1
  }
  // Giới hạn trong khoảng từ 0 đến standardWorkDays (22 ngày chuẩn)
  actualWorkDays = Math.min(STANDARD_WORK_DAYS, Math.max(1, actualWorkDays))

  // Số lần đi muộn trong tháng 10
  const lateDays = octRecords.filter(
    (r) => r.status === 'late' || (r.status_label && (r.status_label.includes('muộn') || r.status_label.includes('trễ')))
  ).length

  // Số ngày nghỉ phép đã được duyệt trong tháng 10
  const approvedLeaveDays = leaves
    .filter((l) => l.status === 'approved' && (l.startDate?.includes('2026-10') || l.createdDate?.includes('/10/2026')))
    .reduce((sum, l) => sum + (parseFloat(l.duration) || 1), 0)

  // Tỷ lệ chuyên cần
  const attendanceRate = Math.min(100, Math.round((actualWorkDays / STANDARD_WORK_DAYS) * 100))

  // 3. TÍNH TOÁN CÁC KHOẢN TIỀN TRONG PHIẾU LƯƠNG & THU NHẬP THÁNG 10/2026
  // a) Lương cơ bản theo hợp đồng (2.500.000 ₫ nếu đủ ngày công hoặc >= 20 ngày)
  const baseAllowance = actualWorkDays >= 20
    ? BASE_ALLOWANCE_FULL
    : Math.round(BASE_ALLOWANCE_FULL * (actualWorkDays / STANDARD_WORK_DAYS))

  // b) Trợ cấp tiền ăn trưa: Đúng 30.000 ₫/ngày công thực tế
  const lunchAllowance = actualWorkDays * LUNCH_PER_DAY

  // c) Thưởng hiệu suất (KPI Bonus): Phụ thuộc chặt chẽ vào tiến độ Sprint & chuyên cần
  let bonusAmount
  let bonusReason
  let kpiTier
  let kpiTierLabel

  if (sprintProgress >= 85 && lateDays <= 1) {
    bonusAmount = 500000
    bonusReason = `Thưởng hoàn thành xuất sắc ${sprintProgress}% nhiệm vụ Sprint 1 & chuyên cần 100%`
    kpiTier = 'A'
    kpiTierLabel = 'Xuất sắc (Loại A)'
  } else if (sprintProgress >= 70 && lateDays <= 2) {
    bonusAmount = 300000
    bonusReason = `Thưởng hoàn thành ${sprintProgress}% nhiệm vụ Sprint 1`
    kpiTier = 'B'
    kpiTierLabel = 'Khá / Tốt (Loại B)'
  } else {
    bonusAmount = 0
    bonusReason = `Chưa đạt định mức thưởng KPI kỳ này (Tiến độ Sprint: ${sprintProgress}%)`
    kpiTier = 'C'
    kpiTierLabel = 'Trung bình (Loại C)'
  }

  // d) Khấu trừ vi phạm: Đi muộn 50.000 ₫/lần
  const deductionAmount = lateDays * LATE_DEDUCTION_PER_TIME
  const deductionReason = lateDays > 0 ? `Khấu trừ vi phạm đi muộn ${lateDays} lần (50.000 ₫/lần)` : ''

  // e) Thực lĩnh phụ cấp tháng 10: (Lương CB + Ăn trưa + Thưởng KPI) - Khấu trừ
  const netTotal = Math.max(0, (baseAllowance + lunchAllowance + bonusAmount) - deductionAmount)

  // 4. CHỈ SỐ BÁO CÁO ĐỊNH KỲ
  const submittedReportsCount = reports.length
  const approvedReportsCount = reports.filter((r) => r.status === 'Đã duyệt' || r.status === 'approved').length

  // 5. ĐIỂM ĐÁNH GIÁ THỰC TẬP TỔNG HỢP (KPI Score 0 - 100 điểm)
  // Trọng số: Sprint tasks (50%), Chuyên cần (30%), Báo cáo tuần (20%)
  const sprintPts = (sprintProgress / 100) * 50
  const attendancePts = (actualWorkDays / STANDARD_WORK_DAYS) * 30 - (lateDays * 2)
  const reportPts = Math.min(20, (submittedReportsCount / 2) * 20)
  const kpiScore = Math.min(100, Math.max(0, Math.round(sprintPts + attendancePts + reportPts)))

  let kpiGrade
  let kpiGradeLabel
  if (kpiScore >= 85) {
    kpiGrade = 'A'
    kpiGradeLabel = 'Xuất sắc'
  } else if (kpiScore >= 70) {
    kpiGrade = 'B'
    kpiGradeLabel = 'Khá / Tốt'
  } else if (kpiScore >= 50) {
    kpiGrade = 'C'
    kpiGradeLabel = 'Đạt yêu cầu'
  } else {
    kpiGrade = 'D'
    kpiGradeLabel = 'Cần cải thiện'
  }

  return {
    // Sprint & Tasks
    totalTasks,
    doneTasks,
    tasksCompletionRate,
    sprintProgress,
    totalSubtasks,
    completedSubtasks,
    totalTests,
    passedTests,
    testCoverage,
    mergedPRs,
    prMergeRate,

    // Chấm công
    currentMonth: CURRENT_MONTH,
    currentYear: CURRENT_YEAR,
    standardWorkDays: STANDARD_WORK_DAYS,
    actualWorkDays,
    lateDays,
    approvedLeaveDays,
    attendanceRate,
    isCheckedInToday,

    // Phụ cấp & Phiếu lương
    baseAllowance,
    lunchAllowance,
    bonusAmount,
    bonusReason,
    deductionAmount,
    deductionReason,
    netTotal,
    netTotalInWords: readMoneyInWords(netTotal),

    // Báo cáo & Đánh giá tổng hợp
    submittedReportsCount,
    approvedReportsCount,
    kpiScore,
    kpiGrade,
    kpiGradeLabel,
    kpiTier,
    kpiTierLabel,
  }
}

// React Hook dùng chung cho tất cả các trang TTS để đồng bộ số liệu thời gian thực
export function useInternMetrics() {
  const [metrics, setMetrics] = useState(() => calculateInternMetrics())

  const refreshMetrics = useCallback(() => {
    setMetrics(calculateInternMetrics())
  }, [])

  useEffect(() => {
    const handleUpdate = () => {
      refreshMetrics()
    }

    window.addEventListener(INTERN_DATA_SYNC_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(INTERN_DATA_SYNC_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [refreshMetrics])

  return { metrics, refreshMetrics }
}
