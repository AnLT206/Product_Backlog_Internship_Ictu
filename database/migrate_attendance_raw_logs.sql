-- Migration: Tạo bảng attendance_raw_logs lưu trữ tạm thời bản ghi quét QR / quẹt thẻ từ thiết bị ngoại vi (SCRUM-242, SCRUM-243)

CREATE TABLE IF NOT EXISTS `attendance_raw_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) NOT NULL,
    `device_ip` VARCHAR(50) NULL,
    `user_code` VARCHAR(50) NULL,
    `user_id` INT NULL,
    `scan_time` DATETIME NOT NULL,
    `scan_type` ENUM('qr', 'rfid_card', 'fingerprint', 'face_id', 'other') NOT NULL DEFAULT 'qr',
    `direction` ENUM('in', 'out', 'unknown') NOT NULL DEFAULT 'unknown',
    `raw_payload` TEXT NULL,
    `is_processed` BOOLEAN NOT NULL DEFAULT FALSE,
    `processed_at` DATETIME NULL,
    `error_note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_raw_logs_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_raw_logs_user_id` (`user_id`),
    INDEX `idx_raw_logs_user_code` (`user_code`),
    INDEX `idx_raw_logs_scan_time` (`scan_time`),
    INDEX `idx_raw_logs_is_processed` (`is_processed`),
    INDEX `idx_raw_logs_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
