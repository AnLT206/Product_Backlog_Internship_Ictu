-- US-11: chương trình thực tập theo phòng ban.
CREATE TABLE IF NOT EXISTS `internship_programs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL UNIQUE,
    `department` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
