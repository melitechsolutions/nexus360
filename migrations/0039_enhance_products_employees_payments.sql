-- Migration: Enhance Products, Employees, and Payments Tables
-- Date: 2026-03-16
-- Purpose: Add missing fields for enhanced functionality

-- =====================================================================
-- PRODUCTS TABLE ENHANCEMENTS
-- =====================================================================
ALTER TABLE `products` 
ADD COLUMN IF NOT EXISTS `barcode` VARCHAR(100) UNIQUE AFTER `sku`,
ADD COLUMN IF NOT EXISTS `expiryDate` DATE AFTER `barcode`,
ADD COLUMN IF NOT EXISTS `batchNumber` VARCHAR(100) AFTER `expiryDate`,
ADD COLUMN IF NOT EXISTS `warehouseLocation` VARCHAR(255) AFTER `batchNumber`,
ADD COLUMN IF NOT EXISTS `maxStockLevel` INT AFTER `minStockLevel`,
ADD COLUMN IF NOT EXISTS `supplierId` VARCHAR(64) AFTER `supplier`,
ADD COLUMN IF NOT EXISTS `manufacturingDate` DATE AFTER `expiryDate`,
ADD COLUMN IF NOT EXISTS `warrantyMonths` INT DEFAULT 0 AFTER `manufacturingDate`,
ADD COLUMN IF NOT EXISTS `hsCode` VARCHAR(50) AFTER `warrantyMonths`,
ADD COLUMN IF NOT EXISTS `weight` DECIMAL(10, 2) AFTER `hsCode`,
ADD COLUMN IF NOT EXISTS `weightUnit` VARCHAR(20) AFTER `weight`,
ADD FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
ADD INDEX `idx_barcode` (`barcode`),
ADD INDEX `idx_expiry_date` (`expiryDate`),
ADD INDEX `idx_warehouse_location` (`warehouseLocation`),
ADD INDEX `idx_supplier_id` (`supplierId`);

-- =====================================================================
-- EMPLOYEES TABLE ENHANCEMENTS
-- =====================================================================
ALTER TABLE `employees` 
ADD COLUMN IF NOT EXISTS `contractEndDate` TIMESTAMP AFTER `hireDate`,
ADD COLUMN IF NOT EXISTS `bloodType` VARCHAR(5) AFTER `nationalId`,
ADD COLUMN IF NOT EXISTS `maritalStatus` ENUM('single', 'married', 'divorced', 'widowed') AFTER `bloodType`,
ADD COLUMN IF NOT EXISTS `nextOfKinName` VARCHAR(255) AFTER `emergencyContact`,
ADD COLUMN IF NOT EXISTS `nextOfKinPhone` VARCHAR(50) AFTER `nextOfKinName`,
ADD COLUMN IF NOT EXISTS `nextOfKinRelationship` VARCHAR(100) AFTER `nextOfKinPhone`,
ADD COLUMN IF NOT EXISTS `professionalCertifications` TEXT AFTER `nextOfKinRelationship`,
ADD COLUMN IF NOT EXISTS `bankBranch` VARCHAR(255) AFTER `bankAccountNumber`,
ADD COLUMN IF NOT EXISTS `pfNumber` VARCHAR(100) AFTER `taxId`,
ADD COLUMN IF NOT EXISTS `nssf` VARCHAR(100) AFTER `pfNumber`,
ADD COLUMN IF NOT EXISTS `healthInsurance` VARCHAR(255) AFTER `nssf`,
ADD COLUMN IF NOT EXISTS `membershipNumber` VARCHAR(100) AFTER `healthInsurance`,
ADD COLUMN IF NOT EXISTS `directManager` VARCHAR(64) AFTER `position`,
ADD COLUMN IF NOT EXISTS `probationEndDate` TIMESTAMP AFTER `contractEndDate`,
ADD COLUMN IF NOT EXISTS `performanceRating` DECIMAL(3, 1) AFTER `probationEndDate`,
ADD COLUMN IF NOT EXISTS `salary` INT AFTER `performanceRating`,
ADD COLUMN IF NOT EXISTS `lastPromotionDate` TIMESTAMP AFTER `salary`,
ADD FOREIGN KEY (`directManager`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
ADD INDEX `idx_contract_end_date` (`contractEndDate`),
ADD INDEX `idx_marital_status` (`maritalStatus`),
ADD INDEX `idx_pf_number` (`pfNumber`),
ADD INDEX `idx_direct_manager` (`directManager`);

-- =====================================================================
-- PAYMENTS TABLE ENHANCEMENTS
-- =====================================================================
ALTER TABLE `payments` 
ADD COLUMN IF NOT EXISTS `receiptNumber` VARCHAR(100) UNIQUE AFTER `id`,
ADD COLUMN IF NOT EXISTS `clientId` VARCHAR(64) AFTER `invoiceId`,
ADD COLUMN IF NOT EXISTS `approvedBy` VARCHAR(64) AFTER `status`,
ADD COLUMN IF NOT EXISTS `approvalDate` TIMESTAMP AFTER `approvedBy`,
ADD COLUMN IF NOT EXISTS `reconciliationStatus` ENUM('pending', 'reconciled', 'disputed', 'cleared') DEFAULT 'pending' AFTER `approvalDate`,
ADD COLUMN IF NOT EXISTS `bankReference` VARCHAR(255) AFTER `reconciliationStatus`,
ADD COLUMN IF NOT EXISTS `notes` TEXT AFTER `bankReference`,
ADD COLUMN IF NOT EXISTS `paidBy` VARCHAR(255) AFTER `notes`,
ADD COLUMN IF NOT EXISTS `chequeNumber` VARCHAR(100) AFTER `paidBy`,
ADD COLUMN IF NOT EXISTS `chequeDate` DATE AFTER `chequeNumber`,
ADD COLUMN IF NOT EXISTS `bankName` VARCHAR(255) AFTER `chequeDate`,
ADD COLUMN IF NOT EXISTS `bankBranch` VARCHAR(255) AFTER `bankName`,
ADD FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
ADD FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
ADD UNIQUE KEY `receipt_number_unique` (`receiptNumber`),
ADD INDEX `idx_client_id` (`clientId`),
ADD INDEX `idx_approval_date` (`approvalDate`),
ADD INDEX `idx_reconciliation_status` (`reconciliationStatus`),
ADD INDEX `idx_cheque_number` (`chequeNumber`);

-- =====================================================================
-- CREATE PAYMENT RECONCILIATION TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `paymentReconciliation` (
  `id` VARCHAR(64) PRIMARY KEY,
  `reconciliationDate` TIMESTAMP NOT NULL,
  `bankStatement` VARCHAR(255),
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `bankBalance` DECIMAL(12, 2),
  `systemBalance` DECIMAL(12, 2),
  `difference` DECIMAL(12, 2),
  `status` ENUM('draft', 'pending_review', 'reconciled', 'discrepancy') DEFAULT 'draft',
  `notes` TEXT,
  `createdBy` VARCHAR(64),
  `reviewedBy` VARCHAR(64),
  `reviewDate` TIMESTAMP,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_reconciliation_date` (`reconciliationDate`),
  KEY `idx_status` (`status`)
);
