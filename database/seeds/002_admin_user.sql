-- Seed tài khoản admin mặc định (CHỈ dùng cho môi trường development).
-- Password plain (dev): Admin@123
-- Hash bcrypt rounds=12 (tạo bởi app.utils.hash_password).
--
-- Chạy SAU schema.sql và 001_roles.sql.
-- Idempotent theo email: đã có admin@ictu.edu.vn thì bỏ qua.

INSERT INTO `users` (`email`, `password_hash`, `full_name`, `role_id`, `status`)
SELECT
    'admin@ictu.edu.vn',
    '$2b$12$07pFqmYtJoYF4rXgU4D1T.4p5FAObCXaGeRF43ydZ6SPiOcDPR6N2',
    'System Admin',
    r.`id`,
    'active'
FROM `roles` r
WHERE r.`name` = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM `users` u WHERE u.`email` = 'admin@ictu.edu.vn'
  );
