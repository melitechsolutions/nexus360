-- Migration: Add auto-recurring invoice support and client subscriptions
-- Date: 2026-04-13

-- 1. Add auto-recurring columns to invoices table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'isAutoRecurring');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `invoices` ADD COLUMN `isAutoRecurring` TINYINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'recurringInvoiceId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `invoices` ADD COLUMN `recurringInvoiceId` VARCHAR(64) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'clientSubscriptionId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `invoices` ADD COLUMN `clientSubscriptionId` VARCHAR(64) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Add organizationId and clientSubscriptionId to recurringInvoices table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurringInvoices' AND COLUMN_NAME = 'organizationId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `recurringInvoices` ADD COLUMN `organizationId` VARCHAR(64) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurringInvoices' AND COLUMN_NAME = 'clientSubscriptionId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `recurringInvoices` ADD COLUMN `clientSubscriptionId` VARCHAR(64) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Create clientSubscriptions table
CREATE TABLE IF NOT EXISTS `clientSubscriptions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organizationId` VARCHAR(64) DEFAULT NULL,
  `clientId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('active','paused','cancelled','expired') NOT NULL DEFAULT 'active',
  `frequency` ENUM('weekly','biweekly','monthly','quarterly','annually') NOT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'KES',
  `startDate` DATETIME NOT NULL,
  `endDate` DATETIME DEFAULT NULL,
  `nextBillingDate` DATETIME NOT NULL,
  `lastBilledDate` DATETIME DEFAULT NULL,
  `templateInvoiceId` VARCHAR(64) DEFAULT NULL,
  `recurringInvoiceId` VARCHAR(64) DEFAULT NULL,
  `autoSendInvoice` TINYINT NOT NULL DEFAULT 1,
  `totalBilled` INT DEFAULT 0,
  `invoiceCount` INT DEFAULT 0,
  `createdBy` VARCHAR(64) DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cs_org` (`organizationId`),
  INDEX `idx_cs_client` (`clientId`),
  INDEX `idx_cs_status` (`status`),
  INDEX `idx_cs_next_billing` (`nextBillingDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
