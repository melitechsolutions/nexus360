-- Add organizationId columns to tables missing org isolation
-- Run this migration against the melitech_crm database

ALTER TABLE `grnRecords` ADD COLUMN `organizationId` varchar(64) DEFAULT NULL;
ALTER TABLE `grnRecords` ADD INDEX `idx_grn_org` (`organizationId`);

ALTER TABLE `serviceInvoices` ADD COLUMN `organizationId` varchar(64) DEFAULT NULL;
ALTER TABLE `serviceInvoices` ADD INDEX `idx_si_org` (`organizationId`);

ALTER TABLE `serviceTemplates` ADD COLUMN `organizationId` varchar(64) DEFAULT NULL;
ALTER TABLE `serviceTemplates` ADD INDEX `idx_st_org` (`organizationId`);
