CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `cccd` VARCHAR(12) NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `role_id` INT NOT NULL,
    `status` ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_full_name` (`full_name`),
    CONSTRAINT `fk_users_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `department_id` INT NULL,
    `phone_number` VARCHAR(20) NULL,
    `dob` DATE NULL,
    `position` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_user_profiles_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_user_profiles_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `intern_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `phone_number` VARCHAR(20) NULL,
    `dob` DATE NULL,
    `gender` ENUM('male', 'female', 'other') DEFAULT 'other',
    `university` VARCHAR(150) NULL,
    `major` VARCHAR(150) NULL,
    `academic_year` VARCHAR(50) NULL,
    `gpa` DECIMAL(3, 2) NULL,
    `address` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_intern_profiles_university` (`university`),
    INDEX `idx_intern_profiles_major` (`major`),
    CONSTRAINT `fk_intern_profiles_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `doc_type` ENUM('cv', 'application', 'contract', 'other') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `review_note` VARCHAR(255) NULL,
    `confirmed_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_documents_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(1000) NOT NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notifications_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `role` VARCHAR(50) NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `resource` VARCHAR(100) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `status_code` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_system_logs_user_id` (`user_id`),
    INDEX `idx_system_logs_action` (`action`),
    INDEX `idx_system_logs_created_at` (`created_at`),
    CONSTRAINT `fk_system_logs_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`name`, `description`) VALUES
    ('intern', 'Thực tập sinh (TTS) — đăng ký công khai qua /api/auth/register'),
    ('hr', 'Nhân sự — tài khoản nội bộ, không đăng ký công khai'),
    ('mentor', 'Mentor hướng dẫn — tài khoản nội bộ, không đăng ký công khai'),
    ('admin', 'Quản trị hệ thống — tài khoản nội bộ, không đăng ký công khai')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

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


CREATE TABLE IF NOT EXISTS `internship_programs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL UNIQUE,
    `department` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `max_interns` INT NOT NULL DEFAULT 50,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `program_id` INT NOT NULL,
    `intern_user_id` INT NOT NULL,
    `mentor_user_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_program_intern` (`program_id`, `intern_user_id`),
    CONSTRAINT `fk_pm_program` FOREIGN KEY (`program_id`) REFERENCES `internship_programs` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pm_intern` FOREIGN KEY (`intern_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pm_mentor` FOREIGN KEY (`mentor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `trg_check_max_interns_before_insert`;
DELIMITER //
CREATE TRIGGER `trg_check_max_interns_before_insert`
BEFORE INSERT ON `program_members`
FOR EACH ROW
BEGIN
    DECLARE current_count INT;
    DECLARE max_allowed INT;
    DECLARE prog_status VARCHAR(20);
    DECLARE prog_deleted TINYINT(1);

    SELECT `max_interns`, `status`, `is_deleted`
    INTO max_allowed, prog_status, prog_deleted
    FROM `internship_programs`
    WHERE `id` = NEW.program_id;

    IF prog_deleted = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Kỳ thực tập không tồn tại hoặc đã bị xóa.';
    END IF;

    IF prog_status = 'closed' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Kỳ thực tập đã đóng, không thể tiếp nhận thêm thực tập sinh.';
    END IF;

    SELECT COUNT(*) INTO current_count
    FROM `program_members`
    WHERE `program_id` = NEW.program_id;

    IF current_count >= max_allowed THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Số lượng thực tập sinh đã đạt mức tối đa của kỳ thực tập.';
    END IF;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_check_and_assign_intern`;
DELIMITER //
CREATE PROCEDURE `sp_check_and_assign_intern`(
    IN p_program_id INT,
    IN p_intern_id INT,
    IN p_mentor_id INT
)
BEGIN
    INSERT INTO `program_members` (`program_id`, `intern_user_id`, `mentor_user_id`)
    VALUES (p_program_id, p_intern_id, p_mentor_id);
END//
DELIMITER ;

CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mentor_id` INT NOT NULL,
    `intern_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('todo', 'doing', 'done', 'canceled') NOT NULL DEFAULT 'todo',
    `progress` INT NOT NULL DEFAULT 0,
    `due_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_task_progress` CHECK (`progress` >= 0 AND `progress` <= 100),
    CONSTRAINT `fk_tasks_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tasks_intern` FOREIGN KEY (`intern_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_tasks_mentor_id` (`mentor_id`),
    INDEX `idx_tasks_intern_id` (`intern_id`),
    INDEX `idx_tasks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `work_date` DATE NOT NULL,
    `check_in_at` DATETIME NOT NULL,
    `check_out_at` DATETIME NULL,
    `total_hours` DECIMAL(4, 2) NULL,
    `status` ENUM('present', 'late', 'half_day', 'absent', 'early_leave') NOT NULL DEFAULT 'present',
    `note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_user_work_date` (`user_id`, `work_date`),
    CONSTRAINT `fk_attendance_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_attendance_user_id` (`user_id`),
    INDEX `idx_attendance_work_date` (`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL COMMENT 'ID của Thực tập sinh gửi yêu cầu',
    `title` VARCHAR(200) NOT NULL COMMENT 'Tiêu đề yêu cầu hỗ trợ',
    `content` TEXT NOT NULL COMMENT 'Nội dung chi tiết yêu cầu',
    `category` VARCHAR(50) NOT NULL DEFAULT 'other' COMMENT 'Phân loại: technical, procedure, workspace, mentor, other',
    `document_type` VARCHAR(50) NULL COMMENT 'Loại giấy tờ xin cấp: internship_confirmation, completion_certificate, other (NULL nếu không xin giấy tờ)',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'medium' COMMENT 'Mức độ ưu tiên: low, medium, high, urgent',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái: pending, in_progress, resolved, rejected',
    `response_note` TEXT NULL COMMENT 'Ghi chú phản hồi từ HR/Admin',
    `responder_id` INT NULL COMMENT 'ID của HR/Admin xử lý yêu cầu',
    `resolved_at` TIMESTAMP NULL COMMENT 'Thời điểm xử lý xong yêu cầu',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_support_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_support_requests_responder` FOREIGN KEY (`responder_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_support_requests_user` (`user_id`),
    INDEX `idx_support_requests_status` (`status`),
    INDEX `idx_support_requests_category` (`category`),
    INDEX `idx_support_requests_document_type` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `allowance_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `intern_id` INT NOT NULL,
    `period` CHAR(7) NOT NULL,
    `allowance_type` VARCHAR(30) NOT NULL DEFAULT 'other',
    `amount` DECIMAL(12, 2) NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_allowance_history_amount` CHECK (`amount` >= 0),
    CONSTRAINT `fk_allowance_history_intern` FOREIGN KEY (`intern_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_allowance_history_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_allowance_history_intern_period` (`intern_id`, `period`),
    INDEX `idx_allowance_history_period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `location` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_schedules_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leave_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, approved, rejected',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_leave_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_leave_requests_user_id` (`user_id`),
    INDEX `idx_leave_requests_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evaluations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `intern_id` INT NOT NULL,
    `mentor_id` INT NOT NULL,
    `skill_score` INT NOT NULL,
    `attitude_score` INT NOT NULL,
    `comment` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_evaluations_intern` FOREIGN KEY (`intern_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_evaluations_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uq_evaluation_mentor_intern` UNIQUE (`mentor_id`, `intern_id`),
    INDEX `idx_evaluations_intern` (`intern_id`),
    INDEX `idx_evaluations_mentor` (`mentor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `work_shifts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `program_id` INT NULL COMMENT 'Gắn với đợt/kỳ thực tập (tùy chọn)',
    `group_name` VARCHAR(100) NOT NULL COMMENT 'Tên nhóm thực tập hoặc tên ca',
    `shift_type` ENUM('morning', 'afternoon', 'full_time', 'flexible') NOT NULL DEFAULT 'flexible',
    `start_time` TIME NOT NULL COMMENT 'Giờ vào (VD: 08:00:00)',
    `end_time` TIME NOT NULL COMMENT 'Giờ ra (VD: 17:30:00)',
    `days_of_week` VARCHAR(50) NOT NULL DEFAULT '2,3,4,5,6' COMMENT 'Các thứ trong tuần làm việc (2,3,4,5,6)',
    `flexible_minutes` INT NOT NULL DEFAULT 15 COMMENT 'Biên độ linh hoạt (phút)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_work_shifts_program` FOREIGN KEY (`program_id`) REFERENCES `internship_programs` (`id`) ON DELETE SET NULL,
    INDEX `idx_work_shifts_program_id` (`program_id`),
    INDEX `idx_work_shifts_group_name` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `allowances` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `intern_id` INT NOT NULL COMMENT 'ID của thực tập sinh (users)',
    `period` CHAR(7) NOT NULL COMMENT 'Kỳ tính công dạng YYYY-MM (VD: 2026-10)',
    `base_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Mức phụ cấp tiêu chuẩn',
    `actual_work_days` DECIMAL(4, 1) NOT NULL DEFAULT 0.0 COMMENT 'Số ngày công thực tế',
    `bonus` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Thưởng',
    `deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Khấu trừ / phạt',
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tổng thực nhận',
    `payment_status` ENUM('unpaid', 'paid', 'cancelled') NOT NULL DEFAULT 'unpaid',
    `payment_date` DATE NULL COMMENT 'Ngày chi trả',
    `note` VARCHAR(255) NULL,
    `created_by` INT NULL COMMENT 'ID HR/Admin lập phụ cấp',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_allowance_base_amount` CHECK (`base_amount` >= 0),
    CONSTRAINT `chk_allowance_actual_work_days` CHECK (`actual_work_days` >= 0),
    CONSTRAINT `chk_allowance_total_amount` CHECK (`total_amount` >= 0),
    CONSTRAINT `fk_allowances_intern` FOREIGN KEY (`intern_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_allowances_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    UNIQUE KEY `uq_intern_allowance_period` (`intern_id`, `period`),
    INDEX `idx_allowances_intern_period` (`intern_id`, `period`),
    INDEX `idx_allowances_period` (`period`),
    INDEX `idx_allowances_payment_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meetings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL COMMENT 'Tiêu đề cuộc họp',
    `description` TEXT NULL COMMENT 'Nội dung chi tiết',
    `start_time` DATETIME NOT NULL COMMENT 'Thời gian bắt đầu',
    `end_time` DATETIME NOT NULL COMMENT 'Thời gian kết thúc',
    `meeting_link` VARCHAR(500) NULL COMMENT 'Phòng họp hoặc Link Google Meet/Zoom',
    `host_id` INT NOT NULL COMMENT 'ID người tạo họp (HR hoặc Mentor)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_meetings_host` FOREIGN KEY (`host_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_meetings_host_id` (`host_id`),
    INDEX `idx_meetings_start_time` (`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meeting_attendees` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `meeting_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `is_notified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Đã gửi thông báo email thành công hay chưa',
    `notified_at` DATETIME NULL COMMENT 'Thời điểm gửi email',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_meeting_attendee` (`meeting_id`, `user_id`),
    CONSTRAINT `fk_ma_meeting` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ma_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_ma_meeting_id` (`meeting_id`),
    INDEX `idx_ma_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
