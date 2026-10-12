-- Migration: Thêm khóa ngoại mentor_id vào bảng intern_profiles và tạo bảng trung gian mentor_interns (US-30)

ALTER TABLE `intern_profiles`
    ADD COLUMN `mentor_id` INT NULL AFTER `user_id`,
    ADD INDEX `idx_intern_profiles_mentor_id` (`mentor_id`),
    ADD CONSTRAINT `fk_intern_profiles_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `mentor_interns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mentor_id` INT NOT NULL,
    `intern_id` INT NOT NULL,
    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_mentor_interns_mentor` (`mentor_id`),
    INDEX `idx_mentor_interns_intern` (`intern_id`),
    CONSTRAINT `uq_mentor_intern` UNIQUE (`mentor_id`, `intern_id`),
    CONSTRAINT `fk_mentor_interns_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mentor_interns_intern` FOREIGN KEY (`intern_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
