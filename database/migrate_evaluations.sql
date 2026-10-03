-- US-19: đánh giá tổng kết cuối kỳ của mentor.
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
