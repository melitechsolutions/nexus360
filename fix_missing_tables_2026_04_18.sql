-- Fix missing tables on production - 2026-04-18
-- Creates tables referenced in server code that don't exist in production DB

-- 1. tenantCommunications
CREATE TABLE IF NOT EXISTS `tenantCommunications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) DEFAULT 'announcement',
  `priority` VARCHAR(20) DEFAULT 'normal',
  `status` VARCHAR(20) DEFAULT 'draft',
  `recipientType` VARCHAR(50) DEFAULT 'all_tenants',
  `recipientFilter` JSON DEFAULT NULL,
  `sentAt` DATETIME DEFAULT NULL,
  `scheduledAt` DATETIME DEFAULT NULL,
  `createdBy` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tc_org` (`organizationId`),
  INDEX `idx_tc_status` (`status`),
  INDEX `idx_tc_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. scheduledJobs
CREATE TABLE IF NOT EXISTS `scheduledJobs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `jobName` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `jobType` VARCHAR(50) DEFAULT 'custom',
  `cronExpression` VARCHAR(100) NOT NULL,
  `handler` VARCHAR(255) NOT NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `lastRunAt` DATETIME DEFAULT NULL,
  `nextScheduledRun` DATETIME DEFAULT NULL,
  `lastRunStatus` VARCHAR(20) DEFAULT NULL,
  `lastFailureReason` TEXT DEFAULT NULL,
  `createdBy` VARCHAR(36) DEFAULT NULL,
  `organizationId` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sj_org` (`organizationId`),
  INDEX `idx_sj_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. jobExecutionLogs
CREATE TABLE IF NOT EXISTS `jobExecutionLogs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `jobId` VARCHAR(36) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'running',
  `startTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `endTime` DATETIME DEFAULT NULL,
  `errorMessage` TEXT DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_jel_job` (`jobId`),
  INDEX `idx_jel_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. contractTemplates
CREATE TABLE IF NOT EXISTS `contractTemplates` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `createdBy` VARCHAR(255) DEFAULT 'System',
  `organizationId` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ct_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. proposalTemplates
CREATE TABLE IF NOT EXISTS `proposalTemplates` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `createdBy` VARCHAR(255) DEFAULT 'System',
  `organizationId` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pt_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. websiteContacts
CREATE TABLE IF NOT EXISTS `websiteContacts` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `company` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(20) DEFAULT 'new',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wc_status` (`status`),
  INDEX `idx_wc_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. purchase_orders
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `orderNumber` VARCHAR(50) DEFAULT NULL,
  `supplierId` VARCHAR(36) DEFAULT NULL,
  `supplierName` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `items` JSON DEFAULT NULL,
  `totalAmount` DECIMAL(15,2) DEFAULT 0,
  `deliveryAddress` TEXT DEFAULT NULL,
  `expectedDelivery` DATE DEFAULT NULL,
  `paymentTerms` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(30) DEFAULT 'draft',
  `approvedBy` VARCHAR(36) DEFAULT NULL,
  `approvedAt` DATETIME DEFAULT NULL,
  `createdBy` VARCHAR(36) DEFAULT NULL,
  `organizationId` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_po_org` (`organizationId`),
  INDEX `idx_po_status` (`status`),
  INDEX `idx_po_supplier` (`supplierId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. procurement_requests
CREATE TABLE IF NOT EXISTS `procurement_requests` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(50) DEFAULT 'supplies',
  `quantity` INT DEFAULT 1,
  `price` DECIMAL(15,2) DEFAULT 0,
  `status` VARCHAR(30) DEFAULT 'pending',
  `requiredDate` DATE DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `createdBy` VARCHAR(36) DEFAULT NULL,
  `organizationId` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pr_org` (`organizationId`),
  INDEX `idx_pr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. hr_automation_rules
CREATE TABLE IF NOT EXISTS `hr_automation_rules` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `schedule` VARCHAR(100) DEFAULT NULL,
  `config` JSON DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `last_run_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_har_active` (`is_active`),
  INDEX `idx_har_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. hr_automation_logs
CREATE TABLE IF NOT EXISTS `hr_automation_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `rule_id` VARCHAR(36) DEFAULT NULL,
  `action` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'success',
  `details` TEXT DEFAULT NULL,
  `executed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_hal_rule` (`rule_id`),
  INDEX `idx_hal_executed` (`executed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. activity_logs (code uses snake_case, DB has camelCase activityLog)
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(36) DEFAULT NULL,
  `action` VARCHAR(255) DEFAULT NULL,
  `entityType` VARCHAR(100) DEFAULT NULL,
  `entityId` VARCHAR(36) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_al_user` (`userId`),
  INDEX `idx_al_entity` (`entityType`, `entityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Views for snake_case aliases of existing camelCase tables
-- employee_contracts → alias for employeeContracts
-- Actual columns: id, employeeId, contractType, startDate, endDate, salary, renewalDate, noticePeriod, status, documentUrl, signedByEmployee, signedByEmployer, createdBy, organizationId, createdAt, updatedAt
CREATE OR REPLACE VIEW `employee_contracts` AS SELECT
  `id`,
  `employeeId` AS `employee_id`,
  `contractType` AS `contract_type`,
  `startDate` AS `start_date`,
  `endDate` AS `end_date`,
  `salary`,
  `renewalDate` AS `renewal_date`,
  `noticePeriod` AS `notice_period`,
  `status`,
  `documentUrl` AS `document_url`,
  `signedByEmployee` AS `signed_by_employee`,
  `signedByEmployer` AS `signed_by_employer`,
  `createdBy` AS `created_by`,
  `organizationId` AS `organization_id`,
  `createdAt` AS `created_at`,
  `updatedAt` AS `updated_at`
FROM `employeeContracts`;

-- leave_balances → alias for leaveBalances
-- Actual columns: id, employeeId, leaveType, year, entitlement, used, pending, carriedOver, remaining, organizationId, createdAt, updatedAt
CREATE OR REPLACE VIEW `leave_balances` AS SELECT
  `id`,
  `employeeId` AS `employee_id`,
  `leaveType` AS `leave_type`,
  `year`,
  `entitlement` AS `total_days`,
  `used` AS `used_days`,
  `pending`,
  `carriedOver` AS `carried_over`,
  `remaining`,
  `organizationId` AS `organization_id`,
  `createdAt` AS `created_at`,
  `updatedAt` AS `updated_at`
FROM `leaveBalances`;

SELECT 'ALL_TABLES_CREATED' AS result;
