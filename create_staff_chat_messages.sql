-- Migration: Create staffChatMessages table for persistent staff chat
-- Run this against the melitech_crm database

CREATE TABLE IF NOT EXISTS `staffChatMessages` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `userName` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `emoji` varchar(10) DEFAULT NULL,
  `replyToId` varchar(64) DEFAULT NULL,
  `replyToUser` varchar(255) DEFAULT NULL,
  `isEdited` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scm_user_id` (`userId`),
  KEY `idx_scm_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
