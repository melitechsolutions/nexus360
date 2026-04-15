-- Migration: Add extended organization details columns
-- These columns allow capturing maximum details during org creation

ALTER TABLE organizations
  ADD COLUMN industry VARCHAR(100) DEFAULT NULL AFTER country,
  ADD COLUMN website VARCHAR(255) DEFAULT NULL AFTER industry,
  ADD COLUMN taxId VARCHAR(100) DEFAULT NULL AFTER website,
  ADD COLUMN billingEmail VARCHAR(320) DEFAULT NULL AFTER taxId,
  ADD COLUMN timezone VARCHAR(100) DEFAULT 'Africa/Nairobi' AFTER billingEmail,
  ADD COLUMN currency VARCHAR(10) DEFAULT 'KES' AFTER timezone,
  ADD COLUMN description TEXT DEFAULT NULL AFTER currency,
  ADD COLUMN employeeCount INT DEFAULT NULL AFTER description,
  ADD COLUMN registrationNumber VARCHAR(100) DEFAULT NULL AFTER employeeCount,
  ADD COLUMN paymentMethod VARCHAR(50) DEFAULT NULL AFTER registrationNumber;

-- Add index on industry for filtering
ALTER TABLE organizations ADD INDEX idx_org_industry (industry);
