-- Fix users role enum to match schema
-- First update any legacy role values to valid ones before changing the enum
UPDATE `users` SET `role` = 'staff' WHERE `role` NOT IN ('user', 'admin', 'staff', 'accountant', 'client', 'super_admin', 'project_manager', 'hr');
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user', 'admin', 'staff', 'accountant', 'client', 'super_admin', 'project_manager', 'hr') NOT NULL DEFAULT 'user';
