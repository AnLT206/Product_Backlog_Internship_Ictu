-- Migration: SCRUM-25, SCRUM-26, SCRUM-27
-- Cập nhật bảng internship_programs và tạo bảng program_members kèm trigger/procedure kiểm tra số lượng TTS tối đa

-- 1. Bổ sung các cột vào internship_programs nếu chưa có
SET @dbname = DATABASE();
SET @tablename = "internship_programs";

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = "max_interns"
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `internship_programs` ADD COLUMN `max_interns` INT NOT NULL DEFAULT 50 AFTER `end_date`"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = "status"
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `internship_programs` ADD COLUMN `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open' AFTER `max_interns`"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = "is_deleted"
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `internship_programs` ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = "deleted_at"
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `internship_programs` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL AFTER `is_deleted`"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Tạo bảng program_members lưu thành viên kỳ thực tập
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

-- 3. Trigger kiểm tra số lượng TTS tối đa và trạng thái kỳ (SCRUM-26)
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

-- 4. Stored Procedure kiểm tra và gán TTS vào kỳ (SCRUM-26)
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
