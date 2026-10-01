-- Migration: Tạo bảng allowance_history (US 25, 26)

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
