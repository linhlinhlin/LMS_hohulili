ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS rubric_data JSONB;
