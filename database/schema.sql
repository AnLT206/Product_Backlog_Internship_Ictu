CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `cccd` VARCHAR(12) NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `role_id` INT NOT NULL,
    `status` ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_full_name` (`full_name`),
    CONSTRAINT `fk_users_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `department_id` INT NULL,
    `phone_number` VARCHAR(20) NULL,
    `dob` DATE NULL,
    `position` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_user_profiles_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_user_profiles_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `intern_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `phone_number` VARCHAR(20) NULL,
    `dob` DATE NULL,
    `gender` ENUM('male', 'female', 'other') DEFAULT 'other',
    `university` VARCHAR(150) NULL,
    `major` VARCHAR(150) NULL,
    `academic_year` VARCHAR(50) NULL,
    `gpa` DECIMAL(3, 2) NULL,
    `address` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_intern_profiles_university` (`university`),
    INDEX `idx_intern_profiles_major` (`major`),
    CONSTRAINT `fk_intern_profiles_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `doc_type` ENUM('cv', 'application', 'contract', 'other') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `review_note` VARCHAR(255) NULL,
    `confirmed_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_documents_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(1000) NOT NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notifications_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `role` VARCHAR(50) NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `resource` VARCHAR(100) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `status_code` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_system_logs_user_id` (`user_id`),
    INDEX `idx_system_logs_action` (`action`),
    INDEX `idx_system_logs_created_at` (`created_at`),
    CONSTRAINT `fk_system_logs_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`name`, `description`) VALUES
    ('intern', 'Thực tập sinh (TTS) — đăng ký công khai qua /api/auth/register'),
    ('hr', 'Nhân sự — tài khoản nội bộ, không đăng ký công khai'),
    ('mentor', 'Mentor hướng dẫn — tài khoản nội bộ, không đăng ký công khai'),
    ('admin', 'Quản trị hệ thống — tài khoản nội bộ, không đăng ký công khai')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `label` VARCHAR(150) NOT NULL,
    `group_name` VARCHAR(50) NOT NULL DEFAULT 'Chung',
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_role_permission` (`role_id`, `permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `internship_programs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL UNIQUE,
    `department` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `max_interns` INT NOT NULL DEFAULT 50,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `program_id` INT NOT NULL,
    `intern_user_id` INT NOT NULL,
    `mentor_user_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_program_intern` (`program_id`, `intern_user_id`),
    CONSTRAINT `fk_pm_program` FOREIGN KEY (`program_id`) REFERENCES `internship_programs` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pm_intern` FOREIGN KEY (`intern_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pm_mentor` FOREIGN KEY (`mentor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `trg_check_max_interns_before_insert`;
DELIMITER //
CREATE TRIGGER `trg_check_max_interns_before_insert`
BEFORE INSERT ON `program_members`
FOR EACH ROW
BEGIN
    DECLARE current_count INT;
    DECLARE max_allowed INT;
    DECLARE prog_status VARCHAR(20);
    DECLARE prog_deleted TINYINT(1);

    SELECT `max_interns`, `status`, `is_deleted`
    INTO max_allowed, prog_status, prog_deleted
    FROM `internship_programs`
    WHERE `id` = NEW.program_id;

    IF prog_deleted = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Kỳ thực tập không tồn tại hoặc đã bị xóa.';
    END IF;

    IF prog_status = 'closed' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Kỳ thực tập đã đóng, không thể tiếp nhận thêm thực tập sinh.';
    END IF;

    SELECT COUNT(*) INTO current_count
    FROM `program_members`
    WHERE `program_id` = NEW.program_id;

    IF current_count >= max_allowed THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Số lượng thực tập sinh đã đạt mức tối đa của kỳ thực tập.';
    END IF;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_check_and_assign_intern`;
DELIMITER //
CREATE PROCEDURE `sp_check_and_assign_intern`(
    IN p_program_id INT,
    IN p_intern_id INT,
    IN p_mentor_id INT
)
BEGIN
    INSERT INTO `program_members` (`program_id`, `intern_user_id`, `mentor_user_id`)
    VALUES (p_program_id, p_intern_id, p_mentor_id);
END//
DELIMITER ;

