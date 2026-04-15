-- Migration: Add Pricing Plans & Billing System Tables
-- Enables SaaS pricing models, subscriptions, and billing cycle management

-- =====================================================================
-- PRICING PLANS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `pricingPlans` (
  `id` VARCHAR(64) PRIMARY KEY,
  `planName` VARCHAR(255) NOT NULL,
  `planSlug` VARCHAR(100) NOT NULL UNIQUE,
  `description` LONGTEXT,
  `tier` ENUM('free', 'starter', 'professional', 'enterprise', 'custom') NOT NULL,
  `monthlyPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `annualPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `monthlyAnnualDiscount` DECIMAL(5, 2) NOT NULL DEFAULT 0,
  `maxUsers` INT DEFAULT -1 COMMENT '-1 means unlimited',
  `maxProjects` INT DEFAULT -1,
  `maxStorageGB` INT DEFAULT -1,
  `features` JSON COMMENT 'Array of feature flags',
  `supportLevel` ENUM('email', 'priority', '24/7_phone', 'dedicated_manager') DEFAULT 'email',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `displayOrder` INT DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tier` (`tier`),
  INDEX `idx_slug` (`planSlug`),
  INDEX `idx_active` (`isActive`)
);

-- =====================================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clientId` VARCHAR(64) NOT NULL,
  `planId` VARCHAR(64) NOT NULL,
  `status` ENUM('trial', 'active', 'suspended', 'cancelled', 'expired') NOT NULL DEFAULT 'trial',
  `billingCycle` ENUM('monthly', 'annual') NOT NULL DEFAULT 'monthly',
  `startDate` TIMESTAMP NOT NULL,
  `renewalDate` TIMESTAMP NOT NULL,
  `expiryDate` TIMESTAMP,
  `gracePeriodEnd` TIMESTAMP COMMENT '3 days after renewal date',
  `isLocked` TINYINT(1) DEFAULT 0 COMMENT 'System locked for unpaid past grace period',
  `autoRenew` TINYINT(1) DEFAULT 1,
  `currentPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `usersCount` INT DEFAULT 0,
  `projectsCount` INT DEFAULT 0,
  `storageUsedGB` INT DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`planId`) REFERENCES `pricingPlans` (`id`),
  INDEX `idx_client_id` (`clientId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_renewal_date` (`renewalDate`),
  INDEX `idx_expiry_date` (`expiryDate`)
);

-- =====================================================================
-- BILLING INVOICES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `billingInvoices` (
  `id` VARCHAR(64) PRIMARY KEY,
  `subscriptionId` VARCHAR(64) NOT NULL,
  `invoiceNumber` VARCHAR(50) NOT NULL UNIQUE,
  `amount` DECIMAL(10, 2) NOT NULL,
  `tax` DECIMAL(10, 2) DEFAULT 0,
  `totalAmount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(3) DEFAULT 'USD',
  `status` ENUM('pending', 'sent', 'viewed', 'paid', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  `billingPeriodStart` TIMESTAMP NOT NULL,
  `billingPeriodEnd` TIMESTAMP NOT NULL,
  `dueDate` TIMESTAMP NOT NULL,
  `sentAt` TIMESTAMP,
  `paidAt` TIMESTAMP,
  `paymentMethod` VARCHAR(50),
  `paymentReference` VARCHAR(255),
  `notes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions` (`id`),
  INDEX `idx_subscription_id` (`subscriptionId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_due_date` (`dueDate`),
  INDEX `idx_paid_at` (`paidAt`)
);

-- =====================================================================
-- PAYMENTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(64) PRIMARY KEY,
  `invoiceId` VARCHAR(64),
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(3) DEFAULT 'USD',
  `paymentMethod` ENUM('credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'mpesa', 'other') NOT NULL,
  `provider` VARCHAR(50) COMMENT 'Stripe, PayPal, Pesapal, etc.',
  `transactionId` VARCHAR(255) UNIQUE,
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `paymentDate` TIMESTAMP,
  `refundedAmount` DECIMAL(10, 2) DEFAULT 0,
  `refundDate` TIMESTAMP,
  `refundReason` TEXT,
  `metadata` JSON,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`invoiceId`) REFERENCES `billingInvoices` (`id`),
  INDEX `idx_invoice_id` (`invoiceId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_transaction_id` (`transactionId`),
  INDEX `idx_payment_date` (`paymentDate`)
);

-- =====================================================================
-- PAYMENT METHODS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `paymentMethods` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clientId` VARCHAR(64) NOT NULL,
  `type` ENUM('credit_card', 'debit_card', 'bank_account', 'paypal', 'mpesa') NOT NULL,
  `provider` VARCHAR(50),
  `lastFourDigits` VARCHAR(4),
  `expiryMonth` INT,
  `expiryYear` INT,
  `holderName` VARCHAR(255),
  `bankName` VARCHAR(255),
  `accountNumber` VARCHAR(50) COMMENT 'Encrypted',
  `isDefault` TINYINT(1) DEFAULT 0,
  `isActive` TINYINT(1) DEFAULT 1,
  `providerMethodId` VARCHAR(255) COMMENT 'Token from Stripe/PayPal/etc',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_client_id` (`clientId`),
  INDEX `idx_is_default` (`isDefault`),
  INDEX `idx_type` (`type`)
);

-- =====================================================================
-- BILLING USAGE METRICS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS `billingUsageMetrics` (
  `id` VARCHAR(64) PRIMARY KEY,
  `subscriptionId` VARCHAR(64) NOT NULL,
  `metricDate` DATE NOT NULL,
  `usersCount` INT DEFAULT 0,
  `projectsCount` INT DEFAULT 0,
  `tasksCount` INT DEFAULT 0,
  `documentsCount` INT DEFAULT 0,
  `storageUsedMB` INT DEFAULT 0,
  `apiCallsCount` INT DEFAULT 0,
  `emailsSent` INT DEFAULT 0,
  `recordedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions` (`id`),
  INDEX `idx_subscription_id` (`subscriptionId`),
  INDEX `idx_metric_date` (`metricDate`)
);

-- =====================================================================
-- BILLING NOTIFICATIONS TABLE (for payment reminders, expiry warnings, etc)
-- =====================================================================
CREATE TABLE IF NOT EXISTS `billingNotifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `subscriptionId` VARCHAR(64) NOT NULL,
  `notificationType` ENUM(
    'payment_due_7days',
    'payment_due_today',
    'payment_overdue_1day',
    'payment_overdue_3days',
    'subscription_expiring_7days',
    'subscription_expiring_today',
    'subscription_expired',
    'system_locked',
    'payment_failed',
    'usage_limit_warning',
    'renewal_successful'
  ) NOT NULL,
  `message` TEXT,
  `sentTo` VARCHAR(320),
  `channel` ENUM('email', 'in_app', 'sms') DEFAULT 'email',
  `isSent` TINYINT(1) DEFAULT 0,
  `sentAt` TIMESTAMP,
  `isRead` TINYINT(1) DEFAULT 0,
  `readAt` TIMESTAMP,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions` (`id`),
  INDEX `idx_subscription_id` (`subscriptionId`),
  INDEX `idx_notification_type` (`notificationType`),
  INDEX `idx_is_sent` (`isSent`)
);
