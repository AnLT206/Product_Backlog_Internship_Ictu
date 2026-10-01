-- US-27: loại giấy tờ trong yêu cầu hỗ trợ.
ALTER TABLE `support_requests`
    ADD COLUMN `document_type` VARCHAR(50) NULL COMMENT 'Loại giấy tờ xin cấp: internship_confirmation, completion_certificate, other (NULL nếu không xin giấy tờ)' AFTER `category`,
    ADD INDEX `idx_support_requests_document_type` (`document_type`);
