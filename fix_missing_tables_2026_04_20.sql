-- Fix missing tables causing DrizzleQueryErrors in production
-- Tables: workflows, employeeBenefits, systemHealth, projectTasks

CREATE TABLE IF NOT EXISTS `workflows` (
    `id` VARCHAR(64) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `status` ENUM('active','inactive','draft') DEFAULT 'draft' NOT NULL,
    `triggerType` ENUM('invoice_created','invoice_paid','invoice_overdue','payment_received','opportunity_moved','task_completed','project_milestone_reached','reminder_time') NOT NULL,
    `triggerCondition` TEXT,
    `actionTypes` TEXT NOT NULL,
    `isRecurring` TINYINT DEFAULT 0,
    `createdBy` VARCHAR(64) NOT NULL,
    `createdAt` TIMESTAMP NULL DEFAULT NULL,
    `updatedAt` TIMESTAMP NULL DEFAULT NULL,
    INDEX `status_idx` (`status`),
    INDEX `trigger_type_idx` (`triggerType`),
    INDEX `created_by_idx` (`createdBy`)
);

CREATE TABLE IF NOT EXISTS `employeeBenefits` (
    `id` VARCHAR(64) PRIMARY KEY,
    `employeeId` VARCHAR(64) NOT NULL,
    `benefitType` VARCHAR(100) NOT NULL,
    `provider` VARCHAR(255),
    `enrollDate` DATETIME NOT NULL,
    `endDate` DATETIME,
    `isActive` TINYINT(1) DEFAULT 1 NOT NULL,
    `coverage` TEXT,
    `cost` INT,
    `employerCost` INT,
    `notes` TEXT,
    `createdBy` VARCHAR(64),
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `employee_idx` (`employeeId`),
    INDEX `type_idx` (`benefitType`),
    INDEX `is_active_idx` (`isActive`)
);

CREATE TABLE IF NOT EXISTS `systemHealth` (
    `id` VARCHAR(64) PRIMARY KEY,
    `organizationId` VARCHAR(64),
    `cpuUsage` INT DEFAULT 0,
    `cpuModel` VARCHAR(255),
    `cpuCores` INT DEFAULT 1,
    `cpuSpeed` VARCHAR(50),
    `cpuTemperature` INT DEFAULT 0,
    `memoryUsage` INT DEFAULT 0,
    `memoryTotal` INT DEFAULT 0,
    `memoryAvailable` INT DEFAULT 0,
    `diskUsage` INT DEFAULT 0,
    `diskTotal` INT DEFAULT 0,
    `diskUsagePercent` INT DEFAULT 0,
    `status` ENUM('healthy','warning','critical') DEFAULT 'healthy' NOT NULL,
    `systemPlatform` VARCHAR(100),
    `systemDistro` VARCHAR(100),
    `systemRelease` VARCHAR(50),
    `systemArch` VARCHAR(50),
    `systemManufacturer` VARCHAR(255),
    `systemUptime` INT DEFAULT 0,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sh_org` (`organizationId`),
    INDEX `idx_sh_status` (`status`),
    INDEX `idx_sh_created_at` (`createdAt`)
);

CREATE TABLE IF NOT EXISTS `projectTasks` (
    `id` VARCHAR(64) PRIMARY KEY,
    `projectId` VARCHAR(64),
    `clientId` VARCHAR(64),
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `status` ENUM('todo','in_progress','review','completed','blocked') DEFAULT 'todo' NOT NULL,
    `priority` ENUM('low','medium','high','urgent') DEFAULT 'medium' NOT NULL,
    `assignedTo` VARCHAR(64),
    `dueDate` DATETIME,
    `completedDate` DATETIME,
    `estimatedHours` INT,
    `actualHours` INT,
    `approvalStatus` ENUM('pending','approved','rejected','revision_requested') DEFAULT 'pending' NOT NULL,
    `adminRemarks` LONGTEXT,
    `approvedBy` VARCHAR(64),
    `approvedAt` TIMESTAMP NULL DEFAULT NULL,
    `rejectionReason` LONGTEXT,
    `parentTaskId` VARCHAR(64),
    `order` INT DEFAULT 0,
    `tags` TEXT,
    `targetDate` DATETIME,
    `billable` TINYINT DEFAULT 1,
    `visibleToClient` TINYINT DEFAULT 1,
    `createdBy` VARCHAR(64),
    `createdAt` TIMESTAMP NULL DEFAULT NULL,
    `updatedAt` TIMESTAMP NULL DEFAULT NULL,
    INDEX `project_idx` (`projectId`),
    INDEX `status_idx` (`status`),
    INDEX `assigned_to_idx` (`assignedTo`),
    INDEX `approval_status_idx` (`approvalStatus`),
    INDEX `approved_by_idx` (`approvedBy`)
);

-- Also create related HR tables that may be missing from schema-extended
CREATE TABLE IF NOT EXISTS `salaryStructures` (
    `id` VARCHAR(64) PRIMARY KEY,
    `employeeId` VARCHAR(64) NOT NULL,
    `effectiveDate` DATETIME NOT NULL,
    `basicSalary` INT NOT NULL,
    `allowances` INT DEFAULT 0,
    `deductions` INT DEFAULT 0,
    `taxRate` INT DEFAULT 0,
    `notes` TEXT,
    `approvedBy` VARCHAR(64),
    `approvedAt` DATETIME,
    `createdBy` VARCHAR(64),
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `employee_idx` (`employeeId`),
    INDEX `effective_date_idx` (`effectiveDate`)
);

CREATE TABLE IF NOT EXISTS `salaryAllowances` (
    `id` VARCHAR(64) PRIMARY KEY,
    `employeeId` VARCHAR(64) NOT NULL,
    `allowanceType` VARCHAR(100) NOT NULL,
    `amount` INT NOT NULL,
    `frequency` ENUM('monthly','quarterly','annual','one_time') NOT NULL,
    `effectiveDate` DATETIME NOT NULL,
    `endDate` DATETIME,
    `isActive` TINYINT(1) DEFAULT 1 NOT NULL,
    `notes` TEXT,
    `createdBy` VARCHAR(64),
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `employee_idx` (`employeeId`),
    INDEX `type_idx` (`allowanceType`),
    INDEX `is_active_idx` (`isActive`)
);

CREATE TABLE IF NOT EXISTS `salaryDeductions` (
    `id` VARCHAR(64) PRIMARY KEY,
    `employeeId` VARCHAR(64) NOT NULL,
    `deductionType` VARCHAR(100) NOT NULL,
    `amount` INT NOT NULL,
    `frequency` ENUM('monthly','quarterly','annual','one_time') NOT NULL,
    `effectiveDate` DATETIME NOT NULL,
    `endDate` DATETIME,
    `isActive` TINYINT(1) DEFAULT 1 NOT NULL,
    `reference` VARCHAR(100),
    `notes` TEXT,
    `createdBy` VARCHAR(64),
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `employee_idx` (`employeeId`),
    INDEX `type_idx` (`deductionType`),
    INDEX `is_active_idx` (`isActive`)
);

CREATE TABLE IF NOT EXISTS `payrollDetails` (
    `id` VARCHAR(64) PRIMARY KEY,
    `payrollId` VARCHAR(64) NOT NULL,
    `componentType` VARCHAR(100) NOT NULL,
    `component` VARCHAR(255) NOT NULL,
    `amount` INT NOT NULL,
    `notes` TEXT,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `payroll_idx` (`payrollId`),
    INDEX `component_idx` (`componentType`)
);

CREATE TABLE IF NOT EXISTS `payrollApprovals` (
    `id` VARCHAR(64) PRIMARY KEY,
    `payrollId` VARCHAR(64) NOT NULL,
    `approverRole` VARCHAR(50) NOT NULL,
    `approverId` VARCHAR(64) NOT NULL,
    `status` ENUM('pending','approved','rejected') DEFAULT 'pending' NOT NULL,
    `rejectionReason` TEXT,
    `approvalDate` DATETIME,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `payroll_idx` (`payrollId`),
    INDEX `approver_idx` (`approverId`),
    INDEX `status_idx` (`status`)
);

CREATE TABLE IF NOT EXISTS `employeeTaxInfo` (
    `id` VARCHAR(64) PRIMARY KEY,
    `employeeId` VARCHAR(64) NOT NULL,
    `taxNumber` VARCHAR(50) NOT NULL,
    `taxBracket` VARCHAR(50),
    `exemptions` INT DEFAULT 0,
    `effectiveDate` DATETIME NOT NULL,
    `endDate` DATETIME,
    `notes` TEXT,
    `createdBy` VARCHAR(64),
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `employee_idx` (`employeeId`),
    INDEX `tax_number_idx` (`taxNumber`)
);

CREATE TABLE IF NOT EXISTS `salaryIncrements` (
    `id` VARCHAR(64) PRIMARY KEY,
    `employeeId` VARCHAR(64) NOT NULL,
    `previousSalary` INT NOT NULL,
    `newSalary` INT NOT NULL,
    `incrementPercent` INT DEFAULT 0,
    `reason` VARCHAR(255),
    `effectiveDate` DATETIME NOT NULL,
    `approvedBy` VARCHAR(64),
    `approvalDate` DATETIME,
    `notes` TEXT,
    `createdBy` VARCHAR(64),
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `employee_idx` (`employeeId`),
    INDEX `effective_date_idx` (`effectiveDate`)
);
