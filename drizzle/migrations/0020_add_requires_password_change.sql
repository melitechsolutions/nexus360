-- Migration: Add requiresPasswordChange column to users table
-- Tracks whether a user must change their password on first login (default: true for auto-generated passwords)
ALTER TABLE `users` ADD COLUMN `requiresPasswordChange` TINYINT(1) NOT NULL DEFAULT 1 AFTER `passwordResetExpiresAt`;
