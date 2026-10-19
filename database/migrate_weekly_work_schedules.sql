-- Migration: weekly_work_schedules
-- Quản lý lịch làm việc theo phiên của từng tuần cho TTS và Mentor (có quy tắc khóa chỉnh sửa trước 3 ngày)

CREATE TABLE IF NOT EXISTS `weekly_work_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL COMMENT 'ID người dùng được phân công (TTS hoặc Mentor)',
    `role` ENUM('intern', 'mentor') NOT NULL COMMENT 'Vai trò người nhận lịch (intern hoặc mentor)',
    `session_date` DATE NOT NULL COMMENT 'Ngày làm việc cụ thể YYYY-MM-DD',
    `shift_name` VARCHAR(100) NOT NULL COMMENT 'Tên phiên/ca làm việc (Ca sáng, Ca chiều, Ca hành chính...)',
    `start_time` TIME NOT NULL COMMENT 'Giờ bắt đầu phiên làm việc',
    `end_time` TIME NOT NULL COMMENT 'Giờ kết thúc phiên làm việc',
    `location` VARCHAR(255) NULL DEFAULT 'P.302 – Trung tâm Phần mềm & AI ICTU' COMMENT 'Địa điểm làm việc',
    `notes` TEXT NULL COMMENT 'Ghi chú công việc phiên',
    `status` ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled' COMMENT 'Trạng thái phiên làm việc',
    `created_by_id` INT NULL COMMENT 'ID của HR tạo lịch',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_weekly_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_weekly_schedules_date` (`session_date`),
    INDEX `idx_weekly_schedules_user_role` (`user_id`, `role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
