-- ============================================================================
-- Migration 0032: Create systemSettings table for brand customization and settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS `systemSettings` (
  `id` varchar(64) PRIMARY KEY,
  `category` varchar(100) NOT NULL,
  `key` varchar(100) NOT NULL,
  `value` longtext,
  `dataType` ENUM('string','number','boolean','json') NOT NULL,
  `description` text,
  `isPublic` tinyint DEFAULT 0,
  `updatedBy` varchar(64),
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_category_key` (`category`, `key`),
  INDEX `idx_category` (`category`),
  INDEX `idx_key` (`key`)
);

-- ============================================================================
-- End Migration 0032
-- ============================================================================
