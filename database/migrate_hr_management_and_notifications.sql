-- Migration for HR Management & Notifications features (SCRUM-172, SCRUM-174, SCRUM-178, SCRUM-179)
-- 1. Bảng cấu hình ca làm việc linh hoạt cho nhóm thực tập (SCRUM-172)
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

-- 2. Bảng quản lý phụ cấp chi tiết của thực tập sinh (SCRUM-174)
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

-- 3. Bảng quản lý lịch họp và gửi email tự động (SCRUM-179)
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
