-- S71: Add partial indexes on quiz availability columns for efficient window queries
CREATE INDEX IF NOT EXISTS idx_quizzes_available_from ON quizzes(available_from) WHERE available_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_lock_at ON quizzes(lock_at) WHERE lock_at IS NOT NULL;
