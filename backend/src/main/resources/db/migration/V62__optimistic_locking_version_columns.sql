-- V62: Add version columns for optimistic locking on enrollments and assignment_submissions

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
