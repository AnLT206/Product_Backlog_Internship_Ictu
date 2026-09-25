-- US-09/US-10: thời điểm TTS xác nhận hợp đồng.
ALTER TABLE `documents`
    ADD COLUMN `confirmed_at` DATETIME NULL AFTER `review_note`;
