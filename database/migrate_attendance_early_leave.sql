ALTER TABLE `attendance`
    MODIFY COLUMN `status` ENUM('present', 'late', 'half_day', 'absent', 'early_leave')
    NOT NULL DEFAULT 'present';