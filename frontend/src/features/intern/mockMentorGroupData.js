/**
 * mockMentorGroupData.js
 * Dữ liệu mẫu phục vụ thiết kế khối giao diện "Mentor của tôi" và "Nhóm thực tập" trên Dashboard Thực tập sinh.
 * (Task 1: [FE] UI Design - Được tách biệt module rõ ràng để Task 2 dễ dàng thay thế bằng API call thật)
 */

/**
 * Tạo ký tự viết tắt đại diện từ họ tên (Avatar Initials Fallback)
 */
export function getInitials(fullName) {
  const trimmed = (fullName ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const MOCK_MENTOR = {
  id: 3,
  full_name: 'Trần Hoàng Quân',
  position: 'Senior Fullstack Tech Lead / Chuyên viên Hướng dẫn chính',
  department: 'Trung tâm Phát triển Phần mềm (Software Center)',
  email: 'mentor.quan@ictu.edu.vn',
  phone: '0988 123 456',
  office_location: 'Tòa nhà Công nghệ ICTU, Tầng 4 - Phòng 402',
  avatar_url: null, // Sử dụng fallback Avatar Initials gradient
  status: 'online', // 'online' | 'busy' | 'offline'
  status_text: 'Đang làm việc tại văn phòng',
  experience_years: '8+ năm kinh nghiệm',
  specialties: ['React / Vite', 'FastAPI Microservices', 'CI/CD & DevOps', 'Clean Architecture'],
  working_hours: '08:00 - 17:30 (Thứ 2 - Thứ 6)',
};

export const MOCK_GROUP = {
  id: 'GRP-FE-01',
  code: 'FE-01',
  name: 'Nhóm Frontend React & Design System (FE-01)',
  program_name: 'Kỳ thực tập Doanh nghiệp Hè 2026 (Summer Internship 2026)',
  department_name: 'Trung tâm Phát triển Phần mềm (Software Center)',
  mentor_id: 3,
  mentor_name: 'Trần Hoàng Quân',
  project_title: 'Hệ thống Quản lý Thực tập sinh Doanh nghiệp (Enterprise HR Hub)',
  total_members: 6,
  max_slots: 8,
  created_at: '2026-06-01',
  status: 'active',
  description:
    'Phát triển các module giao diện người dùng theo chuẩn Enterprise Design System, tối ưu trải nghiệm người dùng và tích hợp API RESTful thời gian thực.',
};

export const MOCK_GROUP_MEMBERS = [
  {
    id: 5,
    code: 'TTS0001',
    full_name: 'Nguyễn Văn An',
    role: 'Nhóm trưởng TTS / Frontend Lead',
    is_current_user: true,
    email: 'an.nv@student.ictu.edu.vn',
    phone: '0912 345 678',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Kỹ thuật phần mềm',
    avatar_url: null,
    joined_date: '01/06/2026',
    contribution_score: 95,
  },
  {
    id: 101,
    code: 'TTS0005',
    full_name: 'Nguyễn Đăng Khôi',
    role: 'Thành viên / Frontend Developer',
    is_current_user: false,
    email: 'khoi.nd@student.ictu.edu.vn',
    phone: '0981 123 456',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Kỹ thuật phần mềm',
    avatar_url: null,
    joined_date: '01/06/2026',
    contribution_score: 90,
  },
  {
    id: 102,
    code: 'TTS0006',
    full_name: 'Trần Thảo Ly',
    role: 'Thành viên / UI/UX Specialist',
    is_current_user: false,
    email: 'ly.tt@student.ictu.edu.vn',
    phone: '0982 234 567',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Công nghệ thông tin',
    avatar_url: null,
    joined_date: '03/06/2026',
    contribution_score: 92,
  },
  {
    id: 103,
    code: 'TTS0007',
    full_name: 'Vũ Đức Minh',
    role: 'Thành viên / API & State Engineer',
    is_current_user: false,
    email: 'minh.vd@student.ictu.edu.vn',
    phone: '0983 345 678',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Kỹ thuật máy tính',
    avatar_url: null,
    joined_date: '03/06/2026',
    contribution_score: 88,
  },
  {
    id: 104,
    code: 'TTS0008',
    full_name: 'Hoàng Khánh Linh',
    role: 'Thành viên / Automation Tester',
    is_current_user: false,
    email: 'linh.hk@student.ictu.edu.vn',
    phone: '0984 456 789',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Hệ thống thông tin',
    avatar_url: null,
    joined_date: '05/06/2026',
    contribution_score: 87,
  },
  {
    id: 105,
    code: 'TTS0009',
    full_name: 'Phạm Minh Hoàng',
    role: 'Thành viên / Mobile & Responsive',
    is_current_user: false,
    email: 'hoang.pm@student.ictu.edu.vn',
    phone: '0985 567 890',
    university: 'Trường Đại học Bách Khoa',
    major: 'Khoa học máy tính',
    avatar_url: null,
    joined_date: '05/06/2026',
    contribution_score: 86,
  },
];
