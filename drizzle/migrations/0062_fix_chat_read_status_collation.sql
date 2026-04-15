-- Fix collation mismatch: convert chat_read_status to utf8mb4_unicode_ci to match staffChatMessages
ALTER TABLE chat_read_status CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
