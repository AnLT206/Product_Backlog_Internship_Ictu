-- Migration: Thiết kế quan hệ n-n giữa bảng Intern_Profiles và Internship_Groups/Departments lưu thông tin nhóm của TTS
-- Hỗ trợ phân công thực tập sinh vào các chương trình/nhóm theo phòng ban cho HR

-- 1. Bảng nhóm thực tập theo phòng ban và chương trình thực tập
CREATE TABLE IF NOT EXISTS `internship_groups` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NULL UNIQUE,
    `department_id` INT NULL,
    `program_id` INT NULL,
    `description` VARCHAR(500) NULL,
    `max_members` INT NOT NULL DEFAULT 20,
    `status` ENUM('active', 'inactive', 'closed') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_internship_groups_department_id` (`department_id`),
    INDEX `idx_internship_groups_program_id` (`program_id`),
    CONSTRAINT `fk_ig_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_ig_program` FOREIGN KEY (`program_id`) REFERENCES `internship_programs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng trung gian quan hệ n-n giữa Intern_Profiles và Internship_Groups
CREATE TABLE IF NOT EXISTS `intern_profile_groups` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `intern_profile_id` INT NOT NULL,
    `group_id` INT NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'member',
    `status` ENUM('active', 'transferred', 'left') NOT NULL DEFAULT 'active',
    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `assigned_by` INT NULL,
    UNIQUE KEY `uq_intern_profile_group` (`intern_profile_id`, `group_id`),
    INDEX `idx_ipg_intern_profile_id` (`intern_profile_id`),
    INDEX `idx_ipg_group_id` (`group_id`),
    CONSTRAINT `fk_ipg_intern_profile` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ipg_group` FOREIGN KEY (`group_id`) REFERENCES `internship_groups` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ipg_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng trung gian quan hệ n-n giữa Intern_Profiles và Departments
CREATE TABLE IF NOT EXISTS `intern_profile_departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `intern_profile_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `assigned_by` INT NULL,
    UNIQUE KEY `uq_intern_profile_department` (`intern_profile_id`, `department_id`),
    INDEX `idx_ipd_intern_profile_id` (`intern_profile_id`),
    INDEX `idx_ipd_department_id` (`department_id`),
    CONSTRAINT `fk_ipd_intern_profile` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ipd_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ipd_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
