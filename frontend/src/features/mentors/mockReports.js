/**
 * mockReports.js
 * Dữ liệu mock cho tính năng Báo cáo tuần & Phản hồi của Mentor (Task 1).
 * Cấu trúc tương thích 100% với WeeklyReportResponse của Backend (app/schemas/weekly_report.py).
 */

const INITIAL_MOCK_REPORTS = [
  {
    id: 101,
    user_id: 1,
    user_code: 'TTS0001',
    user_name: 'Nguyễn Văn An',
    program_id: 1,
    program_name: 'Thực tập Công nghệ Phần mềm K26',
    week_number: 3,
    start_date: '2026-09-22',
    end_date: '2026-09-28',
    title: 'Báo cáo tuần 3: Xây dựng REST API và kết nối Database MySQL',
    content:
      '- Hoàn thiện API quản lý nhiệm vụ cho module Mentor.\n' +
      '- Viết unit test cho các service với pytest, tỷ lệ coverage đạt 85%.\n' +
      '- Tối ưu các câu query SQLAlchemy tránh lỗi N+1.\n' +
      '- Tham gia review code cùng các thành viên trong nhóm.',
    difficulties:
      'Gặp lỗi race condition khi test đồng thời việc cập nhật trạng thái nhiệm vụ, đã xử lý bằng database transaction rollback.',
    next_week_plan:
      '- Bắt đầu triển khai module upload tài liệu và báo cáo tuần.\n' +
      '- Phối hợp với team Frontend để tích hợp API.',
    status: 'submitted', // Chưa đọc / Chờ duyệt
    created_at: '2026-09-28T16:45:00Z',
    updated_at: '2026-09-28T16:45:00Z',
    feedbacks: [],
  },
  {
    id: 102,
    user_id: 2,
    user_code: 'TTS0002',
    user_name: 'Trần Thị Bình',
    program_id: 1,
    program_name: 'Thực tập Công nghệ Phần mềm K26',
    week_number: 3,
    start_date: '2026-09-22',
    end_date: '2026-09-28',
    title: 'Báo cáo tuần 3: Thiết kế UI Dashboard và tích hợp React Router',
    content:
      '- Thiết kế giao diện Dashboard cho Mentor bằng React và Vanilla CSS.\n' +
      '- Cấu hình phân quyền Route theo role với RequireAuth.\n' +
      '- Tạo component Modal tạo nhiệm vụ mới kèm validation form.\n' +
      '- Kiểm tra độ tương thích trên các kích thước màn hình responsive.',
    difficulties:
      'Cần mentor hướng dẫn thêm về quy chuẩn thiết kế theme dark/light của công ty.',
    next_week_plan:
      '- Hoàn thiện màn hình duyệt báo cáo tuần và chi tiết phản hồi.\n' +
      '- Viết style đồng bộ với design system của nhóm.',
    status: 'submitted', // Chưa đọc / Chờ duyệt
    created_at: '2026-09-28T17:15:20Z',
    updated_at: '2026-09-28T17:15:20Z',
    feedbacks: [],
  },
  {
    id: 103,
    user_id: 3,
    user_code: 'TTS0003',
    user_name: 'Lê Hoàng Long',
    program_id: 2,
    program_name: 'Thực tập Khoa học Dữ liệu K26',
    week_number: 2,
    start_date: '2026-09-15',
    end_date: '2026-09-21',
    title: 'Báo cáo tuần 2: Tiền xử lý dữ liệu và đánh giá mô hình phân loại',
    content:
      '- Thu thập và làm sạch bộ dữ liệu log hệ thống (10.000 bản ghi).\n' +
      '- Thử nghiệm thuật toán Random Forest và XGBoost để dự đoán hiệu suất.\n' +
      '- Vẽ biểu đồ ma trận nhầm lẫn (Confusion Matrix) và ROC curve.',
    difficulties:
      'Bộ dữ liệu ban đầu bị mất cân bằng lớp (class imbalance), đã thử kỹ thuật SMOTE để cân bằng.',
    next_week_plan:
      '- Đóng gói mô hình thành microservice bằng FastAPI.\n' +
      '- Viết tài liệu báo cáo kỹ thuật đợt 1.',
    status: 'reviewed', // Đã phản hồi
    created_at: '2026-09-21T18:00:00Z',
    updated_at: '2026-09-22T09:30:00Z',
    feedbacks: [
      {
        id: 1,
        report_id: 103,
        mentor_id: 99,
        mentor_name: 'Mentor Nguyễn Tiến Dũng',
        score: 9.0,
        comment:
          'Báo cáo chi tiết, phân tích số liệu rất tốt và nắm vững kỹ thuật tiền xử lý. Tuần tới tập trung tối ưu tốc độ inference khi đóng gói API nhé.',
        created_at: '2026-09-22T09:30:00Z',
      },
    ],
  },
  {
    id: 104,
    user_id: 1,
    user_code: 'TTS0001',
    user_name: 'Nguyễn Văn An',
    program_id: 1,
    program_name: 'Thực tập Công nghệ Phần mềm K26',
    week_number: 2,
    start_date: '2026-09-15',
    end_date: '2026-09-21',
    title: 'Báo cáo tuần 2: Thiết kế Database schema và cấu trúc thư mục Monorepo',
    content:
      '- Tạo file migration SQL cho các bảng users, tasks, weekly_reports.\n' +
      '- Thiết lập cấu trúc thư mục monorepo theo chuẩn docs/folder-structure.md.\n' +
      '- Viết seed data phục vụ chạy kiểm thử local.',
    difficulties: 'Không có khó khăn lớn trong tuần này.',
    next_week_plan:
      '- Bắt đầu viết API backend và kết nối SQLAlchemy Session.',
    status: 'reviewed', // Đã phản hồi
    created_at: '2026-09-21T17:10:00Z',
    updated_at: '2026-09-22T10:15:00Z',
    feedbacks: [
      {
        id: 2,
        report_id: 104,
        mentor_id: 99,
        mentor_name: 'Mentor Nguyễn Tiến Dũng',
        score: 8.5,
        comment:
          'Cấu trúc Database chuẩn chỉnh, tuân thủ đúng quy ước nhóm. Cố gắng phát huy ở các tuần tiếp theo.',
        created_at: '2026-09-22T10:15:00Z',
      },
    ],
  },
]

const STORAGE_KEY = 'ictu_mentor_mock_reports_v1'

function getStoredReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // fallback memory
  }
  return INITIAL_MOCK_REPORTS
}

function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
  } catch {
    // ignore storage error
  }
}

/**
 * Lấy danh sách báo cáo tuần (hỗ trợ filter status/keyword)
 */
export function getMockReports({ status = '', search = '' } = {}) {
  const all = getStoredReports()
  return all.filter((item) => {
    if (status && item.status !== status) return false
    if (search) {
      const q = search.toLowerCase()
      const matchName = item.user_name?.toLowerCase().includes(q)
      const matchCode = item.user_code?.toLowerCase().includes(q)
      const matchTitle = item.title?.toLowerCase().includes(q)
      if (!matchName && !matchCode && !matchTitle) return false
    }
    return true
  })
}

/**
 * Lấy chi tiết báo cáo theo ID
 */
export function getMockReportById(id) {
  const numId = Number(id)
  const all = getStoredReports()
  return all.find((item) => item.id === numId) || null
}

/**
 * Thêm phản hồi của mentor (cập nhật trạng thái sang 'reviewed')
 */
export function addMockFeedback(reportId, { score = null, comment = '', mentorName = 'Mentor' }) {
  const numId = Number(reportId)
  const all = getStoredReports()
  const idx = all.findIndex((item) => item.id === numId)
  if (idx === -1) {
    return { ok: false, error: 'Không tìm thấy báo cáo' }
  }

  const report = all[idx]
  const newFeedback = {
    id: Date.now(),
    report_id: numId,
    mentor_id: 99,
    mentor_name: mentorName,
    score: score !== null && score !== '' ? Number(score) : null,
    comment: comment.trim(),
    created_at: new Date().toISOString(),
  }

  const updatedReport = {
    ...report,
    status: 'reviewed',
    updated_at: new Date().toISOString(),
    feedbacks: [...(report.feedbacks || []), newFeedback],
  }

  all[idx] = updatedReport
  saveReports(all)
  return { ok: true, data: updatedReport }
}
