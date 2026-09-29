-- Migration: Tạo bảng tasks và các ràng buộc tiến độ / trạng thái (Tasks 1, 2, 7)
-- Bảng lưu trữ công việc mentor giao cho TTS

CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mentor_id` INT NOT NULL,
    `intern_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('todo', 'doing', 'done', 'canceled') NOT NULL DEFAULT 'todo',
    `progress` INT NOT NULL DEFAULT 0,
    `due_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_task_progress` CHECK (`progress` >= 0 AND `progress` <= 100),
    CONSTRAINT `fk_tasks_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tasks_intern` FOREIGN KEY (`intern_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_tasks_mentor_id` (`mentor_id`),
    INDEX `idx_tasks_intern_id` (`intern_id`),
    INDEX `idx_tasks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
