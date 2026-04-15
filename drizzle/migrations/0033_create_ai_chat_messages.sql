-- ============================================================================
-- Migration 0033: Create aiChatMessages table for AI chat functionality
-- ============================================================================

CREATE TABLE IF NOT EXISTS `aiChatMessages` (
  `id` varchar(64) PRIMARY KEY,
  `sessionId` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `role` ENUM('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `tokens` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `session_id_idx` (`sessionId`),
  INDEX `user_id_idx` (`userId`)
);

-- ============================================================================
-- End Migration 0033
-- ============================================================================
