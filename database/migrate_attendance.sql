-- Migration: Tạo bảng attendance lưu trữ chấm công check-in/check-out (Tasks 3, 4)

CREATE TABLE IF NOT EXISTS `attendance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `work_date` DATE NOT NULL,
    `check_in_at` DATETIME NOT NULL,
    `check_out_at` DATETIME NULL,
    `total_hours` DECIMAL(4, 2) NULL,
    `status` ENUM('present', 'late', 'half_day', 'absent') NOT NULL DEFAULT 'present',
    `note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_user_work_date` (`user_id`, `work_date`),
    CONSTRAINT `fk_attendance_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_attendance_user_id` (`user_id`),
    INDEX `idx_attendance_work_date` (`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
