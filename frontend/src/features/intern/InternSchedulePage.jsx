import { useState, useEffect } from 'react'
import './InternDashboardPage.css'
import './InternSchedulePage.css'

// Dữ liệu mẫu Lịch thực tập cá nhân (phân bổ đều cả tháng 10/2026, tối đa 2 ca/ngày, không trùng giờ)
const MOCK_SCHEDULE_EVENTS = [
  // ── TUẦN 0: KHỞI ĐẦU THÁNG ──
  // Ngày 01/10/2026 (Thứ Năm)
  {
    id: 'evt-1001-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-01',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Tìm hiểu quy trình phát triển và môi trường làm việc dự án ICTU.',
    status: 'upcoming',
  },
  {
    id: 'evt-1001-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-01',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Cài đặt môi trường Dev, Docker và kết nối cơ sở dữ liệu nội bộ.',
    status: 'upcoming',
  },

  // Ngày 02/10/2026 (Thứ Sáu - Hôm nay) -> Tối đa 2 ca
  {
    id: 'evt-1002-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-02',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Thiết kế API controller và viết Unit Test cho module quản lý hồ sơ.',
    status: 'today',
  },
  {
    id: 'evt-1002-b',
    title: 'Review 1-1 tiến độ tuần với Mentor',
    date: '2026-10-02',
    time: '13:30 – 16:30',
    type: 'review',
    typeLabel: 'Review 1-1',
    location: 'Phòng họp Tech 1 (hoặc Google Meet)',
    host: 'Mentor',
    description: 'Nghiệm thu checklist subtask Sprint 1, giải đáp vướng mắc và chốt kế hoạch tuần mới.',
    status: 'today',
  },

  // ── TUẦN 1: SPRINT 1 CORE FEATURES ──
  // Ngày 05/10/2026 (Thứ Hai)
  {
    id: 'evt-1005-a',
    title: 'Workshop: Quy chuẩn GitFlow & CI/CD Pipeline',
    date: '2026-10-05',
    time: '09:00 – 11:30',
    type: 'training',
    typeLabel: 'Đào tạo kỹ thuật',
    location: 'Hội trường B – Trung tâm Phần mềm ICTU',
    host: 'Lead Architect Lê Hữu Đạt',
    description: 'Quy chuẩn branching model, commit convention chuẩn conventional commits và pipeline tự động.',
    status: 'upcoming',
  },
  {
    id: 'evt-1005-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-05',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Áp dụng branching GitFlow vào dự án, triển khai tính năng lọc đa tiêu chí.',
    status: 'upcoming',
  },

  // Ngày 06/10/2026 (Thứ Ba)
  {
    id: 'evt-1006-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-06',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Lập trình tối ưu truy vấn MySQL với Index cho danh sách sinh viên thực tập.',
    status: 'upcoming',
  },
  {
    id: 'evt-1006-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-06',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Kiểm thử tải query dữ liệu lớn và rà soát hiệu năng hệ thống.',
    status: 'upcoming',
  },

  // Ngày 07/10/2026 (Thứ Tư)
  {
    id: 'evt-1007-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-07',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Hoàn thiện module xác thực RBAC và kiểm tra phân quyền người dùng.',
    status: 'upcoming',
  },
  {
    id: 'evt-1007-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-07',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Kiểm thử bảo mật CORS, rate limiting và xử lý token JWT hết hạn.',
    status: 'upcoming',
  },

  // Ngày 08/10/2026 (Thứ Năm)
  {
    id: 'evt-1008-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-08',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Kiểm tra kịch bản demo và rà soát toàn bộ chức năng Sprint 1 trước buổi họp.',
    status: 'upcoming',
  },
  {
    id: 'evt-1008-b',
    title: 'Demo Sprint 1 & Lập kế hoạch Sprint 2',
    date: '2026-10-08',
    time: '14:00 – 16:30',
    type: 'review',
    typeLabel: 'Họp Sprint Review',
    location: 'Phòng Hội thảo 201 – Cơ sở 1 ICTU',
    host: 'Ban Cố vấn & Các Mentor',
    description: 'Trình chiếu demo các tính năng đã hoàn thiện trong Sprint 1 và nhận xét đánh giá giữa kỳ.',
    status: 'upcoming',
  },

  // Ngày 09/10/2026 (Thứ Sáu)
  {
    id: 'evt-1009-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-09',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Đóng gói mã nguồn, cập nhật tài liệu API docs và Swagger UI.',
    status: 'upcoming',
  },
  {
    id: 'evt-1009-b',
    title: 'Hạn nộp Báo cáo tổng kết Sprint 1',
    date: '2026-10-09',
    time: '14:00 – 17:00',
    type: 'deadline',
    typeLabel: 'Hạn chót (Deadline)',
    location: 'Hệ thống Portal Thực tập sinh ICTU',
    host: 'Mentor & Hr',
    description: 'Chốt nộp báo cáo tổng kết tiến độ Sprint 1 và hồ sơ đánh giá giữa kỳ.',
    status: 'upcoming',
  },

  // ── TUẦN 2: SPRINT 2 ARCHITECTURE & DOCKER ──
  // Ngày 12/10/2026 (Thứ Hai)
  {
    id: 'evt-1012-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-12',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Khởi động Sprint 2: Phân tích nghiệp vụ module Chấm công trực tuyến.',
    status: 'upcoming',
  },
  {
    id: 'evt-1012-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-12',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Thiết kế lược đồ quan hệ CSDL và entity relationship cho module mới.',
    status: 'upcoming',
  },

  // Ngày 13/10/2026 (Thứ Ba)
  {
    id: 'evt-1013-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-13',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Xây dựng migration schema cơ sở dữ liệu và seed data kiểm thử.',
    status: 'upcoming',
  },
  {
    id: 'evt-1013-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-13',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Viết tầng Service và Repository xử lý logic tính công theo ca làm việc.',
    status: 'upcoming',
  },

  // Ngày 14/10/2026 (Thứ Tư)
  {
    id: 'evt-1014-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-14',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 Trung tâm Phần mềm',
    host: 'Mentor',
    description: 'Nghiên cứu cấu trúc Dockerfile backend FastAPI và frontend React.',
    status: 'upcoming',
  },
  {
    id: 'evt-1014-b',
    title: 'Buổi đào tạo: Docker & Containerization',
    date: '2026-10-14',
    time: '13:30 – 16:00',
    type: 'training',
    typeLabel: 'Đào tạo kỹ thuật',
    location: 'P.302 Trung tâm Phần mềm',
    host: 'DevOps Engineer Vũ Văn Long',
    description: 'Đóng gói ứng dụng vào container và tối ưu multi-stage build giảm dung lượng image.',
    status: 'upcoming',
  },

  // Ngày 15/10/2026 (Thứ Năm)
  {
    id: 'evt-1015-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-15',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 Trung tâm Phần mềm',
    host: 'Mentor',
    description: 'Kiểm thử mạng nội bộ Docker network giữa backend, frontend và MySQL.',
    status: 'upcoming',
  },
  {
    id: 'evt-1015-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-15',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 Trung tâm Phần mềm',
    host: 'Mentor',
    description: 'Tích hợp volume persistence và cấu hình biến môi trường an toàn.',
    status: 'upcoming',
  },

  // Ngày 16/10/2026 (Thứ Sáu)
  {
    id: 'evt-1016-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-16',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 Trung tâm Phần mềm',
    host: 'Mentor',
    description: 'Coding hoàn thiện chức năng điểm danh bằng mã QR và vị trí GPS.',
    status: 'upcoming',
  },
  {
    id: 'evt-1016-b',
    title: 'Họp Retro cải tiến quy trình nhóm',
    date: '2026-10-16',
    time: '14:00 – 16:30',
    type: 'review',
    typeLabel: 'Họp Review',
    location: 'Google Meet',
    host: 'Hr',
    description: 'Đánh giá tiến độ tuần 2, bài học kinh nghiệm và giải pháp cho Sprint 2.',
    status: 'upcoming',
  },

  // ── TUẦN 3: INTEGRATION & ADVANCED FEATURES ──
  // Ngày 19/10/2026 (Thứ Hai)
  {
    id: 'evt-1019-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-19',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Triển khai API xử lý đơn xin nghỉ phép và quy trình duyệt đa cấp.',
    status: 'upcoming',
  },
  {
    id: 'evt-1019-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-19',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Xây dựng giao diện xem lịch sử chấm công và xuất file Excel thống kê.',
    status: 'upcoming',
  },

  // Ngày 20/10/2026 (Thứ Ba)
  {
    id: 'evt-1020-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-20',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Lập trình kết nối dịch vụ gửi email thông báo tự động SMTP/SendGrid.',
    status: 'upcoming',
  },
  {
    id: 'evt-1020-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-20',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Tạo background worker xử lý hàng đợi email và ghi nhận system logs.',
    status: 'upcoming',
  },

  // Ngày 21/10/2026 (Thứ Tư)
  {
    id: 'evt-1021-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-21',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Tối ưu hóa UI Dashboard Thực tập sinh, hiển thị widget tiến độ.',
    status: 'upcoming',
  },
  {
    id: 'evt-1021-b',
    title: 'Buổi đào tạo: Clean Code & Design Patterns',
    date: '2026-10-21',
    time: '13:30 – 16:30',
    type: 'training',
    typeLabel: 'Đào tạo kỹ thuật',
    location: 'Hội trường B – Trung tâm Phần mềm ICTU',
    host: 'Tech Lead Phạm Minh Tuấn',
    description: 'Áp dụng Repository Pattern, Dependency Injection và nguyên lý SOLID.',
    status: 'upcoming',
  },

  // Ngày 22/10/2026 (Thứ Năm)
  {
    id: 'evt-1022-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-22',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Refactor mã nguồn theo kiến trúc Clean Architecture được đào tạo.',
    status: 'upcoming',
  },
  {
    id: 'evt-1022-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-22',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Viết kịch bản kiểm thử End-to-End cho toàn bộ quy trình phê duyệt.',
    status: 'upcoming',
  },

  // Ngày 23/10/2026 (Thứ Sáu)
  {
    id: 'evt-1023-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-23',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Hoàn thiện tài liệu kiến trúc hệ thống và biểu đồ Sequence Diagram.',
    status: 'upcoming',
  },
  {
    id: 'evt-1023-b',
    title: 'Review 1-1 tiến độ giữa kỳ với Mentor',
    date: '2026-10-23',
    time: '14:00 – 16:30',
    type: 'review',
    typeLabel: 'Review 1-1',
    location: 'Phòng họp Tech 1',
    host: 'Mentor',
    description: 'Đánh giá mã nguồn, chấm điểm tiêu chí kỹ thuật và định hướng giai đoạn cuối.',
    status: 'upcoming',
  },

  // ── TUẦN 4: POLISH, TESTING & TỔNG KẾT THÁNG ──
  // Ngày 26/10/2026 (Thứ Hai)
  {
    id: 'evt-1026-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-26',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Khởi động giai đoạn hoàn thiện: Kiểm tra bảo mật theo chuẩn OWASP Top 10.',
    status: 'upcoming',
  },
  {
    id: 'evt-1026-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-26',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Sửa lỗi bảo mật, cấu hình Content Security Policy và cookie HttpOnly.',
    status: 'upcoming',
  },

  // Ngày 27/10/2026 (Thứ Ba)
  {
    id: 'evt-1027-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-27',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Kiểm thử tải hệ thống bằng k6, đánh giá thời gian phản hồi API.',
    status: 'upcoming',
  },
  {
    id: 'evt-1027-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-27',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Tối ưu Redis cache cho các endpoint truy vấn báo cáo thường xuyên.',
    status: 'upcoming',
  },

  // Ngày 28/10/2026 (Thứ Tư)
  {
    id: 'evt-1028-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-28',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Đồng bộ giao diện ứng dụng trên mọi kích thước màn hình responsive.',
    status: 'upcoming',
  },
  {
    id: 'evt-1028-b',
    title: 'Workshop: Tối ưu CSDL & Query Execution',
    date: '2026-10-28',
    time: '13:30 – 16:30',
    type: 'training',
    typeLabel: 'Đào tạo kỹ thuật',
    location: 'Hội trường B – Trung tâm Phần mềm ICTU',
    host: 'Database Administrator Đỗ Viết Thành',
    description: 'Kỹ thuật phân vùng bảng, tối ưu Execution Plan và xử lý Slow Query.',
    status: 'upcoming',
  },

  // Ngày 29/10/2026 (Thứ Năm)
  {
    id: 'evt-1029-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-29',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Tổng duyệt toàn bộ tính năng và đóng gói bản phát hành release v1.0.0.',
    status: 'upcoming',
  },
  {
    id: 'evt-1029-b',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-29',
    time: '13:30 – 17:30',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Viết tài liệu hướng dẫn vận hành, cài đặt và bàn giao sản phẩm.',
    status: 'upcoming',
  },

  // Ngày 30/10/2026 (Thứ Sáu)
  {
    id: 'evt-1030-a',
    title: 'Ca thực tập tiêu chuẩn',
    date: '2026-10-30',
    time: '08:15 – 12:00',
    type: 'shift',
    typeLabel: 'Ca làm việc',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    host: 'Mentor',
    description: 'Hoàn thiện slide thuyết trình và chuẩn bị hồ sơ báo cáo thực tập cuối kỳ.',
    status: 'upcoming',
  },
  {
    id: 'evt-1030-b',
    title: 'Báo cáo nghiệm thu & Tổng kết tháng',
    date: '2026-10-30',
    time: '14:00 – 16:30',
    type: 'review',
    typeLabel: 'Tổng kết nghiệm thu',
    location: 'Hội trường Lớn – Cơ sở 1 ICTU',
    host: 'Hội đồng Cố vấn & Ban Lãnh đạo',
    description: 'Báo cáo kết quả dự án trước Hội đồng Cố vấn và nhận chứng chỉ hoàn thành.',
    status: 'upcoming',
  },
]

// ── HELPER FUNCTIONS (module-level để tránh TDZ khi minify) ──

/** Trả về ngày hôm nay dưới dạng 'YYYY-MM-DD', giả định tháng 10/2026 cho demo */
function getTodayStr() {
  const now = new Date()
  const yr = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const dy = String(now.getDate()).padStart(2, '0')
  const realToday = `${yr}-${mo}-${dy}`
  return realToday.startsWith('2026-10') ? realToday : '2026-10-02'
}

/** Tính số ngày từ hôm nay tới targetDateStr ('YYYY-MM-DD') */
function getDaysDiff(todayStr, targetDateStr) {
  if (!targetDateStr || !todayStr) return null
  const [yr1, mo1, dy1] = todayStr.split('-').map(Number)
  const [yr2, mo2, dy2] = targetDateStr.split('-').map(Number)
  const date1 = new Date(yr1, mo1 - 1, dy1)
  const date2 = new Date(yr2, mo2 - 1, dy2)
  return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
}

// Icon đồng hồ analog kim 5h vẽ theo chuẩn Image 1 (thay thế emoji stopwatch)
function ClockIcon({ size = 14.5, className = 'timeline-clock-icon' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Vành ngoài đôi */}
      <circle cx="12" cy="12" r="10.5" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="9.2" strokeWidth="0.8" opacity="0.85" />

      {/* 12 Vạch số chỉ giờ */}
      <line x1="12" y1="3.9" x2="12" y2="5.7" strokeWidth="1.5" />
      <line x1="16.2" y1="4.7" x2="15.3" y2="6.3" strokeWidth="1.3" />
      <line x1="19.3" y1="7.8" x2="17.7" y2="8.7" strokeWidth="1.3" />
      <line x1="20.1" y1="12" x2="18.3" y2="12" strokeWidth="1.5" />
      <line x1="19.3" y1="16.2" x2="17.7" y2="15.3" strokeWidth="1.3" />
      <line x1="16.2" y1="19.3" x2="15.3" y2="17.7" strokeWidth="1.3" />
      <line x1="12" y1="20.1" x2="12" y2="18.3" strokeWidth="1.5" />
      <line x1="7.8" y1="19.3" x2="8.7" y2="17.7" strokeWidth="1.3" />
      <line x1="4.7" y1="16.2" x2="6.3" y2="15.3" strokeWidth="1.3" />
      <line x1="3.9" y1="12" x2="5.7" y2="12" strokeWidth="1.5" />
      <line x1="4.7" y1="7.8" x2="6.3" y2="8.7" strokeWidth="1.3" />
      <line x1="7.8" y1="4.7" x2="8.7" y2="6.3" strokeWidth="1.3" />

      {/* Kim phút (chỉ thẳng 12h) */}
      <line x1="12" y1="12" x2="12" y2="5.2" strokeWidth="1.7" />

      {/* Kim giờ (chỉ hướng 5h) */}
      <line x1="12" y1="12" x2="14.6" y2="16.5" strokeWidth="2.0" />

      {/* Trục tâm đồng hồ viền tròn khuyên */}
      <circle cx="12" cy="12" r="1.3" strokeWidth="1.2" fill="#ffffff" />
    </svg>
  )
}

export default function InternSchedulePage() {
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  const [selectedFilter, setSelectedFilter] = useState('all') // 'all' | 'shift' | 'review' | 'deadline' | 'training'
  const [showPastInList, setShowPastInList] = useState(false) // Ẩn các sự kiện của ngày đã qua theo mặc định
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detailEvent, setDetailEvent] = useState(null)

  // Giả lập gọi API lấy dữ liệu lịch thực tập từ BE với loading/error state
  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      try {
        setEvents(MOCK_SCHEDULE_EVENTS)
        setIsLoading(false)
      } catch {
        setError('Không thể tải dữ liệu lịch thực tập. Vui lòng thử lại sau.')
        setIsLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [])

  // Lọc và sắp xếp sự kiện theo trình tự thời gian sáng -> chiều -> tối
  const filteredEvents = events
    .filter((e) => {
      if (selectedFilter === 'all') return true
      return e.type === selectedFilter
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.time.localeCompare(b.time)
    })

  // Xác định ngày hôm nay chuẩn hóa (dùng module-level function để tránh TDZ khi minify)
  const todayDateStr = getTodayStr()

  // Wrapper gọi hàm module-level getDaysDiff
  const getDaysDiffFromToday = (targetDateStr) => getDaysDiff(todayDateStr, targetDateStr)

  // Lọc sự kiện cho chế độ danh sách: Ẩn các sự kiện của ngày đã qua theo yêu cầu
  const pastEventsCount = filteredEvents.filter((evt) => {
    const diff = getDaysDiffFromToday(evt.date)
    return diff !== null && diff < 0
  }).length

  const listEvents = showPastInList
    ? filteredEvents
    : filteredEvents.filter((evt) => {
        const diff = getDaysDiffFromToday(evt.date)
        return diff !== null && diff >= 0
      })

  // Định nghĩa ngày trong tháng 10/2026 (1/10/2026 là Thứ 5, 31 ngày)
  // Lịch chuẩn 7 cột: Thứ 2 đến Chủ nhật
  const daysInMonth = 31
  const startDayOfWeek = 3 // 0: Thứ 2, 1: Thứ 3, 2: Thứ 4, 3: Thứ 5 (1/10/2026 là Thứ 5)

  const calendarDays = []
  // Ngày của tháng 9 trước đó (tháng 9 có 30 ngày)
  const prevMonthTotalDays = 30
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDay = prevMonthTotalDays - i
    calendarDays.push({
      dayNumber: prevDay,
      isCurrentMonth: false,
      dateStr: `2026-09-${String(prevDay).padStart(2, '0')}`,
      isWeekend: false,
      isPast: true,
    })
  }

  // 31 ngày trong tháng 10/2026
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `2026-10-${dayStr}`
    const diffDays = getDaysDiffFromToday(dateStr)
    const isToday = dateStr === todayDateStr
    const hasEventsOnDate = events.some((e) => e.date === dateStr)
    const isNearWorkDay = diffDays !== null && diffDays >= 0 && diffDays <= 3 && hasEventsOnDate
    const colIndex = (startDayOfWeek + day - 1) % 7
    const isWeekend = colIndex === 5 || colIndex === 6
    const isPast = diffDays !== null && diffDays < 0

    calendarDays.push({
      dayNumber: day,
      isCurrentMonth: true,
      dateStr: dateStr,
      isToday,
      isNearWorkDay,
      diffDays,
      isWeekend,
      isPast,
    })
  }

  // Ngày đầu tháng 11 để tròn tuần (7 cột)
  const totalSlots = Math.ceil(calendarDays.length / 7) * 7
  let nextMonthDay = 1
  while (calendarDays.length < totalSlots) {
    const colIndex = calendarDays.length % 7
    const isWeekend = colIndex === 5 || colIndex === 6
    calendarDays.push({
      dayNumber: nextMonthDay,
      isCurrentMonth: false,
      dateStr: `2026-11-${String(nextMonthDay).padStart(2, '0')}`,
      isWeekend,
      isPast: false,
    })
    nextMonthDay++
  }

  return (
    <div className="schedule-container">
      {/* ── HEADER TIÊU ĐỀ & CHUYỂN ĐỔI CHẾ ĐỘ XEM ── */}
      <div className="schedule-header">
        <div className="schedule-header-left">
          <h1 className="schedule-title">Lịch thực tập cá nhân</h1>
        </div>

        <div className="schedule-header-right">
          {/* Nút chuyển Calendar / List */}
          <div className="schedule-view-switcher">
            <button
              type="button"
              className={`schedule-switch-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Xem dưới dạng Lịch tháng"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Lịch tháng</span>
            </button>

            <button
              type="button"
              className={`schedule-switch-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Xem dưới dạng Danh sách"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC LOẠI SỰ KIỆN & ĐIỀU HƯỚNG THÁNG ── */}
      <div className="schedule-toolbar">
        {/* Điều hướng tháng */}
        <div className="schedule-month-nav">
          <button type="button" className="schedule-nav-arrow" title="Tháng trước">
            ‹
          </button>
          <span className="schedule-month-text">Tháng 10, 2026</span>
          <button type="button" className="schedule-nav-arrow" title="Tháng sau">
            ›
          </button>
        </div>

        {/* Filter Pills */}
        <div className="schedule-filter-pills">
          <button
            type="button"
            className={`schedule-pill ${selectedFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            Tất cả sự kiện ({events.length})
          </button>
          <button
            type="button"
            className={`schedule-pill pill--shift ${selectedFilter === 'shift' ? 'is-active' : ''}`}
            onClick={() => setSelectedFilter('shift')}
          >
            <span className="pill-dot dot--shift" />
            Ca làm việc
          </button>
          <button
            type="button"
            className={`schedule-pill pill--review ${selectedFilter === 'review' ? 'is-active' : ''}`}
            onClick={() => setSelectedFilter('review')}
          >
            <span className="pill-dot dot--review" />
            Họp & Review 1-1
          </button>
          <button
            type="button"
            className={`schedule-pill pill--deadline ${selectedFilter === 'deadline' ? 'is-active' : ''}`}
            onClick={() => setSelectedFilter('deadline')}
          >
            <span className="pill-dot dot--deadline" />
            Hạn chót Deadline
          </button>
          <button
            type="button"
            className={`schedule-pill pill--training ${selectedFilter === 'training' ? 'is-active' : ''}`}
            onClick={() => setSelectedFilter('training')}
          >
            <span className="pill-dot dot--training" />
            Đào tạo kỹ thuật
          </button>
        </div>
      </div>

      {/* ── XỬ LÝ TRẠNG THÁI LOADING / ERROR ── */}
      {isLoading && (
        <div className="schedule-loading-box">
          <div className="schedule-spinner" />
          <span>Đang tải kế hoạch thực tập từ hệ thống...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="schedule-error-box">
          <p>⚠️ {error}</p>
          <button type="button" onClick={() => window.location.reload()} className="intern-btn intern-btn--primary">
            Tải lại trang
          </button>
        </div>
      )}

      {/* ── CHẾ ĐỘ 1: CALENDAR VIEW ── */}
      {!isLoading && !error && viewMode === 'calendar' && (
        <div className="schedule-calendar-card">
          {/* Thứ trong tuần */}
          <div className="calendar-weekdays-row">
            <span className="weekday-col">
              <span className="weekday-short">T2</span>
              <span className="weekday-full">Thứ Hai</span>
            </span>
            <span className="weekday-col">
              <span className="weekday-short">T3</span>
              <span className="weekday-full">Thứ Ba</span>
            </span>
            <span className="weekday-col">
              <span className="weekday-short">T4</span>
              <span className="weekday-full">Thứ Tư</span>
            </span>
            <span className="weekday-col">
              <span className="weekday-short">T5</span>
              <span className="weekday-full">Thứ Năm</span>
            </span>
            <span className="weekday-col">
              <span className="weekday-short">T6</span>
              <span className="weekday-full">Thứ Sáu</span>
            </span>
            <span className="weekday-col weekday--weekend">
              <span className="weekday-short">T7</span>
              <span className="weekday-full">Thứ Bảy</span>
            </span>
            <span className="weekday-col weekday--weekend">
              <span className="weekday-short">CN</span>
              <span className="weekday-full">Chủ Nhật</span>
            </span>
          </div>

          {/* Lưới ô các ngày */}
          <div className="calendar-days-grid">
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={`empty-${idx}`} className="calendar-day-cell is-empty">
                    <div className="day-cell-top">
                      <span className="day-number">{cell.dayNumber}</span>
                    </div>
                  </div>
                )
              }

              const dayEvents = filteredEvents.filter((e) => e.date === cell.dateStr)
              const isNearUpcoming = cell.isNearWorkDay && !cell.isToday

              return (
                <div
                  key={cell.dateStr}
                  className={`calendar-day-cell ${cell.isToday ? 'is-today' : ''} ${isNearUpcoming ? 'is-near-due' : ''} ${cell.isWeekend ? 'is-weekend' : ''} ${cell.isPast ? 'is-past' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                >
                  <div className="day-cell-top">
                    <span className="day-number">{cell.dayNumber}</span>
                    {isNearUpcoming && (
                      <span className="near-due-badge">
                        {cell.diffDays === 1 ? 'Ngày mai' : `Trong ${cell.diffDays} ngày`}
                      </span>
                    )}
                  </div>

                  <div className="day-events-list">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <button
                        key={evt.id}
                        type="button"
                        className={`day-event-pill pill--${evt.type}`}
                        onClick={() => setDetailEvent(evt)}
                        title={`${evt.time}: ${evt.title}`}
                      >
                        <span className="pill-dot-mini" />
                        <span className="event-time-short">{evt.time.split('–')[0].trim()}</span>
                        <span className="event-title-short">{evt.title}</span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        className="day-more-events-btn"
                        onClick={() => setViewMode('list')}
                        title="Xem danh sách chi tiết"
                      >
                        +{dayEvents.length - 3} sự kiện khác
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CHẾ ĐỘ 2: LIST VIEW (TIMELINE) ── */}
      {!isLoading && !error && viewMode === 'list' && (
        <div className="schedule-list-card">
          {pastEventsCount > 0 && (
            <div className="timeline-past-notice">
              <span className="timeline-past-info">
                {showPastInList
                  ? `Đang hiển thị toàn bộ (${pastEventsCount} ca thực tập đã diễn ra)`
                  : `Đã ẩn ${pastEventsCount} ca thực tập của những ngày đã qua`}
              </span>
              <button
                type="button"
                className="timeline-past-toggle-btn"
                onClick={() => setShowPastInList(!showPastInList)}
              >
                {showPastInList ? 'Ẩn sự kiện đã qua' : `Xem lại lịch sử (${pastEventsCount})`}
              </button>
            </div>
          )}

          {listEvents.length === 0 ? (
            <div className="schedule-empty-state">
              <p>Không có lịch sự kiện sắp tới nào phù hợp với bộ lọc đã chọn.</p>
            </div>
          ) : (
            <div className="schedule-timeline-list">
              {listEvents.map((evt) => {
                const parts = evt.date.split('-')
                const dateVN = `${parts[2]}/${parts[1]}/${parts[0]}`
                const diffDays = getDaysDiffFromToday(evt.date)
                const isToday = diffDays === 0 || evt.status === 'today' || evt.date === todayDateStr
                const isNearDue = diffDays !== null && diffDays > 0 && diffDays <= 3
                const isPast = diffDays !== null && diffDays < 0

                return (
                  <div
                    key={evt.id}
                    className={`timeline-item item--${evt.type} ${isToday ? 'is-today' : ''} ${isNearDue ? 'is-near-due' : ''} ${isPast ? 'is-past' : ''}`}
                    onClick={() => setDetailEvent(evt)}
                  >
                    <div className="timeline-date-col">
                      <span className="timeline-date-bignum">{parts[2]}</span>
                      <span className="timeline-date-sub">Tháng {parts[1]}</span>
                    </div>

                    <div className="timeline-content-col">
                      <div className="timeline-header-row">
                        <span className="timeline-time">
                          <ClockIcon size={14.5} />
                          <span>{evt.time} · Ngày {dateVN}</span>
                        </span>
                        {isToday && <span className="timeline-today-pill">Diễn ra hôm nay</span>}
                        {isNearDue && (
                          <span className="timeline-near-pill">
                            {diffDays === 1 ? 'Diễn ra ngày mai' : `Diễn ra trong ${diffDays} ngày tới`}
                          </span>
                        )}
                      </div>

                      <h3 className="timeline-title">{evt.title}</h3>
                      <p className="timeline-desc">{evt.description}</p>

                      <div className="timeline-meta-row">
                        <span className="timeline-meta-item">
                          📍 <strong>Địa điểm:</strong> {evt.location}
                        </span>
                        <span className="timeline-meta-item">
                          👤 <strong>Chủ trì / Phụ trách:</strong> {evt.host}
                        </span>
                      </div>
                    </div>

                    <div className="timeline-action-col">
                      <button
                        type="button"
                        className="timeline-view-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetailEvent(evt)
                        }}
                      >
                        Chi tiết ➜
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL CHI TIẾT SỰ KIỆN LỊCH THỰC TẬP ── */}
      {detailEvent && (
        <div className="modal-overlay" onClick={() => setDetailEvent(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', width: '100%' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700, color: '#0F172A' }}>
                  Chi tiết kế hoạch thực tập
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDetailEvent(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', marginBottom: '12px' }}>
                {detailEvent.title}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Thời gian:</span>
                  <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>
                    {detailEvent.time}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Ngày diễn ra:</span>
                  <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{detailEvent.date.split('-').reverse().join('/')}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Địa điểm / Kênh:</span>
                  <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>{detailEvent.location}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Người chủ trì / Mentor:</span>
                  <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>{detailEvent.host}</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nội dung & Yêu cầu chuẩn bị:
                </h4>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', margin: 0, backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  {detailEvent.description}
                </p>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="intern-btn intern-btn--primary"
                onClick={() => setDetailEvent(null)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
