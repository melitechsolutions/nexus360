-- Ensure services table exists with current schema and backfill older installs
CREATE TABLE IF NOT EXISTS `services` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(64) NULL,
  `name` varchar(255) NOT NULL,
  `description` text NULL,
  `category` varchar(100) NULL,
  `hourlyRate` int NULL,
  `fixedPrice` int NULL,
  `unit` varchar(50) DEFAULT 'hour',
  `taxRate` int DEFAULT 0,
  `isActive` tinyint DEFAULT 1 NOT NULL,
  `createdBy` varchar(64) NULL,
  `createdAt` timestamp NULL,
  `updatedAt` timestamp NULL,
  PRIMARY KEY (`id`)
);

-- Add organization scope column for older schemas missing it
SET @has_org_col := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'services'
    AND column_name = 'organizationId'
);
SET @sql_add_org_col := IF(
  @has_org_col = 0,
  'ALTER TABLE `services` ADD COLUMN `organizationId` varchar(64) NULL AFTER `id`',
  'SELECT 1'
);
PREPARE stmt_add_org_col FROM @sql_add_org_col;
EXECUTE stmt_add_org_col;
DEALLOCATE PREPARE stmt_add_org_col;

-- Align timestamp nullability with Drizzle schema
ALTER TABLE `services`
  MODIFY COLUMN `createdAt` timestamp NULL,
  MODIFY COLUMN `updatedAt` timestamp NULL;
