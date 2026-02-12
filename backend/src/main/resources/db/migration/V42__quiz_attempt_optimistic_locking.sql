-- V42: Add optimistic locking version column to quiz_attempts
-- Prevents concurrent submit race condition (double-grading)
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
