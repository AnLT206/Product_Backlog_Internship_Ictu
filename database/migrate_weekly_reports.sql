-- Migration: Tạo bảng weekly_reports và report_feedbacks (Tasks 8, 9: Báo cáo tuần & Đánh giá của Mentor)

CREATE TABLE IF NOT EXISTS `weekly_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL COMMENT 'ID Thực tập sinh nộp báo cáo',
    `program_id` INT NULL COMMENT 'ID kỳ thực tập',
    `week_number` INT NOT NULL COMMENT 'Số thứ tự tuần (1, 2, 3...)',
    `start_date` DATE NOT NULL COMMENT 'Ngày đầu tuần',
    `end_date` DATE NOT NULL COMMENT 'Ngày cuối tuần',
    `title` VARCHAR(200) NOT NULL COMMENT 'Tiêu đề báo cáo tuần',
    `content` TEXT NOT NULL COMMENT 'Công việc đã thực hiện trong tuần',
    `difficulties` TEXT NULL COMMENT 'Khó khăn gặp phải',
    `next_week_plan` TEXT NULL COMMENT 'Kế hoạch công việc tuần tới',
    `status` VARCHAR(20) NOT NULL DEFAULT 'submitted' COMMENT 'draft, submitted, reviewed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_weekly_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_weekly_reports_program` FOREIGN KEY (`program_id`) REFERENCES `internship_programs` (`id`) ON DELETE SET NULL,
    INDEX `idx_weekly_reports_user` (`user_id`),
    INDEX `idx_weekly_reports_program` (`program_id`),
    INDEX `idx_weekly_reports_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_feedbacks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `report_id` INT NOT NULL COMMENT 'ID báo cáo tuần được phản hồi',
    `mentor_id` INT NOT NULL COMMENT 'ID Mentor đánh giá',
    `score` DECIMAL(3, 1) NULL COMMENT 'Điểm đánh giá thang 10 (0.0 - 10.0)',
    `comment` TEXT NOT NULL COMMENT 'Nội dung nhận xét, góp ý',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_feedbacks_report` FOREIGN KEY (`report_id`) REFERENCES `weekly_reports` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_feedbacks_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uq_report_mentor_feedback` UNIQUE (`report_id`, `mentor_id`),
    INDEX `idx_feedbacks_report` (`report_id`),
    INDEX `idx_feedbacks_mentor` (`mentor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
