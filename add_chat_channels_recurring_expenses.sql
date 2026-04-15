-- Staff Chat Channels table
CREATE TABLE IF NOT EXISTS staffChatChannels (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'team',
  description VARCHAR(255),
  members JSON DEFAULT ('[]'),
  createdBy VARCHAR(64) NOT NULL,
  isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scc_type (type),
  INDEX idx_scc_created_by (createdBy)
);

-- Add new columns to staffChatMessages
ALTER TABLE staffChatMessages
  ADD COLUMN channelId VARCHAR(64) DEFAULT 'general' AFTER id,
  ADD COLUMN fileUrl VARCHAR(500) NULL AFTER replyToUser,
  ADD COLUMN fileName VARCHAR(255) NULL AFTER fileUrl,
  ADD COLUMN fileType VARCHAR(50) NULL AFTER fileName,
  ADD INDEX idx_scm_channel_id (channelId);

-- Recurring Expenses table
CREATE TABLE IF NOT EXISTS recurringExpenses (
  id VARCHAR(64) PRIMARY KEY,
  organizationId VARCHAR(64),
  category VARCHAR(100) NOT NULL,
  vendor VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  paymentMethod VARCHAR(50),
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  startDate DATE NOT NULL,
  endDate DATE,
  nextDueDate DATE,
  dayOfMonth INT DEFAULT 1,
  reminderDaysBefore INT DEFAULT 3,
  lastGeneratedDate DATE,
  isActive TINYINT NOT NULL DEFAULT 1,
  chartOfAccountId VARCHAR(64),
  createdBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX re_org_idx (organizationId),
  INDEX re_next_due_idx (nextDueDate),
  INDEX re_active_idx (isActive)
);
