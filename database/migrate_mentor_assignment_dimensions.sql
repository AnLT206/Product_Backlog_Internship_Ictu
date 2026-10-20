-- Migration: Phân công Mentor theo Khối / Lớp / Khóa / Ban (Hỗ trợ 1-N và N-N)
-- Date: 2026-10-20

-- 1. Bổ sung class_name vào intern_profiles
ALTER TABLE `intern_profiles`
    ADD COLUMN `class_name` VARCHAR(100) NULL AFTER `academic_year`,
    ADD INDEX `idx_intern_profiles_class_name` (`class_name`),
    ADD INDEX `idx_intern_profiles_academic_year` (`academic_year`);

-- 2. Nâng cấp bảng mentor_interns: hỗ trợ N-N (nhiều vai trò), ghi nhận tiêu chí phân công (Khối/Lớp/Khóa/Ban)
ALTER TABLE `mentor_interns`
    ADD COLUMN `role_type` ENUM('primary', 'technical', 'co_mentor', 'advisor') NOT NULL DEFAULT 'primary' AFTER `intern_id`,
    ADD COLUMN `dimension_type` ENUM('direct', 'major', 'class', 'intake', 'department') NOT NULL DEFAULT 'direct' AFTER `role_type`,
    ADD COLUMN `dimension_value` VARCHAR(150) NULL AFTER `dimension_type`,
    ADD COLUMN `assigned_by_id` INT NULL AFTER `dimension_value`,
    ADD CONSTRAINT `fk_mentor_interns_assigned_by` FOREIGN KEY (`assigned_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    DROP INDEX `uq_mentor_intern`,
    ADD UNIQUE KEY `uq_mentor_intern_role` (`mentor_id`, `intern_id`, `role_type`),
    ADD INDEX `idx_mentor_interns_dimension` (`dimension_type`, `dimension_value`);
