-- Add CCCD to users that already exist in the database.
ALTER TABLE `users`
    ADD COLUMN `cccd` VARCHAR(12) NULL UNIQUE AFTER `email`;