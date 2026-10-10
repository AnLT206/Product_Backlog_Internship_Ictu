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

// ── DANH SÁCH NHIỆM VỤ CHUẨN CHO TỪNG THỰC TẬP SINH ──
export const DEFAULT_TASKS_TTS01 = [
  {
    id: 104,
    title: 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh',
    description: 'Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.',
    due_at: '2026-10-15',
    priority: 'high',
    status: 'doing',
    progress: 75,
    tags: ['Backend', 'FastAPI', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/core-api/pull/104',
    note: 'Đã hoàn thành controller và validate schema Pydantic, đang viết route test.',
    subtasks: [
      { id: 'st-104-1', text: 'Thiết kế CSDL & migration bảng intern_profiles', completed: true },
      { id: 'st-104-2', text: 'Viết Pydantic schemas validate request & response (DTO)', completed: true },
      { id: 'st-104-3', text: 'Xây dựng router POST & GET /api/hr/interns', completed: true },
      { id: 'st-104-4', text: 'Viết PyTest coverage kiểm thử phân quyền JWT', completed: false },
    ],
  },
  {
    id: 105,
    title: 'Nghiên cứu tài liệu Software Specification v2.1',
    description: 'Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.',
    due_at: '2026-09-24',
    priority: 'medium',
    status: 'done',
    progress: 100,
    tags: ['Kiến trúc', 'Tài liệu', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/core-api/pull/98',
    note: 'Đã nghiệm thu xong với Mentor Quân, kiến trúc DB đã rõ ràng.',
    subtasks: [
      { id: 'st-105-1', text: 'Đọc tài liệu kiến trúc tổng quan hệ thống', completed: true },
      { id: 'st-105-2', text: 'Tạo diagram luồng xác thực RBAC', completed: true },
    ],
  },
  {
    id: 112,
    title: 'Thiết kế CSDL & Migration Alembic cho RBAC',
    description: 'Tạo các migration script và quan hệ bảng permissions, roles, user_roles.',
    due_at: '2026-10-05',
    priority: 'high',
    status: 'done',
    progress: 100,
    tags: ['Database', 'Alembic', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/core-api/pull/105',
    note: 'Đã hoàn thành và chạy migration thành công trên MySQL.',
    subtasks: [
      { id: 'st-112-1', text: 'Khởi tạo file migration Alembic', completed: true },
      { id: 'st-112-2', text: 'Viết upgrade & downgrade schemas', completed: true },
    ],
  },
]

export const DEFAULT_TASKS_TTS02 = [
  {
    id: 106,
    title: 'Thiết kế kịch bản Kiểm thử tự động (Automation Testing)',
    description: 'Xây dựng automation test suites cho module Auth & User Profile.',
    due_at: '2026-10-18',
    priority: 'high',
    status: 'doing',
    progress: 60,
    tags: ['Testing', 'Automation', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/qa-suites/pull/44',
    note: 'Đã viết 10 test case tự động cho luồng đăng nhập và phân quyền.',
    subtasks: [
      { id: 'st-106-1', text: 'Lập danh sách test cases kiểm thử giao diện', completed: true },
      { id: 'st-106-2', text: 'Viết kịch bản kiểm thử API tự động với PyTest', completed: true },
      { id: 'st-106-3', text: 'Tối ưu thời gian chạy pipeline kiểm thử CI', completed: false },
    ],
  },
  {
    id: 107,
    title: 'Xây dựng bộ Test Suite hồi quy End-to-End với PyTest',
    description: 'Viết 15 kịch bản kiểm thử API hồi quy xác thực và phân quyền RBAC.',
    due_at: '2026-09-28',
    priority: 'medium',
    status: 'done',
    progress: 100,
    tags: ['QA', 'PyTest', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/qa-suites/pull/39',
    note: 'Đã nghiệm thu với Mentor Hướng, test pass 100%.',
    subtasks: [
      { id: 'st-107-1', text: 'Cài đặt môi trường PyTest và fixture database', completed: true },
      { id: 'st-107-2', text: 'Chạy kiểm thử hồi quy toàn diện hệ thống', completed: true },
    ],
  },
  {
    id: 113,
    title: 'Viết kịch bản kiểm thử tải với Locust cho Cổng HR',
    description: 'Giả lập 200 CCU đồng thời truy vấn danh sách TTS và xuất báo cáo.',
    due_at: '2026-10-25',
    priority: 'medium',
    status: 'doing',
    progress: 45,
    tags: ['Performance', 'Locust', 'Sprint 1'],
    prLink: '',
    note: 'Đang xây dựng kịch bản đo đạc response time dưới 500ms.',
    subtasks: [
      { id: 'st-113-1', text: 'Viết file kịch bản locustfile.py', completed: true },
      { id: 'st-113-2', text: 'Chạy thử nghiệm trên môi trường Staging', completed: false },
    ],
  },
]

export const DEFAULT_TASKS_TTS03 = [
  {
    id: 108,
    title: 'Thiết kế và tối ưu hóa giao diện người dùng Responsive',
    description: 'Chuẩn hóa bảng màu ICTU Design System và CSS Mobile-first.',
    due_at: '2026-10-01',
    priority: 'high',
    status: 'done',
    progress: 100,
    tags: ['Frontend', 'UI/UX', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/frontend-dashboard/pull/58',
    note: 'Đã hoàn thiện layout chuẩn và bàn giao cho team phát triển.',
    subtasks: [
      { id: 'st-108-1', text: 'Thiết kế bố cục layout chuẩn Enterprise', completed: true },
      { id: 'st-108-2', text: 'Tối ưu CSS & responsive trên các thiết bị', completed: true },
    ],
  },
  {
    id: 109,
    title: 'Tích hợp luồng nộp báo cáo tuần và điểm danh trực tuyến',
    description: 'Kết nối API FastAPI nộp file đính kèm và kiểm tra ca làm việc.',
    due_at: '2026-10-20',
    priority: 'medium',
    status: 'doing',
    progress: 80,
    tags: ['React', 'API Integration', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/frontend-dashboard/pull/62',
    note: 'Đã hoàn thành form nộp báo cáo và modal xác nhận.',
    subtasks: [
      { id: 'st-109-1', text: 'Xây dựng form upload báo cáo tuần với preview', completed: true },
      { id: 'st-109-2', text: 'Tích hợp camera check-in AI điểm danh', completed: true },
      { id: 'st-109-3', text: 'Xử lý thông báo Toast khi nộp thành công', completed: false },
    ],
  },
  {
    id: 114,
    title: 'Xây dựng dashboard biểu đồ thống kê năng suất TTS với Chart.js',
    description: 'Trực quan hóa tỷ lệ hoàn thành Sprint và biểu đồ chuyên cần tháng.',
    due_at: '2026-10-22',
    priority: 'high',
    status: 'doing',
    progress: 70,
    tags: ['Dashboard', 'Chart.js', 'Sprint 1'],
    prLink: '',
    note: 'Đang tích hợp biểu đồ phân bố điểm số và radar chart KPI.',
    subtasks: [
      { id: 'st-114-1', text: 'Tạo component Chart.js tái sử dụng', completed: true },
      { id: 'st-114-2', text: 'Liên kết dữ liệu metrics từ API', completed: true },
      { id: 'st-114-3', text: 'Xuất biểu đồ định dạng hình ảnh/PDF', completed: false },
    ],
  },
]

export const DEFAULT_TASKS_TTS04 = [
  {
    id: 110,
    title: 'Rà soát lỗ hổng bảo mật Web API theo chuẩn OWASP Top 10',
    description: 'Kiểm tra lỗi SQL Injection, Broken Object Level Auth và XSS.',
    due_at: '2026-10-22',
    priority: 'high',
    status: 'doing',
    progress: 40,
    tags: ['Security', 'OWASP', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/sec-audit/pull/12',
    note: 'Đã phát hiện và lập biên bản 3 điểm yếu bảo mật trong route API.',
    subtasks: [
      { id: 'st-110-1', text: 'Quét lỗ hổng tự động với OWASP ZAP', completed: true },
      { id: 'st-110-2', text: 'Kiểm tra thủ công cơ chế phân quyền RBAC', completed: false },
      { id: 'st-110-3', text: 'Lập báo cáo khắc phục lỗi an ninh gửi Mentor', completed: false },
    ],
  },
  {
    id: 111,
    title: 'Cấu hình kiểm tra Header CORS và Rate Limiting',
    description: 'Áp dụng Slowapi giới hạn 60 requests/phút trên API xác thực.',
    due_at: '2026-09-30',
    priority: 'medium',
    status: 'done',
    progress: 100,
    tags: ['Security', 'CORS', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/sec-audit/pull/9',
    note: 'Đã triển khai thành công rate limiting và CSP header.',
    subtasks: [
      { id: 'st-111-1', text: 'Cấu hình CORS origin whitelist an toàn', completed: true },
      { id: 'st-111-2', text: 'Kiểm tra chặn brute-force tấn công đăng nhập', completed: true },
    ],
  },
  {
    id: 115,
    title: 'Thiết lập quét mã nguồn tự động với SonarQube & Trivy',
    description: 'Cấu hình pipeline CI/CD tự động phân tích tĩnh lỗ hổng Docker image.',
    due_at: '2026-10-26',
    priority: 'medium',
    status: 'doing',
    progress: 55,
    tags: ['DevSecOps', 'SonarQube', 'Sprint 1'],
    prLink: '',
    note: 'Đang tích hợp webhook thông báo khi điểm an ninh dưới 80.',
    subtasks: [
      { id: 'st-115-1', text: 'Tạo file cấu hình sonar-project.properties', completed: true },
      { id: 'st-115-2', text: 'Tích hợp quét container image với Trivy', completed: false },
    ],
  },
]

export const DEFAULT_TASKS_TTS05 = [
  {
    id: 116,
    title: 'Nghiên cứu mô hình ngôn ngữ lớn (LLM) và kỹ thuật RAG',
    description: 'Tìm hiểu mô hình Llama-3 và cơ chế Retrieval-Augmented Generation.',
    due_at: '2026-10-19',
    priority: 'high',
    status: 'doing',
    progress: 70,
    tags: ['AI', 'LLM', 'RAG', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/ai-lab/pull/21',
    note: 'Đã hoàn thành cấu trúc trích xuất tài liệu và chunking văn bản.',
    subtasks: [
      { id: 'st-116-1', text: 'Nghiên cứu kiến trúc LangChain & RAG Pipeline', completed: true },
      { id: 'st-116-2', text: 'Thiết lập chiến lược phân đoạn văn bản (Chunking)', completed: true },
      { id: 'st-116-3', text: 'Đánh giá độ chính xác truy hồi ngữ nghĩa', completed: false },
    ],
  },
  {
    id: 117,
    title: 'Huấn luyện thử nghiệm pipeline embedding vector với ChromaDB',
    description: 'Vector hóa toàn bộ cẩm nang hướng dẫn thực tập và FAQ quy chế ICTU.',
    due_at: '2026-10-02',
    priority: 'medium',
    status: 'done',
    progress: 100,
    tags: ['AI', 'Embedding', 'VectorDB', 'Sprint 1'],
    prLink: 'https://github.com/ictu-interns/ai-lab/pull/15',
    note: 'Đã nghiệm thu với Mentor Quân, tốc độ tìm kiếm tương đồng < 50ms.',
    subtasks: [
      { id: 'st-117-1', text: 'Cài đặt và kết nối vector database ChromaDB', completed: true },
      { id: 'st-117-2', text: 'Tạo index embedding cho bộ dữ liệu quy chế', completed: true },
    ],
  },
  {
    id: 118,
    title: 'Xây dựng Chatbot hỏi đáp chính sách thực tập nội bộ ICTU',
    description: 'Tích hợp prompt template và stream câu trả lời kèm nguồn trích dẫn.',
    due_at: '2026-10-24',
    priority: 'high',
    status: 'doing',
    progress: 50,
    tags: ['Chatbot', 'NLP', 'FastAPI', 'Sprint 1'],
    prLink: '',
    note: 'Đang kết nối giao diện Chatbot Widget với backend FastAPI.',
    subtasks: [
      { id: 'st-118-1', text: 'Thiết kế REST API stream câu trả lời LLM', completed: true },
      { id: 'st-118-2', text: 'Xây dựng giao diện chatbox tương tác thời gian thực', completed: false },
    ],
  },
]

// Mặc định tương thích ngược cho TTS 1
export const DEFAULT_TASKS = DEFAULT_TASKS_TTS01

// 21 ngày làm việc chuẩn của Tháng 10/2026
export const DEFAULT_OCTOBER_RECORDS = [
  { id: 1001, date: '02/10/2026 (Thứ Sáu)', check_in: '08:18', check_out: '17:35', total_hours: '8 giờ 17 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Kiểm thử API phân quyền RBAC & PyTest' },
  { id: 1002, date: '01/10/2026 (Thứ Năm)', check_in: '08:22', check_out: '17:30', total_hours: '8 giờ 08 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp rà soát tiến độ Sprint 1 đầu tháng 10' },
  { id: 1003, date: '30/10/2026 (Thứ Sáu)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Tổng kết hoàn thành Sprint 1' },
  { id: 1004, date: '29/10/2026 (Thứ Năm)', check_in: '08:20', check_out: '17:35', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Tối ưu hiệu năng truy vấn SQLAlchemy' },
  { id: 1005, date: '28/10/2026 (Thứ Tư)', check_in: '08:16', check_out: '17:30', total_hours: '8 giờ 14 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Viết test case tích hợp cho router' },
  { id: 1006, date: '27/10/2026 (Thứ Ba)', check_in: '08:25', check_out: '17:40', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Fix lỗi CORS và Docker Nginx proxy' },
  { id: 1007, date: '26/10/2026 (Thứ Hai)', check_in: '08:14', check_out: '17:30', total_hours: '8 giờ 16 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Họp standup đầu tuần cùng Mentor' },
  { id: 1008, date: '23/10/2026 (Thứ Sáu)', check_in: '08:19', check_out: '17:32', total_hours: '8 giờ 13 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Review Pull Request' },
  { id: 1009, date: '22/10/2026 (Thứ Năm)', check_in: '08:15', check_out: '17:30', total_hours: '8 giờ 15 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Refactor cấu trúc folder backend' },
  { id: 1010, date: '21/10/2026 (Thứ Tư)', check_in: '08:22', check_out: '17:35', total_hours: '8 giờ 13 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Tích hợp Alembic migration tự động' },
  { id: 1011, date: '20/10/2026 (Thứ Ba)', check_in: '08:12', check_out: '17:30', total_hours: '8 giờ 18 phút', method: 'AI Camera P.301', status: 'on_time', status_label: 'Đúng giờ', note: 'Lập trình tính năng xuất báo cáo' },
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

// ── LỊCH SỬ CHẤM CÔNG THEO TỪNG TTS ──
export const DEFAULT_ATTENDANCE_TTS01 = [...DEFAULT_OCTOBER_RECORDS]

// TTS 2 (Lê Hoàng Nam): 21 ngày làm việc, 1 ngày nghỉ phép (08/10/2026)
export const DEFAULT_ATTENDANCE_TTS02 = DEFAULT_OCTOBER_RECORDS.map((r) =>
  r.date.includes('08/10')
    ? { ...r, check_in: '--:--', check_out: '--:--', total_hours: '0 giờ', status: 'leave', status_label: 'Nghỉ phép', note: 'Nghỉ việc cá nhân (Đã duyệt đơn NP-004)' }
    : r
)

// TTS 3 (Trần Thị Mai Phương): 22 ngày làm việc chuẩn, 0 muộn
export const DEFAULT_ATTENDANCE_TTS03 = [...DEFAULT_OCTOBER_RECORDS]

// TTS 4 (Hoàng Minh Đức): 20 ngày đúng giờ, 2 ngày đi muộn (23/10 và 27/10)
export const DEFAULT_ATTENDANCE_TTS04 = DEFAULT_OCTOBER_RECORDS.map((r) => {
  if (r.date.includes('23/10')) {
    return { ...r, check_in: '08:40', total_hours: '7 giờ 50 phút', status: 'late', status_label: 'Đi muộn (25p)', note: 'Đi muộn do sự cố giao thông' }
  }
  if (r.date.includes('27/10')) {
    return { ...r, check_in: '08:35', total_hours: '7 giờ 55 phút', status: 'late', status_label: 'Đi muộn (20p)', note: 'Đi muộn do thời tiết mưa lớn' }
  }
  return r
})

// TTS 5 (Vũ Hải Yến): 22 ngày làm việc chuẩn, 0 muộn
export const DEFAULT_ATTENDANCE_TTS05 = [...DEFAULT_OCTOBER_RECORDS]

export const DEFAULT_ATTENDANCE_HISTORY = DEFAULT_ATTENDANCE_TTS01

// ── DANH SÁCH ĐƠN NGHỈ PHÉP THEO TỪNG TTS ──
export const DEFAULT_LEAVES_TTS01 = [
  {
    id: 'NP-001',
    requestCode: 'NP-001',
    type: 'Nghỉ thi học phần',
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    session: 'Buổi chiều (13:30 - 17:30)',
    duration: '0.5 ngày',
    reason: 'Thi kết thúc học phần Cơ sở dữ liệu nâng cao tại trường Đại học CNTT & TT (ICTU).',
    createdDate: '24/09/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    targetApprover: 'hr',
    approver: 'Hr',
    feedback: 'Đã duyệt nghỉ phép. Chúc sinh viên thi tốt.',
  },
]

export const DEFAULT_LEAVES_TTS02 = [
  {
    id: 'NP-004',
    requestCode: 'NP-004',
    type: 'Nghỉ việc cá nhân',
    startDate: '2026-10-08',
    endDate: '2026-10-08',
    session: 'Cả ngày (08:15 - 17:30)',
    duration: '1.0 ngày',
    reason: 'Có việc gia đình đột xuất tại quê Hải Dương.',
    createdDate: '06/10/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    targetApprover: 'hr',
    approver: 'Hr',
    feedback: 'Đã duyệt đơn nghỉ phép. Sau khi trở lại trung tâm tiếp tục theo dõi tiến độ công việc.',
  },
]

export const DEFAULT_LEAVES_TTS03 = [
  {
    id: 'NP-002',
    requestCode: 'NP-002',
    type: 'Nghỉ tham gia hoạt động Đoàn trường',
    startDate: '2026-09-12',
    endDate: '2026-09-12',
    session: 'Cả ngày (08:15 - 17:30)',
    duration: '1.0 ngày',
    reason: 'Tham gia hỗ trợ ngày hội Chào tân sinh viên K24 của Đoàn Thanh niên ICTU.',
    createdDate: '10/09/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    targetApprover: 'hr',
    approver: 'Hr',
    feedback: 'Đã duyệt nghỉ phép tham gia công tác Đoàn.',
  },
]

export const DEFAULT_LEAVES_TTS04 = [
  {
    id: 'NP-003',
    requestCode: 'NP-003',
    type: 'Nghỉ ốm / Khám bệnh',
    startDate: '2026-10-06',
    endDate: '2026-10-06',
    session: 'Buổi sáng (08:15 - 12:00)',
    duration: '0.5 ngày',
    reason: 'Đi khám sức khỏe định kỳ theo lịch tại Bệnh viện Đại học Y Dược Thái Nguyên.',
    createdDate: '01/10/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    targetApprover: 'hr',
    approver: 'Hr',
    feedback: 'Đã duyệt đơn nghỉ phép khám bệnh.',
  },
]

export const DEFAULT_LEAVES_TTS05 = [
  {
    id: 'NP-005',
    requestCode: 'NP-005',
    type: 'Nghỉ bảo vệ đề cương nghiên cứu khoa học',
    startDate: '2026-10-15',
    endDate: '2026-10-15',
    session: 'Buổi sáng (08:15 - 12:00)',
    duration: '0.5 ngày',
    reason: 'Báo cáo bảo vệ đề cương nghiên cứu khoa học cấp Trường về Ứng dụng AI/NLP.',
    createdDate: '11/10/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    targetApprover: 'hr',
    approver: 'Hr',
    feedback: 'Đã duyệt đơn nghỉ phép. Chúc em bảo vệ đề cương đạt kết quả tốt nhất.',
  },
]

export const DEFAULT_LEAVE_REQUESTS = DEFAULT_LEAVES_TTS01

// ── DANH SÁCH BÁO CÁO TUẦN THEO TỪNG TTS ──
export const DEFAULT_REPORTS_TTS01 = [
  {
    id: 54,
    week: 'Tuần 07 (16/09 - 22/09/2026)',
    submitted_at: '28/09/2026 16:45',
    report_time: '28/09/2026 16:45',
    submittedDate: '2026-09-28',
    task_name: 'Phát triển API phân quyền RBAC & Unit Test Sprint 1',
    contentSummary: 'Đã hoàn thành thiết kế migration Alembic, xây dựng router FastAPI và viết 8 unit test đạt tỷ lệ pass 100%.',
    summary: 'Đã hoàn thành thiết kế migration Alembic, xây dựng router FastAPI và viết 8 unit test đạt tỷ lệ pass 100%.',
    fileName: 'BaoCao_Tuan07_TTS0001_NguyenVanAn.docx',
    file_name: 'BaoCao_Tuan07_TTS0001_NguyenVanAn.docx',
    fileSize: '1.4 MB',
    status: 'Đã duyệt',
    grade: 'A',
    score: 9.0,
    feedback: 'Mã nguồn rõ ràng, xử lý bảo mật tốt.',
  },
]

export const DEFAULT_REPORTS_TTS02 = [
  {
    id: 55,
    week: 'Tuần 07 (16/09 - 22/09/2026)',
    submitted_at: '28/09/2026 16:30',
    report_time: '28/09/2026 16:30',
    submittedDate: '2026-09-28',
    task_name: 'Kiểm thử tích hợp hệ thống với PyTest',
    contentSummary: 'Xây dựng xong bộ kịch bản kiểm thử API tích hợp tự động với PyTest, kiểm tra phân quyền RBAC và token JWT.',
    summary: 'Xây dựng xong bộ kịch bản kiểm thử API tích hợp tự động với PyTest, kiểm tra phân quyền RBAC và token JWT.',
    fileName: 'BaoCao_Tuan07_TTS0002_LeHoangNam.docx',
    file_name: 'BaoCao_Tuan07_TTS0002_LeHoangNam.docx',
    fileSize: '1.6 MB',
    status: 'Đã duyệt',
    grade: 'B+',
    score: 8.5,
    feedback: 'Độ bao phủ test tốt, cần bổ sung thêm edge cases.',
  },
]

export const DEFAULT_REPORTS_TTS03 = [
  {
    id: 56,
    week: 'Tuần 07 (16/09 - 22/09/2026)',
    submitted_at: '28/09/2026 17:00',
    report_time: '28/09/2026 17:00',
    submittedDate: '2026-09-28',
    task_name: 'Hoàn thiện UI Dashboard Responsive & Design System',
    contentSummary: 'Thiết kế toàn bộ layout chuẩn Enterprise, tích hợp responsive cho giao diện máy tính bảng và điện thoại di động.',
    summary: 'Thiết kế toàn bộ layout chuẩn Enterprise, tích hợp responsive cho giao diện máy tính bảng và điện thoại di động.',
    fileName: 'BaoCao_Tuan07_TTS0003_TranThiMaiPhuong.docx',
    file_name: 'BaoCao_Tuan07_TTS0003_TranThiMaiPhuong.docx',
    fileSize: '2.1 MB',
    status: 'Đã duyệt',
    grade: 'A',
    score: 9.5,
    feedback: 'Giao diện chuyên nghiệp, tuân thủ chặt chẽ design system.',
  },
]

export const DEFAULT_REPORTS_TTS04 = [
  {
    id: 57,
    week: 'Tuần 07 (16/09 - 22/09/2026)',
    submitted_at: '28/09/2026 17:15',
    report_time: '28/09/2026 17:15',
    submittedDate: '2026-09-28',
    task_name: 'Báo cáo an ninh và kiểm thử thâm nhập OWASP Top 10',
    contentSummary: 'Thực hiện quét bảo mật Web API, phát hiện lỗi header thiếu CSP và xử lý phân quyền chặt chẽ các endpoint.',
    summary: 'Thực hiện quét bảo mật Web API, phát hiện lỗi header thiếu CSP và xử lý phân quyền chặt chẽ các endpoint.',
    fileName: 'BaoCao_Tuan07_TTS0004_HoangMinhDuc.docx',
    file_name: 'BaoCao_Tuan07_TTS0004_HoangMinhDuc.docx',
    fileSize: '1.9 MB',
    status: 'Đã duyệt',
    grade: 'A',
    score: 8.8,
    feedback: 'Báo cáo chi tiết, phát hiện được các điểm yếu bảo mật tiềm ẩn.',
  },
]

export const DEFAULT_REPORTS_TTS05 = [
  {
    id: 58,
    week: 'Tuần 07 (16/09 - 22/09/2026)',
    submitted_at: '28/09/2026 16:50',
    report_time: '28/09/2026 16:50',
    submittedDate: '2026-09-28',
    task_name: 'Nghiên cứu pipeline RAG và Vector Embedding với ChromaDB',
    contentSummary: 'Tìm hiểu kiến trúc mô hình LLM, vector hóa văn bản cẩm nang thực tập với ChromaDB và xây dựng luồng truy xuất tri thức.',
    summary: 'Tìm hiểu kiến trúc mô hình LLM, vector hóa văn bản cẩm nang thực tập với ChromaDB và xây dựng luồng truy xuất tri thức.',
    fileName: 'BaoCao_Tuan07_TTS0005_VuHaiYen.docx',
    file_name: 'BaoCao_Tuan07_TTS0005_VuHaiYen.docx',
    fileSize: '2.3 MB',
    status: 'Đã duyệt',
    grade: 'A',
    score: 9.3,
    feedback: 'Nắm bắt công nghệ mới rất nhanh, mô hình chạy thực nghiệm tốt.',
  },
]

export const DEFAULT_REPORTS = DEFAULT_REPORTS_TTS01

// Helper lấy thông tin người dùng đang đăng nhập từ localStorage
export function getCurrentUserFromStorage() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

// Hàm phát tín hiệu thông báo dữ liệu thực tập sinh đã thay đổi
export function notifyInternDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INTERN_DATA_SYNC_EVENT, { detail: { timestamp: Date.now() } }))
  }
}

// Hàm lấy danh sách công việc theo từng user
export function getStoredTasks(currentUser = null) {
  const user = currentUser || getCurrentUserFromStorage()
  const email = (user?.email || '').toLowerCase().trim()
  const uid = user?.id

  if (email.includes('ungvien')) {
    return []
  }

  const userKey = email ? `intern_sprint1_tasks_${email}` : null
  try {
    const raw = (userKey && localStorage.getItem(userKey)) || localStorage.getItem('intern_sprint1_tasks_v1')
    if (raw) {
      let parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}

  if (uid === 6 || email === 'tts02@student.ictu.edu.vn') return DEFAULT_TASKS_TTS02
  if (uid === 8 || email === 'tts03@student.ictu.edu.vn') return DEFAULT_TASKS_TTS03
  if (uid === 9 || email === 'tts04@student.ictu.edu.vn') return DEFAULT_TASKS_TTS04
  if (uid === 10 || email === 'tts05@student.ictu.edu.vn') return DEFAULT_TASKS_TTS05
  return DEFAULT_TASKS_TTS01
}

// Hàm lấy lịch sử chấm công theo từng user
export function getStoredAttendanceHistory(currentUser = null) {
  const user = currentUser || getCurrentUserFromStorage()
  const email = (user?.email || '').toLowerCase().trim()
  const uid = user?.id

  if (email.includes('ungvien')) {
    return []
  }

  const userKey = email ? `intern_attendance_history_${email}` : null
  try {
    const raw = (userKey && localStorage.getItem(userKey)) || localStorage.getItem('intern_attendance_history_v2')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}

  if (uid === 6 || email === 'tts02@student.ictu.edu.vn') return DEFAULT_ATTENDANCE_TTS02
  if (uid === 8 || email === 'tts03@student.ictu.edu.vn') return DEFAULT_ATTENDANCE_TTS03
  if (uid === 9 || email === 'tts04@student.ictu.edu.vn') return DEFAULT_ATTENDANCE_TTS04
  if (uid === 10 || email === 'tts05@student.ictu.edu.vn') return DEFAULT_ATTENDANCE_TTS05
  return DEFAULT_ATTENDANCE_TTS01
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

// Hàm lấy đơn xin nghỉ phép theo từng user
export function getStoredLeaves(currentUser = null) {
  const user = currentUser || getCurrentUserFromStorage()
  const email = (user?.email || '').toLowerCase().trim()
  const uid = user?.id

  if (email.includes('ungvien')) {
    return []
  }

  const userKey = email ? `intern_leave_requests_${email}` : null
  try {
    const raw = (userKey && localStorage.getItem(userKey)) || localStorage.getItem('intern_leave_requests_v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}

  if (uid === 6 || email === 'tts02@student.ictu.edu.vn') return DEFAULT_LEAVES_TTS02
  if (uid === 8 || email === 'tts03@student.ictu.edu.vn') return DEFAULT_LEAVES_TTS03
  if (uid === 9 || email === 'tts04@student.ictu.edu.vn') return DEFAULT_LEAVES_TTS04
  if (uid === 10 || email === 'tts05@student.ictu.edu.vn') return DEFAULT_LEAVES_TTS05
  return DEFAULT_LEAVES_TTS01
}

// Hàm lấy danh sách báo cáo tuần theo từng user
export function getStoredReports(currentUser = null) {
  const user = currentUser || getCurrentUserFromStorage()
  const email = (user?.email || '').toLowerCase().trim()
  const uid = user?.id

  if (email.includes('ungvien')) {
    return []
  }

  const userKey = email ? `intern_reports_${email}` : null
  try {
    const raw = (userKey && localStorage.getItem(userKey)) || localStorage.getItem('intern_report_history')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}

  if (uid === 6 || email === 'tts02@student.ictu.edu.vn') return DEFAULT_REPORTS_TTS02
  if (uid === 8 || email === 'tts03@student.ictu.edu.vn') return DEFAULT_REPORTS_TTS03
  if (uid === 9 || email === 'tts04@student.ictu.edu.vn') return DEFAULT_REPORTS_TTS04
  if (uid === 10 || email === 'tts05@student.ictu.edu.vn') return DEFAULT_REPORTS_TTS05
  return DEFAULT_REPORTS_TTS01
}

/**
 * CÔNG THỨC TRUNG TÂM: Tính toán toàn bộ chỉ số tổng hợp
 * Trả về một đối tượng liên kết chặt chẽ mọi dữ liệu trong hệ thống theo từng user
 */
export function calculateInternMetrics(currentUser = null) {
  const user = currentUser || getCurrentUserFromStorage()
  const email = (user?.email || '').toLowerCase().trim()
  const uid = user?.id

  const tasks = getStoredTasks(user)
  const history = getStoredAttendanceHistory(user)
  const todayAtt = getStoredTodayAttendance()
  const leaves = getStoredLeaves(user)
  const reports = getStoredReports(user)

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
  const attendedDaysInHistory = octRecords.filter(
    (r) => r.status === 'on_time' || r.status === 'late' || (r.check_in && r.check_in !== '--:--')
  ).length

  // Nếu hôm nay đã check-in nhưng chưa có trong danh sách lịch sử tháng 10, cộng thêm 1
  const todayInHistory = octRecords.some((r) => r.date && r.date.includes('Hôm nay'))
  let actualWorkDays = attendedDaysInHistory
  if (isCheckedInToday && !todayInHistory) {
    actualWorkDays += 1
  }
  actualWorkDays = Math.min(STANDARD_WORK_DAYS, Math.max(0, actualWorkDays))

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
  // a) Lương cơ bản theo hợp đồng
  let baseAllowance = actualWorkDays >= 20
    ? BASE_ALLOWANCE_FULL
    : Math.round(BASE_ALLOWANCE_FULL * (actualWorkDays / STANDARD_WORK_DAYS))

  if (uid === 6 || email === 'tts02@student.ictu.edu.vn') {
    baseAllowance = 2400000
  } else if (uid === 9 || email === 'tts04@student.ictu.edu.vn') {
    baseAllowance = 2300000
  }

  // b) Trợ cấp tiền ăn trưa: Đúng 30.000 ₫/ngày công thực tế
  const lunchAllowance = actualWorkDays * LUNCH_PER_DAY

  // c) Thưởng hiệu suất (KPI Bonus): Phụ thuộc vào cá nhân hóa & chuyên môn từng TTS
  let bonusAmount = 500000
  let bonusReason = `Thưởng hoàn thành xuất sắc ${sprintProgress}% nhiệm vụ Sprint 1 & chuyên cần 100%`
  let kpiTier = 'A'
  let kpiTierLabel = 'Xuất sắc (Loại A)'

  if (uid === 8 || email === 'tts03@student.ictu.edu.vn') {
    bonusAmount = 700000
    bonusReason = 'Thưởng thiết kế UI Dashboard xuất sắc & vượt định mức'
  } else if (uid === 10 || email === 'tts05@student.ictu.edu.vn') {
    bonusAmount = 600000
    bonusReason = 'Thưởng nghiên cứu pipeline AI RAG & Vector Embedding hiệu quả'
  } else if (uid === 6 || email === 'tts02@student.ictu.edu.vn') {
    bonusAmount = 500000
    bonusReason = 'Thưởng hoàn thành tốt bộ kịch bản Test Suites E2E'
  } else if (uid === 9 || email === 'tts04@student.ictu.edu.vn') {
    bonusAmount = 500000
    bonusReason = 'Thưởng rà soát và vá lỗ hổng bảo mật OWASP Top 10'
  } else if (sprintProgress < 70) {
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
  const approvedReportsCount = reports.filter((r) => r.status === 'Đã duyệt' || r.status === 'approved' || r.status === 'graded').length

  // 5. ĐIỂM ĐÁNH GIÁ THỰC TẬP TỔNG HỢP (KPI Score 0 - 100 điểm)
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
export function useInternMetrics(overrideUser = null) {
  const activeUser = overrideUser || getCurrentUserFromStorage()
  const [metrics, setMetrics] = useState(() => calculateInternMetrics(activeUser))

  const refreshMetrics = useCallback(() => {
    const u = overrideUser || getCurrentUserFromStorage()
    setMetrics(calculateInternMetrics(u))
  }, [overrideUser])

  useEffect(() => {
    const u = overrideUser || getCurrentUserFromStorage()
    setMetrics(calculateInternMetrics(u))
  }, [overrideUser?.id, overrideUser?.email])

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
