-- Add lineItems column to expenses (idempotent - duplicate column error is tolerated)
ALTER TABLE `expenses` ADD COLUMN `lineItems` LONGTEXT NULL;
