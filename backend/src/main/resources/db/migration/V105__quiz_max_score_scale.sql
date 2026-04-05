-- V105: Add configurable max score scale per quiz (Moodle "Maximum grade" pattern)
-- Default 10.0 = Vietnamese standard thang điểm 10
-- Teachers can configure: 10, 20, 100, or any custom value
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS max_score_scale DOUBLE PRECISION DEFAULT 10.0;

-- Backfill: existing quizzes get default thang điểm 10
UPDATE quizzes SET max_score_scale = 10.0 WHERE max_score_scale IS NULL;
