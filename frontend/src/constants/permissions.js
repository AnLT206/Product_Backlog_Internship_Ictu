/**
 * src/constants/permissions.js
 *
 * DỮ LIỆU TĨNH duy nhất — danh sách vai trò và danh sách module/quyền.
 * Đây là nơi DUY NHẤT chứa danh sách cứng. Không lặp lại ở file khác.
 *
 * Nguồn tham chiếu:
 *   - software-specification.md §1.2 (vai trò)
 *   - software-specification.md §14 (ma trận quyền)
 *   - software-specification.md §13 (Module Admin)
 *
 * TODO: Khi backend định nghĩa chính thức các module/quyền, cập nhật
 *       PERMISSION_MODULES bên dưới cho khớp với dữ liệu DB
 *       (cần xác nhận với nhóm/backend).
 */

/* ─────────────────────────────────────────────
   ROLES — 4 vai trò trong hệ thống
   (khớp với roles.name trong DB — spec §1.2)
───────────────────────────────────────────── */

/**
 * Danh sách vai trò trong hệ thống.
 * @type {{ key: string, label: string }[]}
 */
export const ROLES = [
  { key: 'admin',  label: 'Quản trị viên (Admin)' },
  { key: 'hr',     label: 'HR' },
  { key: 'mentor', label: 'Mentor' },
  { key: 'intern', label: 'Thực tập sinh' },
];

/* ─────────────────────────────────────────────
   PERMISSION_MODULES — các module / quyền
   Dựa theo software-specification.md §14 (ma trận quyền)
   TODO: Xác nhận lại key và label với nhóm/backend trước khi kết nối API thật.
───────────────────────────────────────────── */

/**
 * Danh sách module/quyền được quản lý trong ma trận.
 * Mỗi phần tử gồm:
 *   - key   : định danh duy nhất (sẽ là key trong object matrix gửi lên API)
 *   - label : tên hiển thị trên giao diện
 *   - group : nhóm logic để phân nhóm trên UI
 *
 * @type {{ key: string, label: string, group: string }[]}
 */
export const PERMISSION_MODULES = [
  // ── Auth & Account ──
  { key: 'auth_login',       label: 'Đăng nhập',                   group: 'Xác thực' },
  { key: 'auth_register',    label: 'Đăng ký (public)',             group: 'Xác thực' },

  // ── Hồ sơ & Xét duyệt ──
  { key: 'interns_view',     label: 'Xem hồ sơ thực tập sinh',     group: 'Hồ sơ' },
  { key: 'interns_create',   label: 'Thêm / sửa hồ sơ',           group: 'Hồ sơ' },
  { key: 'interns_approve',  label: 'Duyệt / từ chối hồ sơ',      group: 'Hồ sơ' },
  { key: 'documents_review', label: 'Duyệt tài liệu',              group: 'Hồ sơ' },

  // ── Chương trình & Mentor ──
  { key: 'programs_manage',  label: 'Quản lý chương trình',        group: 'Chương trình' },
  { key: 'programs_assign',  label: 'Phân công Mentor/TTS',        group: 'Chương trình' },
  { key: 'schedule_view',    label: 'Xem lịch thực tập',           group: 'Chương trình' },

  // ── Tasks & Báo cáo ──
  { key: 'tasks_manage',     label: 'Giao / quản lý nhiệm vụ',    group: 'Công việc' },
  { key: 'tasks_update',     label: 'Cập nhật tiến độ nhiệm vụ',  group: 'Công việc' },
  { key: 'reports_submit',   label: 'Nộp báo cáo tuần',           group: 'Công việc' },
  { key: 'reports_feedback', label: 'Phản hồi báo cáo',           group: 'Công việc' },
  { key: 'evaluations',      label: 'Đánh giá & tổng hợp',        group: 'Công việc' },

  // ── Chấm công & Nghỉ phép ──
  { key: 'attendance_self',  label: 'Chấm công cá nhân',          group: 'Chấm công' },
  { key: 'attendance_hr',    label: 'Xem báo cáo chấm công',      group: 'Chấm công' },
  { key: 'leave_request',    label: 'Đăng ký nghỉ phép',          group: 'Chấm công' },
  { key: 'leave_approve',    label: 'Duyệt nghỉ phép',            group: 'Chấm công' },

  // ── Phụ cấp & Hỗ trợ ──
  { key: 'allowances',       label: 'Quản lý phụ cấp',            group: 'Quyền lợi' },
  { key: 'support_tickets',  label: 'Yêu cầu / duyệt hỗ trợ',    group: 'Quyền lợi' },

  // ── Thống kê & Xuất báo cáo ──
  { key: 'stats_view',       label: 'Xem thống kê',               group: 'Thống kê' },
  { key: 'stats_export',     label: 'Xuất báo cáo Excel/PDF',     group: 'Thống kê' },

  // ── Quản trị hệ thống (chỉ Admin) ──
  { key: 'admin_users',      label: 'Quản lý người dùng',         group: 'Quản trị' },
  { key: 'admin_roles',      label: 'Phân quyền vai trò',         group: 'Quản trị' },
  { key: 'admin_audit_logs', label: 'Nhật ký hệ thống',           group: 'Quản trị' },
  { key: 'admin_backup',     label: 'Sao lưu dữ liệu',            group: 'Quản trị' },
];

/* ─────────────────────────────────────────────
   DEFAULT_MATRIX — ma trận quyền mặc định
   Dựa theo software-specification.md §14
   TODO: Cần xác nhận lại toàn bộ với nhóm/backend trước khi kết nối API thật.
───────────────────────────────────────────── */

/**
 * Ma trận quyền mặc định.
 * Key ngoài  = role key (từ ROLES)
 * Key trong  = permission key (từ PERMISSION_MODULES)
 * Value      = boolean (true = có quyền)
 *
 * @type {Record<string, Record<string, boolean>>}
 */
export const DEFAULT_MATRIX = {
  admin: {
    auth_login:       true,
    auth_register:    false,
    interns_view:     true,
    interns_create:   true,
    interns_approve:  true,
    documents_review: true,
    programs_manage:  true,
    programs_assign:  true,
    schedule_view:    true,
    tasks_manage:     true,
    tasks_update:     true,
    reports_submit:   false,
    reports_feedback: true,
    evaluations:      true,
    attendance_self:  false,
    attendance_hr:    true,
    leave_request:    false,
    leave_approve:    true,
    allowances:       true,
    support_tickets:  true,
    stats_view:       true,
    stats_export:     true,
    admin_users:      true,
    admin_roles:      true,
    admin_audit_logs: true,
    admin_backup:     true,
  },
  hr: {
    auth_login:       true,
    auth_register:    false,
    interns_view:     true,
    interns_create:   true,
    interns_approve:  true,
    documents_review: true,
    programs_manage:  true,
    programs_assign:  true,
    schedule_view:    true,
    tasks_manage:     false,
    tasks_update:     false,
    reports_submit:   false,
    reports_feedback: false,
    evaluations:      true,
    attendance_self:  false,
    attendance_hr:    true,
    leave_request:    false,
    leave_approve:    true,
    allowances:       true,
    support_tickets:  true,
    stats_view:       true,
    stats_export:     true,
    admin_users:      false,
    admin_roles:      false,
    admin_audit_logs: false,
    admin_backup:     false,
  },
  mentor: {
    auth_login:       true,
    auth_register:    false,
    interns_view:     true,
    interns_create:   false,
    interns_approve:  false,
    documents_review: false,
    programs_manage:  false,
    programs_assign:  false,
    schedule_view:    true,
    tasks_manage:     true,
    tasks_update:     false,
    reports_submit:   false,
    reports_feedback: true,
    evaluations:      true,
    attendance_self:  false,
    attendance_hr:    false,
    leave_request:    false,
    leave_approve:    false,
    allowances:       false,
    support_tickets:  false,
    stats_view:       false,
    stats_export:     false,
    admin_users:      false,
    admin_roles:      false,
    admin_audit_logs: false,
    admin_backup:     false,
  },
  intern: {
    auth_login:       true,
    auth_register:    true,
    interns_view:     true,
    interns_create:   false,
    interns_approve:  false,
    documents_review: false,
    programs_manage:  false,
    programs_assign:  false,
    schedule_view:    true,
    tasks_manage:     false,
    tasks_update:     true,
    reports_submit:   true,
    reports_feedback: false,
    evaluations:      false,
    attendance_self:  true,
    attendance_hr:    false,
    leave_request:    true,
    leave_approve:    false,
    allowances:       true,
    support_tickets:  true,
    stats_view:       false,
    stats_export:     false,
    admin_users:      false,
    admin_roles:      false,
    admin_audit_logs: false,
    admin_backup:     false,
  },
};
