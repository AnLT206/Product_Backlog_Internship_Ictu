"""
Chạy trên DB đã init bằng schema cũ (university/major NOT NULL).
Khỏi chạy nếu volume DB mới (đã dùng schema.sql mới).
"""

ALTER TABLE `intern_profiles`
    MODIFY COLUMN `university` VARCHAR(150) NULL,
    MODIFY COLUMN `major` VARCHAR(150) NULL;

CREATE TABLE IF NOT EXISTS `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `doc_type` ENUM('cv', 'application', 'contract', 'other') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `review_note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_documents_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`name`, `description`) VALUES
    ('intern', 'Thực tập sinh (TTS) — đăng ký công khai qua /api/auth/register'),
    ('hr', 'Nhân sự — tài khoản nội bộ, không đăng ký công khai'),
    ('mentor', 'Mentor hướng dẫn — tài khoản nội bộ, không đăng ký công khai'),
    ('admin', 'Quản trị hệ thống — tài khoản nội bộ, không đăng ký công khai')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
