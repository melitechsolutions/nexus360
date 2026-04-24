-- Add deliverables column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS deliverables TEXT DEFAULT NULL AFTER taxRate;
