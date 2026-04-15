-- Add archiving columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS isArchived TINYINT NOT NULL DEFAULT 0 AFTER isActive;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archivedAt TIMESTAMP NULL AFTER isArchived;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archivedBy VARCHAR(64) NULL AFTER archivedAt;
CREATE INDEX IF NOT EXISTS idx_org_archived ON organizations (isArchived);
