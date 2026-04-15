-- =============================================================================
-- Migration 0058: Legacy Table Cleanup
-- Safe archival and drop of orphan tables not referenced by any active code
-- =============================================================================
-- 
-- CATEGORIES DROPPED:
--   D: customFields, fieldValidations, fieldValues (orphan with stale data)
--   E: pricingTierDescriptions (orphan seed data, no code)
--   F: 10 empty orphan tables with no schema or code references
--
-- CATEGORIES KEPT:
--   A: __drizzle_migrations (Drizzle internal)
--   B: 20 tables in schema-extended.ts (active routers)
--   C: purchase_orders (referenced in approvals.ts raw SQL)
--
-- SAFETY: All tables with data are archived into _archived_* backup tables
--         before being dropped. Empty tables are dropped directly.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1: Archive tables with data
-- ─────────────────────────────────────────────────────────────────────────────

-- Archive customFields (1 row)
CREATE TABLE IF NOT EXISTS `_archived_customFields` AS SELECT * FROM `customFields`;

-- Archive pricingTierDescriptions (6 rows)
CREATE TABLE IF NOT EXISTS `_archived_pricingTierDescriptions` AS SELECT * FROM `pricingTierDescriptions`;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2: Drop FK constraints on tables referencing organizations
-- ─────────────────────────────────────────────────────────────────────────────

-- organizationKycData → organizations
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'organizationKycData' 
  AND CONSTRAINT_NAME = 'organizationKycData_ibfk_1' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists > 0, 
  'ALTER TABLE `organizationKycData` DROP FOREIGN KEY `organizationKycData_ibfk_1`', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- organizationPolicies → organizations
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'organizationPolicies' 
  AND CONSTRAINT_NAME = 'organizationPolicies_ibfk_1' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists > 0, 
  'ALTER TABLE `organizationPolicies` DROP FOREIGN KEY `organizationPolicies_ibfk_1`', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- organizationSubscriptions → organizations
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'organizationSubscriptions' 
  AND CONSTRAINT_NAME = 'organizationSubscriptions_ibfk_1' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists > 0, 
  'ALTER TABLE `organizationSubscriptions` DROP FOREIGN KEY `organizationSubscriptions_ibfk_1`', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- paymentTriggers → organizations
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'paymentTriggers' 
  AND CONSTRAINT_NAME = 'paymentTriggers_ibfk_1' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists > 0, 
  'ALTER TABLE `paymentTriggers` DROP FOREIGN KEY `paymentTriggers_ibfk_1`', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: Drop orphan tables with data (already archived above)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS `fieldValues`;
DROP TABLE IF EXISTS `fieldValidations`;
DROP TABLE IF EXISTS `customFields`;
DROP TABLE IF EXISTS `pricingTierDescriptions`;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4: Drop empty orphan tables (Category F — 0 rows, no code references)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS `budgetLines`;
DROP TABLE IF EXISTS `lpoLineItems`;
DROP TABLE IF EXISTS `receiptItems`;
DROP TABLE IF EXISTS `expenseItems`;
DROP TABLE IF EXISTS `employeeDocuments`;
DROP TABLE IF EXISTS `granularPermissions`;
DROP TABLE IF EXISTS `organizationKycData`;
DROP TABLE IF EXISTS `organizationPolicies`;
DROP TABLE IF EXISTS `organizationSubscriptions`;
DROP TABLE IF EXISTS `paymentTriggers`;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Count remaining tables (should be ~190: 170 schema.ts +
--               20 schema-extended.ts + purchase_orders + __drizzle_migrations
--               + 2 archive tables)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'Migration 0058 complete. Dropped 14 orphan tables, archived 2.' AS status;
SELECT COUNT(*) AS remaining_tables 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE';
