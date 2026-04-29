-- Add missing total fields to receipts table for proper calculation of subtotal, tax, and discount
ALTER TABLE `receipts` 
ADD COLUMN `subtotal` int NOT NULL DEFAULT 0 AFTER `amount`,
ADD COLUMN `taxAmount` int NOT NULL DEFAULT 0 AFTER `subtotal`,
ADD COLUMN `discountAmount` int NOT NULL DEFAULT 0 AFTER `taxAmount`,
ADD COLUMN `status` enum('draft','issued','void') NOT NULL DEFAULT 'issued' AFTER `notes`;

-- Update existing receipts to use amount as total (for backwards compatibility)
UPDATE `receipts` SET `subtotal` = `amount` WHERE `subtotal` = 0;
