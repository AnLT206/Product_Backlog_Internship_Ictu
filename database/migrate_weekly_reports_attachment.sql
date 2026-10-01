-- US-17: thêm đường dẫn file đính kèm cho báo cáo tuần đã tồn tại.
ALTER TABLE `weekly_reports`
    ADD COLUMN `attachment_path` VARCHAR(500) NULL COMMENT 'Đường dẫn file đính kèm nếu có' AFTER `content`;
