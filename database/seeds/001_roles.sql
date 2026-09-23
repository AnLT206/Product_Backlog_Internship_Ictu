-- Seed roles chuẩn hệ thống.
-- Idempotent: chạy lại an toàn (ON DUPLICATE KEY UPDATE).

INSERT INTO `roles` (`name`, `description`) VALUES
    ('intern', 'Thực tập sinh (TTS) — đăng ký công khai qua /api/auth/register'),
    ('hr', 'Nhân sự — tài khoản nội bộ, không đăng ký công khai'),
    ('mentor', 'Mentor hướng dẫn — tài khoản nội bộ, không đăng ký công khai'),
    ('admin', 'Quản trị hệ thống — tài khoản nội bộ, không đăng ký công khai')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
