-- Add organizationId column to emailTemplates, proposalTemplates, contractTemplates, scheduledJobs
-- This enables proper multi-tenant isolation for these tables

ALTER TABLE emailTemplates 
  ADD COLUMN organizationId VARCHAR(64) NULL AFTER createdBy,
  ADD INDEX idx_emailTemplates_orgId (organizationId);

ALTER TABLE proposalTemplates 
  ADD COLUMN organizationId VARCHAR(64) NULL AFTER createdBy,
  ADD INDEX idx_proposalTemplates_orgId (organizationId);

ALTER TABLE contractTemplates 
  ADD COLUMN organizationId VARCHAR(64) NULL AFTER createdBy,
  ADD INDEX idx_contractTemplates_orgId (organizationId);

ALTER TABLE scheduledJobs 
  ADD COLUMN organizationId VARCHAR(64) NULL AFTER createdBy,
  ADD INDEX idx_scheduledJobs_orgId (organizationId);
