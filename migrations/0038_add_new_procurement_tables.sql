-- Migration: Add Procurement Management Tables
-- Date: 2026-03-16
-- Purpose: Add Suppliers, LPO, DeliveryNotes, and GRN tables for supply chain management

-- =====================================================================
-- SUPPLIERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` VARCHAR(64) PRIMARY KEY,
  `supplierName` VARCHAR(255) NOT NULL,
  `supplierCode` VARCHAR(100) UNIQUE NOT NULL,
  `contactPerson` VARCHAR(255),
  `email` VARCHAR(320),
  `phone` VARCHAR(50),
  `alternatePhone` VARCHAR(50),
  `address` TEXT,
  `city` VARCHAR(100),
  `country` VARCHAR(100),
  `postalCode` VARCHAR(20),
  `taxId` VARCHAR(100),
  `registrationNumber` VARCHAR(100),
  `bankName` VARCHAR(255),
  `bankAccountNumber` VARCHAR(100),
  `bankBranch` VARCHAR(100),
  `paymentTerms` VARCHAR(100),
  `creditLimit` DECIMAL(12, 2),
  `category` VARCHAR(100),
  `rating` DECIMAL(3, 1),
  `isActive` BOOLEAN DEFAULT TRUE,
  `status` ENUM('active', 'inactive', 'suspended', 'blacklisted') DEFAULT 'active',
  `createdBy` VARCHAR(64),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_code_unique` (`supplierCode`),
  KEY `email_idx` (`email`),
  KEY `status_idx` (`status`),
  KEY `category_idx` (`category`)
);

-- =====================================================================
-- LOCAL PURCHASE ORDER (LPO) TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `lpo` (
  `id` VARCHAR(64) PRIMARY KEY,
  `lpoNumber` VARCHAR(100) UNIQUE NOT NULL,
  `supplierId` VARCHAR(64) NOT NULL,
  `departmentId` VARCHAR(64),
  `issueDate` TIMESTAMP NOT NULL,
  `expectedDeliveryDate` TIMESTAMP NOT NULL,
  `actualDeliveryDate` TIMESTAMP,
  `description` TEXT,
  `totalAmount` DECIMAL(12, 2) NOT NULL,
  `taxAmount` DECIMAL(12, 2) DEFAULT 0,
  `discountAmount` DECIMAL(12, 2) DEFAULT 0,
  `netAmount` DECIMAL(12, 2) NOT NULL,
  `paymentTerms` VARCHAR(100),
  `status` ENUM('draft', 'approved', 'sent', 'partially_received', 'received', 'cancelled', 'closed') DEFAULT 'draft',
  `approvedBy` VARCHAR(64),
  `approvalDate` TIMESTAMP,
  `createdBy` VARCHAR(64),
  `notes` TEXT,
  `referenceNumber` VARCHAR(100),
  `deliveryAddress` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
  KEY `lpo_number_idx` (`lpoNumber`),
  KEY `supplier_idx` (`supplierId`),
  KEY `status_idx` (`status`),
  KEY `issue_date_idx` (`issueDate`),
  KEY `approval_date_idx` (`approvalDate`)
);

-- =====================================================================
-- LPO LINE ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `lpoLineItems` (
  `id` VARCHAR(64) PRIMARY KEY,
  `lpoId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64),
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `unit` VARCHAR(50),
  `unitPrice` DECIMAL(12, 2) NOT NULL,
  `taxRate` INT DEFAULT 0,
  `lineTotal` DECIMAL(12, 2) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`lpoId`) REFERENCES `lpo`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL,
  KEY `lpo_idx` (`lpoId`)
);

-- =====================================================================
-- DELIVERY NOTES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `deliveryNotes` (
  `id` VARCHAR(64) PRIMARY KEY,
  `deliveryNoteNumber` VARCHAR(100) UNIQUE NOT NULL,
  `lpoId` VARCHAR(64),
  `supplierId` VARCHAR(64) NOT NULL,
  `deliveryDate` TIMESTAMP NOT NULL,
  `expectedDeliveryDate` TIMESTAMP,
  `driverId` VARCHAR(255),
  `vehicleNumber` VARCHAR(50),
  `deliveryStatus` ENUM('draft', 'in_transit', 'delivered', 'partially_delivered', 'failed', 'returned') DEFAULT 'draft',
  `receivedBy` VARCHAR(255),
  `receivedDate` TIMESTAMP,
  `condition` ENUM('good', 'damaged', 'partial', 'incomplete') DEFAULT 'good',
  `notes` TEXT,
  `damageNotes` TEXT,
  `totalItems` INT,
  `receivedItems` INT,
  `damagedItems` INT,
  `createdBy` VARCHAR(64),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`lpoId`) REFERENCES `lpo`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
  KEY `delivery_note_number_idx` (`deliveryNoteNumber`),
  KEY `lpo_idx` (`lpoId`),
  KEY `supplier_idx` (`supplierId`),
  KEY `delivery_date_idx` (`deliveryDate`),
  KEY `delivery_status_idx` (`deliveryStatus`)
);

-- =====================================================================
-- DELIVERY NOTE LINE ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `deliveryNoteLineItems` (
  `id` VARCHAR(64) PRIMARY KEY,
  `deliveryNoteId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64),
  `description` VARCHAR(255) NOT NULL,
  `expectedQuantity` INT NOT NULL,
  `receivedQuantity` INT DEFAULT 0,
  `damagedQuantity` INT DEFAULT 0,
  `unit` VARCHAR(50),
  `unitPrice` DECIMAL(12, 2),
  `batchNumber` VARCHAR(100),
  `expiryDate` DATE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`deliveryNoteId`) REFERENCES `deliveryNotes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL,
  KEY `delivery_note_idx` (`deliveryNoteId`)
);

-- =====================================================================
-- GOODS RECEIVED NOTE (GRN) TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `grn` (
  `id` VARCHAR(64) PRIMARY KEY,
  `grnNumber` VARCHAR(100) UNIQUE NOT NULL,
  `lpoId` VARCHAR(64),
  `deliveryNoteId` VARCHAR(64),
  `supplierId` VARCHAR(64) NOT NULL,
  `grnDate` TIMESTAMP NOT NULL,
  `receivedDate` TIMESTAMP NOT NULL,
  `warehouseId` VARCHAR(64),
  `receivedBy` VARCHAR(255),
  `inspectedBy` VARCHAR(255),
  `inspectionDate` TIMESTAMP,
  `approvedBy` VARCHAR(64),
  `approvalDate` TIMESTAMP,
  `status` ENUM('draft', 'received', 'inspected', 'approved', 'posted', 'rejected', 'partial') DEFAULT 'draft',
  `qualityStatus` ENUM('approved', 'rejected', 'partial', 'pending_inspection') DEFAULT 'pending_inspection',
  `totalQuantity` INT,
  `totalCost` DECIMAL(12, 2),
  `notes` TEXT,
  `rejectionReason` TEXT,
  `createdBy` VARCHAR(64),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`lpoId`) REFERENCES `lpo`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`deliveryNoteId`) REFERENCES `deliveryNotes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
  KEY `grn_number_idx` (`grnNumber`),
  KEY `lpo_idx` (`lpoId`),
  KEY `delivery_note_idx` (`deliveryNoteId`),
  KEY `supplier_idx` (`supplierId`),
  KEY `grn_date_idx` (`grnDate`),
  KEY `status_idx` (`status`),
  KEY `quality_status_idx` (`qualityStatus`)
);

-- =====================================================================
-- GRN LINE ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `grnLineItems` (
  `id` VARCHAR(64) PRIMARY KEY,
  `grnId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64),
  `description` VARCHAR(255) NOT NULL,
  `orderedQuantity` INT NOT NULL,
  `receivedQuantity` INT NOT NULL,
  `unit` VARCHAR(50),
  `unitCost` DECIMAL(12, 2),
  `totalCost` DECIMAL(12, 2),
  `batchNumber` VARCHAR(100),
  `expiryDate` DATE,
  `warehouseLocation` VARCHAR(255),
  `condition` ENUM('good', 'damaged', 'expired', 'defective') DEFAULT 'good',
  `remarks` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`grnId`) REFERENCES `grn`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL,
  KEY `grn_idx` (`grnId`)
);

-- Add indexes for better performance
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_category ON suppliers(category);
CREATE INDEX idx_lpo_status ON lpo(status);
CREATE INDEX idx_lpo_approvalDate ON lpo(approvalDate);
CREATE INDEX idx_deliveryNotes_status ON deliveryNotes(deliveryStatus);
CREATE INDEX idx_grn_status ON grn(status);
CREATE INDEX idx_grn_qualityStatus ON grn(qualityStatus);
