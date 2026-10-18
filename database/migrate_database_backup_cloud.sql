-- US-43/US-44: Kịch bản sao lưu Database định kỳ hàng ngày và lưu trữ mã hóa lên Cloud Storage
-- Bảng lưu trữ hồ sơ các bản sao lưu và thông tin mã hóa Cloud Storage

CREATE TABLE IF NOT EXISTS `backup_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `filename` VARCHAR(255) NOT NULL UNIQUE,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT NOT NULL DEFAULT 0,
    `backup_type` VARCHAR(50) NOT NULL DEFAULT 'full', -- full, data_only, schema_only
    `note` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'completed', -- completed, in_progress, restoring, failed
    `is_encrypted` TINYINT(1) NOT NULL DEFAULT 0,
    `encryption_algorithm` VARCHAR(50) NULL DEFAULT 'AES-256-Fernet',
    `checksum_sha256` VARCHAR(64) NULL,
    `cloud_storage_url` VARCHAR(500) NULL,
    `cloud_uploaded_at` DATETIME NULL,
    `created_by_user_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `restored_at` DATETIME NULL,
    INDEX `idx_backup_records_created_at` (`created_at`),
    INDEX `idx_backup_records_status` (`status`),
    CONSTRAINT `fk_backup_records_users` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
