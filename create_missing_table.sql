CREATE TABLE IF NOT EXISTS userTablePreferences (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  organizationId VARCHAR(64),
  tableName VARCHAR(100) NOT NULL,
  visibleColumns TEXT,
  columnOrder TEXT,
  pageSize INT DEFAULT 25,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX utp_user_table_idx (userId, tableName),
  INDEX utp_org_idx (organizationId)
);
