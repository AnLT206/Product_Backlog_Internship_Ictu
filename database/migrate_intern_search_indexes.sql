-- Migration: Thêm Index cho tìm kiếm & lọc TTS (SCRUM-21)
-- Cột full_name bảng users (tìm kiếm theo họ tên)
-- Cột university và major bảng intern_profiles (lọc theo trường/ngành)

ALTER TABLE `users` ADD INDEX `idx_users_full_name` (`full_name`);
ALTER TABLE `intern_profiles` ADD INDEX `idx_intern_profiles_university` (`university`);
ALTER TABLE `intern_profiles` ADD INDEX `idx_intern_profiles_major` (`major`);
