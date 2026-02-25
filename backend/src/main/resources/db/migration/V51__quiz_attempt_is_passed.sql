-- V51: Add is_passed column to quiz_attempts for persisting domain-computed pass/fail
-- Previously, isPassed was hardcoded as score >= 60 in the repository adapter,
-- ignoring the quiz's actual passingScore setting.

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS is_passed BOOLEAN;

-- Backfill existing graded attempts using the default 60% threshold.
-- New attempts will have the correct domain-computed value persisted.
UPDATE quiz_attempts
SET is_passed = (score >= 60)
WHERE score IS NOT NULL AND is_passed IS NULL;
