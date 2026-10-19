-- Migration: Create system_settings table if not exists
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    `value` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'general',
    `label` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `is_secret` BOOLEAN NOT NULL DEFAULT FALSE,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `ix_system_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
