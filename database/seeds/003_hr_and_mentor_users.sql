-- Seed tài khoản HR, Mentor và Thực tập sinh mẫu (môi trường development).
-- 1. HR:
--    Email: hr@ictu.edu.vn | Pass: Hr@123 | Role: hr
-- 2. Mentor:
--    Email: mentor@ictu.edu.vn | Pass: Mentor@123 | Role: mentor
-- 3. Thực tập sinh (Intern):
--    Email: intern@ictu.edu.vn | Pass: Intern@123 | Role: intern
--
-- Chạy SAU schema.sql, 001_roles.sql và 002_admin_user.sql.
-- Idempotent theo email: đã có thì bỏ qua.

-- HR
INSERT INTO `users` (`code`, `email`, `password_hash`, `full_name`, `role_id`, `status`)
SELECT
    'HR0001',
    'hr@ictu.edu.vn',
    '$2b$12$MSW6zh/G08T5h0GRT3jkKuyqOGOG9yRfccR8r9ici6K5gf7NNIgNy',
    'Cán bộ Nhân sự HR',
    r.`id`,
    'active'
FROM `roles` r
WHERE r.`name` = 'hr'
  AND NOT EXISTS (
      SELECT 1 FROM `users` u WHERE u.`email` = 'hr@ictu.edu.vn'
  );

INSERT INTO `user_profiles` (`user_id`)
SELECT u.`id`
FROM `users` u
WHERE u.`email` = 'hr@ictu.edu.vn'
  AND NOT EXISTS (
      SELECT 1 FROM `user_profiles` up WHERE up.`user_id` = u.`id`
  );

-- Mentor
INSERT INTO `users` (`code`, `email`, `password_hash`, `full_name`, `role_id`, `status`)
SELECT
    'MT0001',
    'mentor@ictu.edu.vn',
    '$2b$12$XN7Dc8HLWk6vo8Z4cv/FqOFxjcX8RWGXDMrkDja/1cMi89bVBSm.y',
    'Mentor Hướng dẫn',
    r.`id`,
    'active'
FROM `roles` r
WHERE r.`name` = 'mentor'
  AND NOT EXISTS (
      SELECT 1 FROM `users` u WHERE u.`email` = 'mentor@ictu.edu.vn'
  );

INSERT INTO `user_profiles` (`user_id`)
SELECT u.`id`
FROM `users` u
WHERE u.`email` = 'mentor@ictu.edu.vn'
  AND NOT EXISTS (
      SELECT 1 FROM `user_profiles` up WHERE up.`user_id` = u.`id`
  );

-- Thực tập sinh (Intern)
INSERT INTO `users` (`code`, `email`, `password_hash`, `full_name`, `role_id`, `status`)
SELECT
    'TTS0002',
    'intern@ictu.edu.vn',
    '$2b$12$RnrHZiVIyWqJ7orfMSDv..nv0hfh6BxNHWCKSGADaBaZdcTTsw8rW',
    'Nguyễn Văn An',
    r.`id`,
    'active'
FROM `roles` r
WHERE r.`name` = 'intern'
  AND NOT EXISTS (
      SELECT 1 FROM `users` u WHERE u.`email` = 'intern@ictu.edu.vn'
  );

INSERT INTO `intern_profiles` (`user_id`, `status`, `phone_number`, `university`, `major`, `gpa`)
SELECT
    u.`id`,
    'approved',
    '0912345678',
    'ĐH Công nghệ Thông tin và Truyền thông (ICTU)',
    'Công nghệ thông tin',
    3.65
FROM `users` u
WHERE u.`email` = 'intern@ictu.edu.vn'
  AND NOT EXISTS (
      SELECT 1 FROM `intern_profiles` ip WHERE ip.`user_id` = u.`id`
  );
