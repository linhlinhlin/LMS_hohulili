-- V115: Structured rejection category for course review events
-- Adds taxonomy to complement the free-text comment, enabling:
--   - Consistent categorization for dashboards & analytics
--   - Targeted email templates per category (future)
--   - Teacher understanding of what class of problem to fix
-- Backward compatible: column is nullable so legacy rejections remain valid.

ALTER TABLE course_review_events
    ADD COLUMN IF NOT EXISTS rejection_category VARCHAR(50);

-- Optional index if we expose filters in admin analytics later
CREATE INDEX IF NOT EXISTS idx_course_review_events_category
    ON course_review_events(rejection_category)
    WHERE rejection_category IS NOT NULL;
