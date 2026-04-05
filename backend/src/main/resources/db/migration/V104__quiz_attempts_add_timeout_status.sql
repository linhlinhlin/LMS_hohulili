-- Add TIMEOUT to quiz_attempts status check constraint
-- Domain model uses TIMEOUT for server-detected time limit violations

ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_status_check;

ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_status_check
    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED', 'TIMEOUT'));
