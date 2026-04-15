-- Change receiptUrl from VARCHAR(500) to LONGTEXT to support base64 data URLs
ALTER TABLE `expenses` MODIFY COLUMN `receiptUrl` LONGTEXT;
