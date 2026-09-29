-- Migration: Tạo bảng support_requests (Task 5: Yêu cầu Hỗ trợ từ Thực tập sinh)

CREATE TABLE IF NOT EXISTS `support_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL COMMENT 'ID của Thực tập sinh gửi yêu cầu',
    `title` VARCHAR(200) NOT NULL COMMENT 'Tiêu đề yêu cầu hỗ trợ',
    `content` TEXT NOT NULL COMMENT 'Nội dung chi tiết yêu cầu',
    `category` VARCHAR(50) NOT NULL DEFAULT 'other' COMMENT 'Phân loại: technical, procedure, workspace, mentor, other',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'medium' COMMENT 'Mức độ ưu tiên: low, medium, high, urgent',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái: pending, in_progress, resolved, rejected',
    `response_note` TEXT NULL COMMENT 'Ghi chú phản hồi từ HR/Admin',
    `responder_id` INT NULL COMMENT 'ID của HR/Admin xử lý yêu cầu',
    `resolved_at` TIMESTAMP NULL COMMENT 'Thời điểm xử lý xong yêu cầu',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_support_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_support_requests_responder` FOREIGN KEY (`responder_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_support_requests_user` (`user_id`),
    INDEX `idx_support_requests_status` (`status`),
    INDEX `idx_support_requests_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
