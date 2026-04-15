-- =========================================================
-- Custom Roles, Permissions & Department Role Mapping
-- =========================================================

-- 1. Create customRoles table for org-specific roles with granular permissions
CREATE TABLE IF NOT EXISTS `customRoles` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organizationId` VARCHAR(64) NULL,
  `name` VARCHAR(100) NOT NULL,
  `displayName` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `permissions` JSON NULL COMMENT 'JSON array of permission feature strings e.g. ["clients:view","clients:create"]',
  `baseRole` ENUM('user','admin','staff','accountant','client','super_admin','project_manager','hr','ict_manager','procurement_manager','sales_manager') DEFAULT 'staff',
  `isAdvanced` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'If true, role has access to advanced permissions like approve, delete, reconcile',
  `isSystem` TINYINT(1) NOT NULL DEFAULT 0,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdBy` VARCHAR(64) NULL,
  `createdAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customRoles_orgId` (`organizationId`),
  INDEX `idx_customRoles_name` (`name`),
  INDEX `idx_customRoles_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add customRoleId to users table
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `customRoleId` VARCHAR(64) NULL AFTER `organizationId`;
ALTER TABLE `users` ADD INDEX IF NOT EXISTS `idx_users_customRoleId` (`customRoleId`);

-- 3. Add defaultRole to departments table
ALTER TABLE `departments` ADD COLUMN IF NOT EXISTS `defaultRole` VARCHAR(100) NULL COMMENT 'Default role enum value or custom role ID for new employees in this department' AFTER `status`;

-- 4. Create permissions table (was commented out in schema)
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NULL,
  `permissionName` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `category` VARCHAR(100) NULL,
  `resource` VARCHAR(100) NULL,
  `action` VARCHAR(50) NULL,
  `isAdvanced` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'If true, only shown when isAdvanced is enabled',
  `createdAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_permissions_category` (`category`),
  INDEX `idx_permissions_resource` (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
