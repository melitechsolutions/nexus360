-- Add accountManagerId column to suppliers table
ALTER TABLE `suppliers`
  ADD COLUMN IF NOT EXISTS `accountManagerId` VARCHAR(64) NULL DEFAULT NULL AFTER `isActive`;
