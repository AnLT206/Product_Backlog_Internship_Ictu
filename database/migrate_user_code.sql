-- Thêm mã hiển thị người dùng (HR0001, MT0001, TTS0001, …)
-- Chạy trên DB đang chạy (Docker volume cũ).

ALTER TABLE `users`
    ADD COLUMN `code` VARCHAR(20) NULL AFTER `id`;

-- Backfill theo role + thứ tự id
SET @hr_seq := 0;
UPDATE `users` u
JOIN `roles` r ON r.`id` = u.`role_id`
SET u.`code` = CONCAT('HR', LPAD((@hr_seq := @hr_seq + 1), 4, '0'))
WHERE r.`name` = 'hr' AND (u.`code` IS NULL OR u.`code` = '');

SET @mt_seq := 0;
UPDATE `users` u
JOIN `roles` r ON r.`id` = u.`role_id`
SET u.`code` = CONCAT('MT', LPAD((@mt_seq := @mt_seq + 1), 4, '0'))
WHERE r.`name` = 'mentor' AND (u.`code` IS NULL OR u.`code` = '');

SET @tts_seq := 0;
UPDATE `users` u
JOIN `roles` r ON r.`id` = u.`role_id`
SET u.`code` = CONCAT('TTS', LPAD((@tts_seq := @tts_seq + 1), 4, '0'))
WHERE r.`name` = 'intern' AND (u.`code` IS NULL OR u.`code` = '');

SET @ad_seq := 0;
UPDATE `users` u
JOIN `roles` r ON r.`id` = u.`role_id`
SET u.`code` = CONCAT('AD', LPAD((@ad_seq := @ad_seq + 1), 4, '0'))
WHERE r.`name` = 'admin' AND (u.`code` IS NULL OR u.`code` = '');

ALTER TABLE `users`
    MODIFY COLUMN `code` VARCHAR(20) NOT NULL,
    ADD UNIQUE KEY `uk_users_code` (`code`);
