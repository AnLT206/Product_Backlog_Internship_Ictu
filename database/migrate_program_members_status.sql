-- Migration: Thêm cột status vào bảng program_members để theo dõi trạng thái thực tập của TTS (US-33)
-- Các trạng thái:
-- 'in_progress': Đang thực tập
-- 'completed': Đã hoàn thành
-- 'dropped_out': Bỏ cuộc
-- 'failed': Không đạt

ALTER TABLE `program_members`
ADD COLUMN `status` ENUM('in_progress', 'completed', 'dropped_out', 'failed') NOT NULL DEFAULT 'in_progress'
AFTER `mentor_user_id`;

CREATE INDEX `idx_program_members_status` ON `program_members` (`status`);
