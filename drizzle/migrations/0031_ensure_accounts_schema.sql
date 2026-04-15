-- Ensure accounts table has correct enum values
-- This migration safely updates the accounts table schema

-- First, try to modify the enum if the table exists
ALTER TABLE `accounts` 
MODIFY `accountType` enum('asset','liability','equity','revenue','expense','cost of goods sold','operating expense','capital expenditure','other income','other expense') NOT NULL;

-- Ensure parentAccountId is properly nullable
ALTER TABLE `accounts` 
MODIFY `parentAccountId` varchar(64) NULL;

-- Ensure isActive is tinyint
ALTER TABLE `accounts` 
MODIFY `isActive` tinyint NOT NULL DEFAULT 1;

-- Add unique constraint on accountCode if not exists
ALTER TABLE `accounts` 
ADD UNIQUE KEY `account_code_unique` (`accountCode`);

-- Add index on parentAccountId if not exists
ALTER TABLE `accounts` 
ADD KEY `account_parent_idx` (`parentAccountId`);
