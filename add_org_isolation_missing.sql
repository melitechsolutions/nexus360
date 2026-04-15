-- Migration: Add organizationId to tables missing multi-tenancy isolation
-- Date: 2026-04-09
-- Tables: creditNotes, warranties, lpos

-- 1. creditNotes
ALTER TABLE creditNotes ADD COLUMN organizationId VARCHAR(64) NULL AFTER id;
ALTER TABLE creditNotes ADD INDEX idx_creditNotes_orgId (organizationId);

-- 2. warranties
ALTER TABLE warranties ADD COLUMN organizationId VARCHAR(64) NULL AFTER id;
ALTER TABLE warranties ADD INDEX idx_warranties_orgId (organizationId);

-- 3. lpos
ALTER TABLE lpos ADD COLUMN organizationId VARCHAR(64) NULL AFTER id;
ALTER TABLE lpos ADD INDEX idx_lpos_orgId (organizationId);

-- Backfill: set organizationId from the creator's user record
UPDATE creditNotes cn
  JOIN users u ON cn.createdBy = u.id
  SET cn.organizationId = u.organizationId
  WHERE cn.organizationId IS NULL AND u.organizationId IS NOT NULL;

UPDATE warranties w
  JOIN users u ON w.createdBy = u.id
  SET w.organizationId = u.organizationId
  WHERE w.organizationId IS NULL AND u.organizationId IS NOT NULL;

UPDATE lpos l
  JOIN users u ON l.createdBy = u.id
  SET l.organizationId = u.organizationId
  WHERE l.organizationId IS NULL AND u.organizationId IS NOT NULL;
