-- US-37: Tích hợp hệ thống với HRM để đồng bộ dữ liệu nhân sự tự động
-- Bảng lưu lịch sử các đợt đồng bộ nhân sự & mentor (cron job, manual, webhook)

CREATE TABLE IF NOT EXISTS `hrm_sync_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sync_type` ENUM('cron', 'manual', 'webhook') NOT NULL DEFAULT 'cron',
    `status` ENUM('success', 'failed', 'partial', 'in_progress') NOT NULL DEFAULT 'in_progress',
    `source` VARCHAR(100) NOT NULL DEFAULT 'FastHRM',
    `total_records` INT NOT NULL DEFAULT 0,
    `created_users` INT NOT NULL DEFAULT 0,
    `updated_users` INT NOT NULL DEFAULT 0,
    `failed_records` INT NOT NULL DEFAULT 0,
    `mentors_synced` INT NOT NULL DEFAULT 0,
    `hr_synced` INT NOT NULL DEFAULT 0,
    `interns_synced` INT NOT NULL DEFAULT 0,
    `error_message` TEXT NULL,
    `details` JSON NULL,
    `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_hrm_sync_logs_sync_type` (`sync_type`),
    INDEX `idx_hrm_sync_logs_status` (`status`),
    INDEX `idx_hrm_sync_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
