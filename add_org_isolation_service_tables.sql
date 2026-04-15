-- Add organizationId to serviceInvoices and serviceTemplates for multitenancy data isolation
ALTER TABLE serviceInvoices ADD COLUMN organizationId VARCHAR(64) NULL AFTER id;
ALTER TABLE serviceTemplates ADD COLUMN organizationId VARCHAR(64) NULL AFTER id;

-- Add indexes for performance
CREATE INDEX idx_si_org ON serviceInvoices(organizationId);
CREATE INDEX idx_st_org ON serviceTemplates(organizationId);
