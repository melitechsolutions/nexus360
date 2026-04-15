CREATE TABLE IF NOT EXISTS backup_history (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  backupType VARCHAR(50) NOT NULL DEFAULT 'full',
  scope VARCHAR(50) NOT NULL DEFAULT 'full',
  scopeEntityId VARCHAR(64),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  `tables` TEXT,
  recordCount INT DEFAULT 0,
  sizeBytes INT DEFAULT 0,
  fileName VARCHAR(500),
  errorMessage TEXT,
  completedAt TIMESTAMP NULL,
  createdBy VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bh_status (status),
  INDEX idx_bh_scope (scope),
  INDEX idx_bh_created (createdAt)
);
