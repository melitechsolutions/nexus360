-- Add isDefault column to documentTemplates table
ALTER TABLE `documentTemplates` ADD COLUMN IF NOT EXISTS `isDefault` TINYINT(1) NOT NULL DEFAULT 0 AFTER `content`;

-- Ensure unique default per type per organization
-- (handled in application logic to allow ALTER to succeed on older MySQL)
