-- Migration: SCRUM-19, SCRUM-20
-- Bảng permissions và role_permissions phục vụ phân quyền động

CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `label` VARCHAR(150) NOT NULL,
    `group_name` VARCHAR(50) NOT NULL DEFAULT 'Chung',
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_role_permission` (`role_id`, `permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed danh sách 26 quyền hệ thống (khớp với software-specification.md §14)
INSERT INTO `permissions` (`name`, `label`, `group_name`) VALUES
    ('auth_login', 'Đăng nhập', 'Xác thực'),
    ('auth_register', 'Đăng ký (public)', 'Xác thực'),
    ('interns_view', 'Xem hồ sơ thực tập sinh', 'Hồ sơ'),
    ('interns_create', 'Thêm / sửa hồ sơ', 'Hồ sơ'),
    ('interns_approve', 'Duyệt / từ chối hồ sơ', 'Hồ sơ'),
    ('documents_review', 'Duyệt tài liệu', 'Hồ sơ'),
    ('programs_manage', 'Quản lý chương trình', 'Chương trình'),
    ('programs_assign', 'Phân công Mentor/TTS', 'Chương trình'),
    ('schedule_view', 'Xem lịch thực tập', 'Chương trình'),
    ('tasks_manage', 'Giao / quản lý nhiệm vụ', 'Công việc'),
    ('tasks_update', 'Cập nhật tiến độ nhiệm vụ', 'Công việc'),
    ('reports_submit', 'Nộp báo cáo tuần', 'Công việc'),
    ('reports_feedback', 'Phản hồi báo cáo', 'Công việc'),
    ('evaluations', 'Đánh giá & tổng hợp', 'Công việc'),
    ('attendance_self', 'Chấm công cá nhân', 'Chấm công'),
    ('attendance_hr', 'Xem báo cáo chấm công', 'Chấm công'),
    ('leave_request', 'Đăng ký nghỉ phép', 'Chấm công'),
    ('leave_approve', 'Duyệt nghỉ phép', 'Chấm công'),
    ('allowances', 'Quản lý phụ cấp', 'Quyền lợi'),
    ('support_tickets', 'Yêu cầu / duyệt hỗ trợ', 'Quyền lợi'),
    ('stats_view', 'Xem thống kê', 'Thống kê'),
    ('stats_export', 'Xuất báo cáo Excel/PDF', 'Thống kê'),
    ('admin_users', 'Quản lý người dùng', 'Quản trị'),
    ('admin_roles', 'Phân quyền vai trò', 'Quản trị'),
    ('admin_audit_logs', 'Nhật ký hệ thống', 'Quản trị'),
    ('admin_backup', 'Sao lưu dữ liệu', 'Quản trị')
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `group_name` = VALUES(`group_name`);

-- Seed phân quyền mặc định cho các role (admin, hr, mentor, intern)
-- 1. Admin: Toàn quyền quản trị và nghiệp vụ
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p
WHERE r.name = 'admin' AND p.name IN (
    'auth_login', 'interns_view', 'interns_create', 'interns_approve', 'documents_review',
    'programs_manage', 'programs_assign', 'schedule_view', 'tasks_manage', 'tasks_update',
    'reports_feedback', 'evaluations', 'attendance_hr', 'leave_approve', 'allowances',
    'support_tickets', 'stats_view', 'stats_export', 'admin_users', 'admin_roles',
    'admin_audit_logs', 'admin_backup'
);

-- 2. HR: Quản lý hồ sơ, tài liệu, chương trình, thống kê
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p
WHERE r.name = 'hr' AND p.name IN (
    'auth_login', 'interns_view', 'interns_create', 'interns_approve', 'documents_review',
    'programs_manage', 'programs_assign', 'schedule_view', 'evaluations', 'attendance_hr',
    'leave_approve', 'allowances', 'support_tickets', 'stats_view', 'stats_export'
);

-- 3. Mentor: Quản lý task, phản hồi báo cáo, đánh giá
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p
WHERE r.name = 'mentor' AND p.name IN (
    'auth_login', 'interns_view', 'schedule_view', 'tasks_manage', 'tasks_update',
    'reports_feedback', 'evaluations', 'support_tickets'
);

-- 4. Intern: Đăng ký, xem lịch, nộp báo cáo, chấm công cá nhân
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p
WHERE r.name = 'intern' AND p.name IN (
    'auth_login', 'auth_register', 'schedule_view', 'tasks_update', 'reports_submit',
    'attendance_self', 'leave_request', 'support_tickets'
);
