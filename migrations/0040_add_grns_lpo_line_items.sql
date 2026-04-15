-- Migration: Add grns, grnItems, and lpoLineItems tables for procurement line items
-- Also adds lineItems JSON column to expenses table

-- =====================================================================
-- EXPENSES: Add lineItems JSON column
-- =====================================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS lineItems LONGTEXT NULL COMMENT 'JSON array of expense line items';

-- =====================================================================
-- LPO LINE ITEMS TABLE (if not already created)
-- =====================================================================
CREATE TABLE IF NOT EXISTS `lpoLineItems` (
  `id` VARCHAR(64) PRIMARY KEY,
  `lpoId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64),
  `description` TEXT NOT NULL,
  `quantity` INT NOT NULL,
  `unit` VARCHAR(50) DEFAULT 'pcs',
  `unitPrice` INT NOT NULL,
  `taxRate` INT DEFAULT 0,
  `lineTotal` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `lpo_line_item_lpo_idx` (`lpoId`)
);

-- =====================================================================
-- GRNS TABLE (simplified, application-managed GRNs)
-- =====================================================================
CREATE TABLE IF NOT EXISTS `grns` (
  `id` VARCHAR(64) PRIMARY KEY,
  `grnNumber` VARCHAR(100) NOT NULL,
  `lpoId` VARCHAR(64),
  `supplier` VARCHAR(255) NOT NULL,
  `invoiceNumber` VARCHAR(100),
  `receivedDate` DATETIME NOT NULL,
  `status` ENUM('pending', 'accepted', 'partial', 'rejected') DEFAULT 'pending' NOT NULL,
  `notes` TEXT,
  `totalQuantity` INT DEFAULT 0,
  `totalCost` INT DEFAULT 0,
  `createdBy` VARCHAR(64),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `grns_number_idx` (`grnNumber`),
  KEY `grns_status_idx` (`status`)
);

-- =====================================================================
-- GRN ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `grnItems` (
  `id` VARCHAR(64) PRIMARY KEY,
  `grnId` VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `orderedQuantity` INT NOT NULL DEFAULT 0,
  `receivedQuantity` INT NOT NULL,
  `unit` VARCHAR(50) DEFAULT 'pcs',
  `unitCost` INT DEFAULT 0,
  `totalCost` INT DEFAULT 0,
  `condition` ENUM('good', 'damaged', 'expired', 'defective') DEFAULT 'good',
  `remarks` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `grn_item_grn_idx` (`grnId`),
  CONSTRAINT `fk_grn_items_grn` FOREIGN KEY (`grnId`) REFERENCES `grns`(`id`) ON DELETE CASCADE
);
