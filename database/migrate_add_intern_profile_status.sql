-- Add a separate approval status for intern profiles.
ALTER TABLE `intern_profiles`
    ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' AFTER `user_id`;

-- Preserve existing account decisions when introducing profile status.
UPDATE `intern_profiles` AS ip
JOIN `users` AS u ON u.`id` = ip.`user_id`
SET ip.`status` = CASE u.`status`
    WHEN 'active' THEN 'approved'
    WHEN 'inactive' THEN 'rejected'
    WHEN 'pending' THEN 'pending'
END;
