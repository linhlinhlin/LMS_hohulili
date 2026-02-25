-- V52: Quiz availability window (Canvas/Moodle SOTA pattern)
-- available_from: quiz not attemptable before this time
-- due_at: soft deadline shown to students
-- lock_at: hard deadline, no new attempts after this time

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS lock_at TIMESTAMPTZ;
