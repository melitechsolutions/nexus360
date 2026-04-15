-- Chat read tracking: stores the last-read message ID per user per channel
CREATE TABLE IF NOT EXISTS chat_read_status (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  channel_id VARCHAR(100) NOT NULL DEFAULT 'general',
  last_read_message_id VARCHAR(100) DEFAULT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_channel (user_id, channel_id)
);
