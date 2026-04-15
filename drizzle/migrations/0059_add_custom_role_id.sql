-- Add customRoleId column to users table
ALTER TABLE `users` ADD COLUMN `customRoleId` VARCHAR(64) NULL AFTER `organizationId`;
